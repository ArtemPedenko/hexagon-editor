import {EditorState, TextSelection} from 'prosemirror-state';
import {describe, expect, it} from 'vitest';

import {basicMarkdownSchema} from '../../core/basic-editor';
import {ExtensionsManager} from '../../core/extensions-manager';

import {getCurrentLink, Link, LinkAttr, linkMarkName, removeCurrentLink, setLink, toggleLink} from './link';

describe('Link extension', () => {
    it('parses and serializes a link with title', () => {
        const result = ExtensionsManager.process((builder) => builder.use(Link), {baseSchema: basicMarkdownSchema});
        const parsed = result.textParser.parse('[site](https://example.com "Example")');

        expect(parsed.firstChild?.firstChild?.marks[0]?.type.name).toBe(linkMarkName);
        expect(parsed.firstChild?.firstChild?.marks[0]?.attrs[LinkAttr.Title]).toBe('Example');
        expect(result.serializer.serialize(parsed)).toBe('[site](https://example.com "Example")\n');
        expect(result.plugins).toHaveLength(2);
    });

    it('escapes parentheses in a link URL', () => {
        const result = ExtensionsManager.process((builder) => builder.use(Link), {baseSchema: basicMarkdownSchema});
        const documentNode = basicMarkdownSchema.node('doc', null, [
            basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('site', [
                basicMarkdownSchema.marks.link.create({[LinkAttr.Href]: 'https://example.com/a(b)'}),
            ])),
        ]);

        expect(result.serializer.serialize(documentNode)).toBe('[site](https://example.com/a\\(b\\))\n');
    });

    it('adds a link mark to selected text', () => {
        const paragraph = basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('text'));
        const documentNode = basicMarkdownSchema.node('doc', null, [paragraph]);
        const state = EditorState.create({
            doc: documentNode,
            schema: basicMarkdownSchema,
            selection: TextSelection.create(documentNode, 1, 5),
        });
        let next = state;

        expect(toggleLink('https://example.com')(state, (transaction) => {
            next = state.apply(transaction);
        })).toBe(true);
        expect(next.doc.firstChild?.firstChild?.marks[0]?.attrs[LinkAttr.Href]).toBe('https://example.com');
    });

    it('inserts link text and title when the selection is empty', () => {
        const state = EditorState.create({schema: basicMarkdownSchema});
        let next = state;

        expect(setLink('https://example.com', 'Example', 'Example site')(state, (transaction) => {
            next = state.apply(transaction);
        })).toBe(true);
        expect(next.doc.textContent).toBe('Example site');
        expect(next.doc.firstChild?.firstChild?.marks[0]?.attrs[LinkAttr.Title]).toBe('Example');
    });

    it('updates and removes a selected link', () => {
        const documentNode = basicMarkdownSchema.node('doc', null, [
            basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('site', [
                basicMarkdownSchema.marks.link.create({[LinkAttr.Href]: 'https://old.example.com'}),
            ])),
        ]);
        const state = EditorState.create({doc: documentNode, selection: TextSelection.create(documentNode, 1, 5)});
        let updated = state;

        expect(setLink('https://new.example.com', 'New site', 'new site')(state, (transaction) => {
            updated = state.apply(transaction);
        })).toBe(true);
        expect(updated.doc.textContent).toBe('new site');
        expect(updated.doc.firstChild?.firstChild?.marks[0]?.attrs[LinkAttr.Href]).toBe('https://new.example.com');

        let removed = updated;
        expect(removeCurrentLink(updated, (transaction) => {
            removed = updated.apply(transaction);
        })).toBe(true);
        expect(removed.doc.firstChild?.firstChild?.marks).toHaveLength(0);
    });

    it('preserves surrounding text when an editing selection extends past the link', () => {
        const link = basicMarkdownSchema.marks.link.create({[LinkAttr.Href]: 'http://localhost:5173/', [LinkAttr.Title]: '3213123'});
        const documentNode = basicMarkdownSchema.node('doc', null, [
            basicMarkdownSchema.node('paragraph', null, [
                basicMarkdownSchema.text('123123  '),
                basicMarkdownSchema.text('qwe', [link]),
                basicMarkdownSchema.text(' trailing'),
            ]),
        ]);
        const state = EditorState.create({
            doc: documentNode,
            selection: TextSelection.create(documentNode, 10, 16),
        });
        let updated = state;

        expect(getCurrentLink(state)?.text).toBe('qwe');

        expect(setLink('http://localhost:5173/', '3213123', 'changed')(state, (transaction) => {
            updated = state.apply(transaction);
        })).toBe(true);
        expect(updated.doc.textContent).toBe('123123  changed trailing');
    });

    it('reads a link when the cursor is inside its text', () => {
        const documentNode = basicMarkdownSchema.node('doc', null, [
            basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('localhost', [
                basicMarkdownSchema.marks.link.create({[LinkAttr.Href]: 'http://localhost:5173/'}),
            ])),
        ]);
        const state = EditorState.create({doc: documentNode, selection: TextSelection.create(documentNode, 5)});

        expect(getCurrentLink(state)).toEqual({
            href: 'http://localhost:5173/',
            openInNewWindow: false,
            text: 'localhost',
            title: null,
        });
    });

    it('round-trips safe new-window attributes', () => {
        const result = ExtensionsManager.process((builder) => builder.use(Link), {baseSchema: basicMarkdownSchema});
        const markdown = '[site](https://example.com) {target="_blank" rel="noopener noreferrer"}';
        const parsed = result.textParser.parse(markdown);
        const link = parsed.firstChild?.firstChild?.marks[0];

        expect(link?.attrs[LinkAttr.Target]).toBe('_blank');
        expect(link?.attrs[LinkAttr.Rel]).toBe('noopener noreferrer');
        expect(result.serializer.serialize(parsed)).toBe(`${markdown}\n`);
    });

    it('turns a pasted HTTP URL into a link', () => {
        const [plugin] = ExtensionsManager.plugins((builder) => builder.use(Link), basicMarkdownSchema);
        const state = EditorState.create({plugins: [plugin!], schema: basicMarkdownSchema});
        let next = state;
        const handled = plugin?.props.handlePaste?.({
            dispatch: (transaction) => { next = state.apply(transaction); },
            state,
        } as never, {
            clipboardData: {getData: () => 'https://example.com/docs'},
            preventDefault: () => undefined,
        } as ClipboardEvent, false);

        expect(handled).toBe(true);
        expect(next.doc.textContent).toBe('https://example.com/docs');
        expect(next.doc.firstChild?.firstChild?.marks[0]?.attrs[LinkAttr.Href]).toBe('https://example.com/docs');
    });
});
