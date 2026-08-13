import {EditorState, TextSelection} from 'prosemirror-state';
import {describe, expect, it} from 'vitest';

import {basicMarkdownSchema} from '../../core/basic-editor';
import {ExtensionsManager} from '../../core/extensions-manager';
import {addParagraphToEnd, addParagraphToStart, ClicksOnEdges} from './clicks-on-edges';

describe('ClicksOnEdges', () => {
    it('adds paragraphs around an atomic document and moves the selection', () => {
        const documentNode = basicMarkdownSchema.node('doc', null, [basicMarkdownSchema.node('math_block', {latex: 'x'})]);
        let state = EditorState.create({doc: documentNode});

        expect(addParagraphToStart(state, (transaction) => { state = state.apply(transaction); })).toBe(true);
        expect(state.doc.firstChild?.type.name).toBe('paragraph');
        expect(state.selection).toEqual(TextSelection.create(state.doc, 1));

        expect(addParagraphToEnd(state, (transaction) => { state = state.apply(transaction); })).toBe(true);
        expect(state.doc.lastChild?.type.name).toBe('paragraph');
        expect(state.selection.from).toBe(state.doc.nodeSize - 3);
    });

    it('registers edge actions and a click plugin', () => {
        const result = ExtensionsManager.process((builder) => builder.use(ClicksOnEdges), {baseSchema: basicMarkdownSchema});
        expect(result.plugins).toHaveLength(1);
        expect(result.actions.action('addEmptyDefaultTextblockToStartOfDocument')).toBeDefined();
        expect(result.actions.action('addEmptyDefaultTextblockToEndOfDocument')).toBeDefined();
    });
});
