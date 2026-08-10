import {EditorState, TextSelection} from 'prosemirror-state';
import {describe, expect, it} from 'vitest';

import {basicMarkdownSchema} from '../../core/basic-editor';
import {ExtensionsManager} from '../../core/extensions-manager';

import {Selection} from './selection';

describe('Selection extension', () => {
    it('adds decorations for block nodes fully covered by text selection', () => {
        const paragraph = basicMarkdownSchema.nodes.paragraph;
        const documentNode = basicMarkdownSchema.nodes.doc;
        if (paragraph === undefined || documentNode === undefined) {
            throw new Error('Basic schema must contain doc and paragraph nodes');
        }
        const doc = documentNode.create(null, [
            paragraph.create(null, basicMarkdownSchema.text('first')),
            paragraph.create(null, basicMarkdownSchema.text('second')),
        ]);
        const [plugin] = ExtensionsManager.plugins((builder) => builder.use(Selection), basicMarkdownSchema);
        if (plugin === undefined) {
            throw new Error('Selection plugin is not registered');
        }
        const state = EditorState.create({
            doc,
            plugins: [plugin],
            schema: basicMarkdownSchema,
            selection: TextSelection.create(doc, 1, doc.content.size - 1),
        });

        expect(plugin.props.decorations?.(state)?.find()).toHaveLength(2);
    });
});
