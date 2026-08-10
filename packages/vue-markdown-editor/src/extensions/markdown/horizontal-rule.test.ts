import {EditorState, TextSelection} from 'prosemirror-state';
import {describe, expect, it} from 'vitest';

import {basicMarkdownSchema} from '../../core/basic-editor';
import {ExtensionsManager} from '../../core/extensions-manager';

import {addHorizontalRule, HorizontalRule, horizontalRuleMarkupAttr, horizontalRuleNodeName} from './horizontal-rule';

describe('HorizontalRule extension', () => {
    it('preserves horizontal rule Markdown markup', () => {
        const result = ExtensionsManager.process((builder) => builder.use(HorizontalRule), {baseSchema: basicMarkdownSchema});
        const parsed = result.textParser.parse('***');

        expect(parsed.firstChild?.type.name).toBe(horizontalRuleNodeName);
        expect(parsed.firstChild?.attrs[horizontalRuleMarkupAttr]).toBe('***');
        expect(result.serializer.serialize(parsed)).toBe('***\n');
        expect(result.plugins).toHaveLength(1);
    });

    it('inserts a paragraph after a horizontal rule from non-empty text', () => {
        const paragraph = basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('text'));
        const documentNode = basicMarkdownSchema.node('doc', null, [paragraph]);
        const state = EditorState.create({
            doc: documentNode,
            schema: basicMarkdownSchema,
            selection: TextSelection.create(documentNode, 3),
        });
        let next = state;

        expect(addHorizontalRule(basicMarkdownSchema.nodes.horizontal_rule!)(state, (transaction) => {
            next = state.apply(transaction);
        })).toBe(true);
        expect(next.doc.childCount).toBe(3);
        expect(next.doc.child(1).type.name).toBe(horizontalRuleNodeName);
    });
});
