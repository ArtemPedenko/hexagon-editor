import type { Node as ProseMirrorNode, NodeType } from 'prosemirror-model';
import { TextSelection } from 'prosemirror-state';
import type { Command, EditorState } from 'prosemirror-state';

import { TableAttrs, TableCellAlign, TableNode } from './table-specs';

function getNodeType(schema: EditorState['schema'], name: TableNode): NodeType {
  const nodeType = schema.nodes[name];
  if (nodeType === undefined) throw new Error(`Table extension requires a ${name} node`);
  return nodeType;
}

function createRow(cellType: NodeType, columns: number): ProseMirrorNode {
  return getNodeType(cellType.schema, TableNode.Row).create(
    null,
    Array.from({ length: columns }, () => cellType.create({ [TableAttrs.CellAlign]: TableCellAlign.Left })),
  );
}

export function createTable(schema: EditorState['schema'], rows = 3, columns = 3): ProseMirrorNode {
  if (rows < 2 || columns < 1) throw new Error('A table requires at least two rows and one column');
  const bodyType = getNodeType(schema, TableNode.Body);
  const dataCellType = getNodeType(schema, TableNode.DataCell);
  const headType = getNodeType(schema, TableNode.Head);
  const headerCellType = getNodeType(schema, TableNode.HeaderCell);
  const tableType = getNodeType(schema, TableNode.Table);
  const head = headType.create(null, createRow(headerCellType, columns));
  const body = bodyType.create(
    null,
    Array.from({ length: rows - 1 }, () => createRow(dataCellType, columns)),
  );
  return tableType.create(null, [head, body]);
}

export const insertTable =
  (rows = 3, columns = 3): Command =>
  (state, dispatch) => {
    if (dispatch !== undefined)
      dispatch(state.tr.replaceSelectionWith(createTable(state.schema, rows, columns)).scrollIntoView());
    return true;
  };

interface TableSelection {
  body: ProseMirrorNode;
  bodyPosition: number;
  cellIndex: number;
  cellPosition: number;
  inBody: boolean;
  row: ProseMirrorNode;
  rowPosition: number;
  table: ProseMirrorNode;
  tablePosition: number;
}

function getTableSelection(state: EditorState): TableSelection | undefined {
  const { $from } = state.selection;
  let tableDepth: number | undefined;
  let bodyDepth: number | undefined;
  let rowDepth: number | undefined;
  let cellDepth: number | undefined;
  for (let depth = 1; depth <= $from.depth; depth += 1) {
    switch ($from.node(depth).type.name) {
      case TableNode.Table:
        tableDepth = depth;
        break;
      case TableNode.Body:
        bodyDepth = depth;
        break;
      case TableNode.Row:
        rowDepth = depth;
        break;
      case TableNode.HeaderCell:
      case TableNode.DataCell:
        cellDepth = depth;
        break;
    }
  }
  if (tableDepth === undefined || rowDepth === undefined || cellDepth === undefined) return undefined;
  const table = $from.node(tableDepth);
  const tablePosition = $from.before(tableDepth);
  const row = $from.node(rowDepth);
  const rowPosition = $from.before(rowDepth);
  const bodyEntry = table.content.content.find((node) => node.type.name === TableNode.Body);
  if (bodyEntry === undefined) return undefined;
  let bodyOffset = 0;
  for (const child of table.content.content) {
    if (child === bodyEntry) break;
    bodyOffset += child.nodeSize;
  }
  return {
    body: bodyEntry,
    bodyPosition: tablePosition + 1 + bodyOffset,
    cellIndex: $from.index(cellDepth - 1),
    cellPosition: $from.before(cellDepth),
    inBody: bodyDepth !== undefined,
    row,
    rowPosition,
    table,
    tablePosition,
  };
}

function createDataRow(schema: EditorState['schema'], columns: number): ProseMirrorNode {
  return createRow(getNodeType(schema, TableNode.DataCell), columns);
}

export const addTableRow: Command = (state, dispatch) => {
  const selection = getTableSelection(state);
  if (selection === undefined) return false;
  const position = selection.inBody
    ? selection.rowPosition + selection.row.nodeSize
    : selection.bodyPosition + selection.body.nodeSize - 1;
  dispatch?.(
    state.tr.insert(position, createDataRow(state.schema, selection.body.firstChild?.childCount ?? 1)).scrollIntoView(),
  );
  return true;
};

export const deleteTableRow: Command = (state, dispatch) => {
  const selection = getTableSelection(state);
  if (selection === undefined || !selection.inBody) return false;
  if (selection.body.childCount === 1) {
    dispatch?.(
      state.tr.delete(selection.tablePosition, selection.tablePosition + selection.table.nodeSize).scrollIntoView(),
    );
  } else {
    dispatch?.(state.tr.delete(selection.rowPosition, selection.rowPosition + selection.row.nodeSize).scrollIntoView());
  }
  return true;
};

export const deleteTable: Command = (state, dispatch) => {
  const selection = getTableSelection(state);
  if (selection === undefined) return false;
  dispatch?.(
    state.tr.delete(selection.tablePosition, selection.tablePosition + selection.table.nodeSize).scrollIntoView(),
  );
  return true;
};

