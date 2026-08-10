import {describe, expect, it} from 'vitest';
import {EditorState, TextSelection} from 'prosemirror-state';

import {basicMarkdownSchema} from '../../core/basic-editor';
import {ExtensionsManager} from '../../core/extensions-manager';

import {addTableColumn, addTableRow, deleteTable, deleteTableColumn, deleteTableRow, goToTableCell, moveToNextTableRow, setTableColumnAlignment, Table, TableAttrs, TableCellAlign, TableNode} from './table';

describe('Table extension', () => {
    it('parses and serializes aligned Markdown tables', () => {
        const result = ExtensionsManager.process((builder) => builder.use(Table), {baseSchema: basicMarkdownSchema});
        const markdown = '|Left|Center|Right|\n|:---|:---:|---:|\n|one|two|three|';
        const parsed = result.textParser.parse(markdown);
        const table = parsed.firstChild;
        const cells = table?.firstChild?.firstChild?.content.content ?? [];

        expect(table?.type.name).toBe(TableNode.Table);
        expect(cells.map((cell) => cell.attrs[TableAttrs.CellAlign])).toEqual([
            TableCellAlign.Left,
            TableCellAlign.Center,
            TableCellAlign.Right,
        ]);
        expect(result.serializer.serialize(parsed)).toBe(`${markdown}\n`);
    });

    it('adds and removes rows and columns at the current cell', () => {
        const result = ExtensionsManager.process((builder) => builder.use(Table), {baseSchema: basicMarkdownSchema});
        const doc = result.textParser.parse('|Name|Value|\n|---|---|\n|Vue|3|');
        let textPosition = 0;
        doc.descendants((node, position) => {
            if (node.text === 'Vue') textPosition = position;
        });
        const state = EditorState.create({doc, selection: TextSelection.create(doc, textPosition), schema: result.schema});
        let next = state;
        for (const command of [addTableRow, addTableColumn, deleteTableRow, deleteTableColumn]) {
            expect(command(next, (transaction) => {
                next = next.apply(transaction);
            })).toBe(true);
        }

        const table = next.doc.firstChild;
        expect(table?.child(0).firstChild?.childCount).toBe(2);
        expect(table?.child(1).childCount).toBe(1);
    });

    it('navigates between cells and exits after the last row', () => {
        const result = ExtensionsManager.process((builder) => builder.use(Table), {baseSchema: basicMarkdownSchema});
        const doc = result.textParser.parse('|Name|Value|\n|---|---|\n|Vue|3|');
        let textPosition = 0;
        doc.descendants((node, position) => {
            if (node.text === 'Vue') textPosition = position;
        });
        let state = EditorState.create({doc, selection: TextSelection.create(doc, textPosition), schema: result.schema});

        expect(goToTableCell('next')(state, (transaction) => {
            state = state.apply(transaction);
        })).toBe(true);
        expect(state.selection.$from.parent.textContent).toBe('3');
        expect(moveToNextTableRow(state, (transaction) => {
            state = state.apply(transaction);
        })).toBe(true);
        expect(state.selection.$from.parent.type.name).toBe('paragraph');
    });

    it('sets alignment for every cell in the current column', () => {
        const result = ExtensionsManager.process((builder) => builder.use(Table), {baseSchema: basicMarkdownSchema});
        const doc = result.textParser.parse('|Name|Value|\n|---|---|\n|Vue|3|');
        let textPosition = 0;
        doc.descendants((node, position) => {
            if (node.text === 'Value') textPosition = position;
        });
        const state = EditorState.create({doc, selection: TextSelection.create(doc, textPosition), schema: result.schema});
        let next = state;

        expect(setTableColumnAlignment(TableCellAlign.Right)(state, (transaction) => {
            next = state.apply(transaction);
        })).toBe(true);
        const table = next.doc.firstChild;
        expect(table?.child(0).firstChild?.child(1).attrs[TableAttrs.CellAlign]).toBe(TableCellAlign.Right);
        expect(table?.child(1).firstChild?.child(1).attrs[TableAttrs.CellAlign]).toBe(TableCellAlign.Right);
    });

    it('deletes the enclosing table', () => {
        const result = ExtensionsManager.process((builder) => builder.use(Table), {baseSchema: basicMarkdownSchema});
        const doc = result.textParser.parse('|Name|\n|---|\n|Vue|');
        const state = EditorState.create({doc, selection: TextSelection.create(doc, 5), schema: result.schema});
        let next = state;

        expect(deleteTable(state, (transaction) => {
            next = state.apply(transaction);
        })).toBe(true);
        expect(next.doc.textContent).toBe('');
    });
});
