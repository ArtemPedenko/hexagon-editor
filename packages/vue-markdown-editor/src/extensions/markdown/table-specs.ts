import type {NodeSpec} from 'prosemirror-model';
import type {ParseSpec} from 'prosemirror-markdown';
import type {MarkdownSerializer} from 'prosemirror-markdown';

import type {ExtensionAuto} from '../../core/extension-builder';

export enum TableNode {
    Table = 'table',
    Head = 'thead',
    Body = 'tbody',
    Row = 'tr',
    HeaderCell = 'th',
    DataCell = 'td',
}

export enum TableAttrs {
    CellAlign = 'cell-align',
    Line = 'data-line',
}

export enum TableCellAlign {
    Center = 'center',
    Left = 'left',
    Right = 'right',
}

export const tableNodeSpecs: Record<TableNode, NodeSpec> = {
    [TableNode.Table]: {content: 'thead tbody', group: 'block', isolating: true, parseDOM: [{tag: 'table'}], selectable: true, toDOM: () => ['table', 0]},
    [TableNode.Head]: {content: 'tr', group: 'block', isolating: true, parseDOM: [{tag: 'thead'}], toDOM: () => ['thead', 0]},
    [TableNode.Body]: {content: 'tr+', group: 'block', isolating: true, parseDOM: [{tag: 'tbody'}], toDOM: () => ['tbody', 0]},
    [TableNode.Row]: {attrs: {[TableAttrs.Line]: {default: null}}, content: '(th|td)+', group: 'block', isolating: true, parseDOM: [{tag: 'tr'}], toDOM: (node) => ['tr', node.attrs, 0]},
    [TableNode.HeaderCell]: cellSpec('th'),
    [TableNode.DataCell]: cellSpec('td'),
};

function cellSpec(tag: 'th' | 'td'): NodeSpec {
    return {
        attrs: {[TableAttrs.CellAlign]: {default: TableCellAlign.Left}},
        group: 'block',
        content: '(text | inline)*',
        isolating: true,
        parseDOM: [{
            getAttrs: (node) => ({
                [TableAttrs.CellAlign]: (node as HTMLElement).style.textAlign || TableCellAlign.Left,
            }),
            tag,
        }],
        toDOM: (node) => [tag, {...node.attrs, style: `text-align:${node.attrs[TableAttrs.CellAlign]}`}, 0],
    };
}

export const tableTokenSpecs: Record<TableNode, ParseSpec> = {
    [TableNode.Table]: {block: TableNode.Table},
    [TableNode.Head]: {block: TableNode.Head},
    [TableNode.Body]: {block: TableNode.Body},
    [TableNode.Row]: {
        block: TableNode.Row,
        getAttrs: (token) => ({[TableAttrs.Line]: token.attrGet(TableAttrs.Line)}),
    },
    [TableNode.HeaderCell]: {block: TableNode.HeaderCell, getAttrs: getCellAttrs},
    [TableNode.DataCell]: {block: TableNode.DataCell, getAttrs: getCellAttrs},
};

function getCellAttrs(token: {attrs: Array<[string, string]> | null}): Partial<Record<TableAttrs, string>> {
    const style = Object.fromEntries(token.attrs ?? []).style ?? '';
    const align = style.split(';').find((rule) => rule.startsWith('text-align:'))?.split(':')[1];
    return {[TableAttrs.CellAlign]: align ?? TableCellAlign.Left};
}

export const tableSerializerNodes: Record<TableNode, ConstructorParameters<typeof MarkdownSerializer>[0][string]> = {
    [TableNode.Table]: (state, node) => {
        state.ensureNewLine();
        state.renderContent(node);
        state.ensureNewLine();
        state.closeBlock(node);
    },
    [TableNode.Head]: (state, node) => {
        state.renderContent(node);
        const headerRow = node.firstChild;
        for (let index = 0; headerRow !== null && index < headerRow.childCount; index += 1) {
            const cell = headerRow.child(index);
            const align = cell.attrs[TableAttrs.CellAlign];
            state.write(align === TableCellAlign.Left ? '|:---' : align === TableCellAlign.Center ? '|:---:' : align === TableCellAlign.Right ? '|---:' : '|---');
        }
        state.write('|');
        state.ensureNewLine();
    },
    [TableNode.Body]: (state, node) => state.renderContent(node),
    [TableNode.Row]: (state, node) => {
        state.renderContent(node);
        state.write('|');
        state.ensureNewLine();
    },
    [TableNode.HeaderCell]: renderCell,
    [TableNode.DataCell]: renderCell,
};

function renderCell(state: Parameters<ConstructorParameters<typeof MarkdownSerializer>[0][string]>[0], node: Parameters<ConstructorParameters<typeof MarkdownSerializer>[0][string]>[1]): void {
    state.write('|');
    state.renderInline(node);
}

export const TableSpecs: ExtensionAuto = (builder) => {
    for (const node of Object.values(TableNode)) {
        builder
            .addNodeSpec(node, () => tableNodeSpecs[node])
            .addMarkdownTokenParserSpec(node, () => tableTokenSpecs[node])
            .addNodeSerializerSpec(node, () => tableSerializerNodes[node]);
    }
};
