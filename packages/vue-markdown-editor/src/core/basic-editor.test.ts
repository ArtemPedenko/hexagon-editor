import {EditorState, TextSelection} from 'prosemirror-state';
import {describe, expect, it} from 'vitest';

import {
    basicMarkdownCodec,
    basicMarkdownSchema,
    createBasicEditorCommands,
    getBasicWysiwygSelectionState,
} from './basic-editor';

describe('basic Markdown extensions', () => {
    it('does not report marks as active for ordinary text', () => {
        const state = EditorState.create({schema: basicMarkdownSchema});

        expect(getBasicWysiwygSelectionState(state)).toMatchObject({
            bold: false,
            code: false,
            italic: false,
            mark: false,
            strikethrough: false,
            underline: false,
        });
    });

    it('parses and serializes a GFM-style table', () => {
        const document = basicMarkdownCodec.parse('| Name | Value |\n| --- | --- |\n| Vue | 3 |');

        expect(document.firstChild?.type.name).toBe('table');
        expect(basicMarkdownCodec.serialize(document)).toContain('| Name | Value |');
    });

    it('round-trips raw HTML blocks, directives, and heading attributes', () => {
        const source = '# Heading {#intro .lead}\n\n<div>HTML</div>\n\n::: html\n<div>Add HTML code here</div>\n:::';
        const document = basicMarkdownCodec.parse(source);
        const serialized = basicMarkdownCodec.serialize(document);

        expect(document.child(0).attrs.id).toBe('intro');
        expect(document.child(0).textContent).toBe('Heading');
        expect(document.child(1).type.name).toBe('raw_html');
        expect(document.child(2).type.name).toBe('directive');
        expect(document.child(2).textContent).toBe('');
        expect(serialized).toContain('# Heading {#intro .lead}');
        expect(serialized).toContain('<div>HTML</div>');
        expect(serialized).toContain('::: html\n<div>Add HTML code here</div>\n:::');

        const reparsed = basicMarkdownCodec.parse(serialized);
        expect(reparsed.child(0).attrs).toMatchObject({class: 'lead', id: 'intro'});
        expect(reparsed.child(1).type.name).toBe('raw_html');
        expect(reparsed.child(2).type.name).toBe('directive');
        expect(reparsed.child(2).attrs).toMatchObject({
            content: '<div>Add HTML code here</div>',
            name: 'html',
        });
    });

    it('round-trips definition lists, folding headings, and quote links', () => {
        const source = [
            '##+ Collapsible section',
            '',
            'Term',
            ': Definition',
            '',
            '> [Quoted source](https://example.com/source){data-quotelink=true}',
            '>',
            '> Quoted content',
        ].join('\n');
        const document = basicMarkdownCodec.parse(source);
        const serialized = basicMarkdownCodec.serialize(document);

        expect(document.child(0).attrs.folding).toBe(false);
        expect(document.child(1).type.name).toBe('definition_list');
        expect(document.child(2).type.name).toBe('quote_link');
        expect(document.child(2).attrs).toMatchObject({cite: 'https://example.com/source', content: 'Quoted source'});
        expect(serialized).toContain('##+ Collapsible section');
        expect(serialized).toContain('[Quoted source](https://example.com/source){data-quotelink=true}');
        const reparsed = basicMarkdownCodec.parse(serialized);
        expect(reparsed.child(0).attrs.folding).toBe(false);
        expect(reparsed.child(1).type.name).toBe('definition_list');
        expect(reparsed.child(2).type.name).toBe('quote_link');
    });

    it('round-trips Math, Mermaid, and YFM HTML blocks with source fallbacks', () => {
        const source = [
            'Formula $E = mc^2$',
            '',
            '$$',
            'x^2 + y^2 = z^2',
            '$$',
            '',
            '```mermaid',
            'graph LR',
            '  A --> B',
            '```',
            '',
            ':::html',
            '<section>YFM HTML</section>',
            ':::',
        ].join('\n');
        const document = basicMarkdownCodec.parse(source);
        const serialized = basicMarkdownCodec.serialize(document);

        expect(document.firstChild?.lastChild?.type.name).toBe('inline_math');
        expect(document.child(1).type.name).toBe('math_block');
        expect(document.child(2).type.name).toBe('mermaid');
        expect(document.child(3).type.name).toBe('yfm_html_block');
        expect(serialized).toContain('$E = mc^2$');
        expect(serialized).toContain('```mermaid\ngraph LR');
        expect(serialized).toContain(':::html\n<section>YFM HTML</section>');
        const reparsed = basicMarkdownCodec.parse(serialized);
        expect(reparsed.firstChild?.lastChild?.type.name).toBe('inline_math');
        expect(reparsed.child(1).type.name).toBe('math_block');
        expect(reparsed.child(2).type.name).toBe('mermaid');
        expect(reparsed.child(3).type.name).toBe('yfm_html_block');
    });

    it('toggles the folded state of a folding heading', () => {
        const document = basicMarkdownSchema.node('doc', null, [
            basicMarkdownSchema.node('heading', {folding: false, level: 2}, basicMarkdownSchema.text('Section')),
            basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('Content')),
        ]);
        const state = EditorState.create({doc: document, selection: TextSelection.create(document, 1)});
        let nextState = state;

        const executed = createBasicEditorCommands().toggleHeadingFolding(state, (transaction) => {
            nextState = state.apply(transaction);
        });

        expect(executed).toBe(true);
        expect(nextState.doc.firstChild?.attrs.folding).toBe(true);
        expect(basicMarkdownCodec.serialize(nextState.doc)).toContain('##+ Section');
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
        ['paragraph', (commands: ReturnType<typeof createBasicEditorCommands>) => commands.paragraph, 'paragraph'],
        ['quote', (commands: ReturnType<typeof createBasicEditorCommands>) => commands.quote, 'blockquote'],
        ['bullet list', (commands: ReturnType<typeof createBasicEditorCommands>) => commands.bulletList, 'bullet_list'],
        ['ordered list', (commands: ReturnType<typeof createBasicEditorCommands>) => commands.orderedList, 'ordered_list'],
        ['code block', (commands: ReturnType<typeof createBasicEditorCommands>) => commands.codeBlock, 'code_block'],
    ] as const)('applies %s block command', (_label, getCommand, nodeName) => {
        const state = nodeName === 'paragraph'
            ? EditorState.create({
                doc: basicMarkdownSchema.node('doc', null, [
                    basicMarkdownSchema.node('heading', {level: 2}, basicMarkdownSchema.text('Heading')),
                ]),
                schema: basicMarkdownSchema,
            })
            : EditorState.create({schema: basicMarkdownSchema});
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

    it('inserts an image and a linked file', () => {
        const state = EditorState.create({schema: basicMarkdownSchema});
        let imageState = state;

        createBasicEditorCommands().insertImage('https://example.com/image.png', 'Image')(state, (transaction) => {
            imageState = state.apply(transaction);
        });

        expect(imageState.doc.firstChild?.firstChild?.type.name).toBe('image');
        expect(imageState.doc.firstChild?.firstChild?.attrs.src).toBe('https://example.com/image.png');

        let fileState = state;
        createBasicEditorCommands().insertFile('https://example.com/file.pdf', 'File')(state, (transaction) => {
            fileState = state.apply(transaction);
        });

        let fileUrl: string | undefined;
        fileState.doc.descendants((node) => {
            const href = node.marks.find((mark) => mark.type.name === 'link')?.attrs.href;
            if (typeof href === 'string') {
                fileUrl = href;
            }
        });

        expect(fileState.doc.textContent).toBe('File');
        expect(fileUrl).toBe('https://example.com/file.pdf');
    });

});