function tableRows(selection: TableSelection): Array<{ node: ProseMirrorNode; position: number }> {
  const rows: Array<{ node: ProseMirrorNode; position: number }> = [];
  selection.table.descendants((node, position) => {
    if (node.type.name === TableNode.Row) rows.push({ node, position: selection.tablePosition + 1 + position });
  });
  return rows;
}

export const addTableColumn: Command = (state, dispatch) => {
  const selection = getTableSelection(state);
  if (selection === undefined) return false;
  const transaction = state.tr;
  for (const row of tableRows(selection).reverse()) {
    const cellType = getNodeType(
      state.schema,
      row.node.firstChild?.type.name === TableNode.HeaderCell ? TableNode.HeaderCell : TableNode.DataCell,
    );
    transaction.insert(
      row.position + row.node.nodeSize - 1,
      cellType.create({ [TableAttrs.CellAlign]: TableCellAlign.Left }),
    );
  }
  dispatch?.(transaction.scrollIntoView());
  return true;
};

export const deleteTableColumn: Command = (state, dispatch) => {
  const selection = getTableSelection(state);
  if (selection === undefined) return false;
  if (selection.row.childCount === 1) {
    dispatch?.(
      state.tr.delete(selection.tablePosition, selection.tablePosition + selection.table.nodeSize).scrollIntoView(),
    );
    return true;
  }
  const transaction = state.tr;
  for (const row of tableRows(selection).reverse()) {
    let offset = 0;
    for (let index = 0; index < selection.cellIndex; index += 1) offset += row.node.child(index).nodeSize;
    const cell = row.node.child(selection.cellIndex);
    transaction.delete(row.position + 1 + offset, row.position + 1 + offset + cell.nodeSize);
  }
  dispatch?.(transaction.scrollIntoView());
  return true;
};

export const setTableColumnAlignment =
  (alignment: TableCellAlign): Command =>
  (state, dispatch) => {
    const selection = getTableSelection(state);
    if (selection === undefined) return false;
    const transaction = state.tr;
    for (const row of tableRows(selection).reverse()) {
      let offset = 0;
      for (let index = 0; index < selection.cellIndex; index += 1) offset += row.node.child(index).nodeSize;
      const cell = row.node.child(selection.cellIndex);
      transaction.setNodeMarkup(row.position + 1 + offset, undefined, {
        ...cell.attrs,
        [TableAttrs.CellAlign]: alignment,
      });
    }
    dispatch?.(transaction.scrollIntoView());
    return true;
  };

function tableCells(selection: TableSelection): Array<{ node: ProseMirrorNode; position: number }> {
  const cells: Array<{ node: ProseMirrorNode; position: number }> = [];
  selection.table.descendants((node, position) => {
    if (node.type.name === TableNode.HeaderCell || node.type.name === TableNode.DataCell) {
      cells.push({ node, position: selection.tablePosition + 1 + position });
    }
  });
  return cells;
}

export const goToTableCell =
  (direction: 'next' | 'prev'): Command =>
  (state, dispatch) => {
    const selection = getTableSelection(state);
    if (selection === undefined) return false;
    const cells = tableCells(selection);
    const currentIndex = cells.findIndex((cell) => cell.position === selection.cellPosition);
    const target = cells[currentIndex + (direction === 'next' ? 1 : -1)];
    if (target !== undefined) {
      dispatch?.(state.tr.setSelection(TextSelection.create(state.doc, target.position + 1)).scrollIntoView());
      return true;
    }
    if (direction === 'prev') return false;
    const insertPosition = selection.bodyPosition + selection.body.nodeSize - 1;
    const transaction = state.tr.insert(insertPosition, createDataRow(state.schema, selection.row.childCount));
    transaction.setSelection(TextSelection.create(transaction.doc, insertPosition + 2));
    dispatch?.(transaction.scrollIntoView());
    return true;
  };

export const moveToNextTableRow: Command = (state, dispatch) => {
  const selection = getTableSelection(state);
  if (selection === undefined) return false;
  const rows = tableRows(selection);
  const currentIndex = rows.findIndex((row) => row.position === selection.rowPosition);
  const next = rows[currentIndex + 1];
  if (next !== undefined) {
    let offset = 0;
    for (let index = 0; index < selection.cellIndex; index += 1) offset += next.node.child(index).nodeSize;
    dispatch?.(state.tr.setSelection(TextSelection.create(state.doc, next.position + 2 + offset)).scrollIntoView());
    return true;
  }
  const paragraphType = state.schema.nodes.paragraph;
  if (paragraphType === undefined) throw new Error('Table navigation requires a paragraph node');
  const paragraph = paragraphType.create();
  const position = selection.tablePosition + selection.table.nodeSize;
  const transaction = state.tr.insert(position, paragraph);
  transaction.setSelection(TextSelection.create(transaction.doc, position + 1));
  dispatch?.(transaction.scrollIntoView());
  return true;
};
