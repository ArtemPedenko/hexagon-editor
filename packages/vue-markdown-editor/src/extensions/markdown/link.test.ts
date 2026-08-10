import {EditorState, TextSelection} from 'prosemirror-state';
import {describe, expect, it} from 'vitest';

import {basicMarkdownSchema} from '../../core/basic-editor';
import {ExtensionsManager} from '../../core/extensions-manager';

import {Link, LinkAttr, linkMarkName, toggleLink} from './link';

describe('Link extension', () => {
    it('parses and serializes a link with title', () => {
        const result = ExtensionsManager.process((builder) => builder.use(Link), {baseSchema: basicMarkdownSchema});
        const parsed = result.textParser.parse('[site](https://example.com "Example")');

        expect(parsed.firstChild?.firstChild?.marks[0]?.type.name).toBe(linkMarkName);
        expect(parsed.firstChild?.firstChild?.marks[0]?.attrs[LinkAttr.Title]).toBe('Example');
        expect(result.serializer.serialize(parsed)).toBe('[site](https://example.com "Example")\n');
        expect(result.plugins).toHaveLength(1);
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
});
