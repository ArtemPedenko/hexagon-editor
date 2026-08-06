import {EditorState, TextSelection} from 'prosemirror-state';
import {describe, expect, it} from 'vitest';

import {basicMarkdownCodec, basicMarkdownSchema, createBasicEditorCommands} from './basic-editor';

describe('basic Markdown extensions', () => {
    it('parses and serializes a GFM-style table', () => {
        const document = basicMarkdownCodec.parse('| Name | Value |\n| --- | --- |\n| Vue | 3 |');

        expect(document.firstChild?.type.name).toBe('table');
        expect(basicMarkdownCodec.serialize(document)).toContain('| Name | Value |');
    });

    it('toggles bold for the selected text', () => {
        const text = basicMarkdownSchema.text('Text');
        const document = basicMarkdownSchema.node('doc', null, [
            basicMarkdownSchema.node('paragraph', null, text),
        ]);
        const state = EditorState.create({
            doc: document,
            selection: TextSelection.create(document, 1, 5),
        });
        let nextState = state;

        const executed = createBasicEditorCommands().bold(state, (transaction) => {
            nextState = state.apply(transaction);
        });

        expect(executed).toBe(true);
        expect(nextState.doc.firstChild?.firstChild?.marks[0]?.type.name).toBe('strong');
    });

    it('inserts a table at the current selection', () => {
        const state = EditorState.create({schema: basicMarkdownSchema});
        let nextState = state;

        const executed = createBasicEditorCommands().insertTable(2, 2)(state, (transaction) => {
            nextState = state.apply(transaction);
        });

        expect(executed).toBe(true);
        expect(nextState.doc.firstChild?.type.name).toBe('table');
        expect(nextState.doc.firstChild?.childCount).toBe(2);
    });
});
