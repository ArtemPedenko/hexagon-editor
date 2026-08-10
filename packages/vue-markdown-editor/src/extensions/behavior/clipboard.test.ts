import {EditorState, TextSelection} from 'prosemirror-state';
import {describe, expect, it} from 'vitest';

import {basicMarkdownSchema} from '../../core/basic-editor';
import {isInsideCode} from './clipboard';

describe('Clipboard code handling', () => {
    it('recognises code block and inline-code selections', () => {
        const block = basicMarkdownSchema.node('doc', null, [basicMarkdownSchema.node('code_block', null, basicMarkdownSchema.text('code'))]);
        const blockState = EditorState.create({doc: block, selection: TextSelection.create(block, 2)});
        const inline = basicMarkdownSchema.node('doc', null, [basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('code', [basicMarkdownSchema.marks.code.create()]))]);
        const inlineState = EditorState.create({doc: inline, selection: TextSelection.create(inline, 2)});

        expect(isInsideCode(blockState)).toBe(true);
        expect(isInsideCode(inlineState)).toBe(true);
    });
});
