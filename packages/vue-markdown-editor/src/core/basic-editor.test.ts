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

    it.each([
        ['italic', 'em'],
        ['underline', 'underline'],
        ['strikethrough', 'strikethrough'],
        ['mark', 'mark'],
        ['code', 'code'],
    ] as const)('toggles the %s mark', (commandName, markName) => {
        const document = basicMarkdownSchema.node('doc', null, [
            basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('Text')),
        ]);
        const state = EditorState.create({
            doc: document,
            selection: TextSelection.create(document, 1, 5),
        });
        let nextState = state;

        createBasicEditorCommands()[commandName](state, (transaction) => {
            nextState = state.apply(transaction);
        });

        expect(nextState.doc.firstChild?.firstChild?.marks[0]?.type.name).toBe(markName);
    });

    it('adds a link to selected text', () => {
        const document = basicMarkdownSchema.node('doc', null, [
            basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('Link')),
        ]);
        const state = EditorState.create({doc: document, selection: TextSelection.create(document, 1, 5)});
        let nextState = state;

        createBasicEditorCommands().link('https://gravity-ui.com')(state, (transaction) => {
            nextState = state.apply(transaction);
        });

        expect(nextState.doc.firstChild?.firstChild?.marks[0]?.attrs.href).toBe('https://gravity-ui.com');
    });

    it.each([
        ['heading', (commands: ReturnType<typeof createBasicEditorCommands>) => commands.heading(2), 'heading'],
        ['quote', (commands: ReturnType<typeof createBasicEditorCommands>) => commands.quote, 'blockquote'],
        ['bullet list', (commands: ReturnType<typeof createBasicEditorCommands>) => commands.bulletList, 'bullet_list'],
        ['ordered list', (commands: ReturnType<typeof createBasicEditorCommands>) => commands.orderedList, 'ordered_list'],
        ['code block', (commands: ReturnType<typeof createBasicEditorCommands>) => commands.codeBlock, 'code_block'],
    ] as const)('applies %s block command', (_label, getCommand, nodeName) => {
        const state = EditorState.create({schema: basicMarkdownSchema});
        let nextState = state;
        const command = getCommand(createBasicEditorCommands());

        command(state, (transaction) => {
            nextState = state.apply(transaction);
        });

        expect(nextState.doc.firstChild?.type.name).toBe(nodeName);
    });

    it('inserts a horizontal rule', () => {
        const state = EditorState.create({schema: basicMarkdownSchema});
        let nextState = state;

        createBasicEditorCommands().horizontalRule(state, (transaction) => {
            nextState = state.apply(transaction);
        });

        expect(nextState.doc.firstChild?.type.name).toBe('horizontal_rule');
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
