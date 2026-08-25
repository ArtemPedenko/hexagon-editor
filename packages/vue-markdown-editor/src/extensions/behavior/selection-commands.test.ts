import { EditorState, NodeSelection, TextSelection } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';

import { basicMarkdownSchema } from '../../core/basic-editor';
import { GapCursorSelection } from './cursor';
import {
	createFakeParagraph,
	findFakeParaPosForCodeBlock,
	findFakeParaPosForNodeSelection,
	findNextFakeParaPosForGapCursorSelection,
	gapCursorBackspace,
} from './selection-commands';

describe('Selection gap cursor commands', () => {
	it('finds positions before and after an isolated block node', () => {
		const documentNode = basicMarkdownSchema.node('doc', null, [
			basicMarkdownSchema.node('math_block', { latex: 'x' }),
		]);
		const selection = NodeSelection.create(documentNode, 0);

		expect(findFakeParaPosForNodeSelection(selection, 'before')?.pos).toBe(0);
		expect(findFakeParaPosForNodeSelection(selection, 'after')?.pos).toBe(1);
	});

	it('finds a virtual paragraph between adjacent block nodes', () => {
		const documentNode = basicMarkdownSchema.node('doc', null, [
			basicMarkdownSchema.node('math_block', { latex: 'x' }),
			basicMarkdownSchema.node('mermaid', { source: 'graph LR' }),
		]);
		const selection = NodeSelection.create(documentNode, 0);

		expect(findFakeParaPosForNodeSelection(selection, 'after')?.pos).toBe(1);
		const gap = new GapCursorSelection(documentNode.resolve(1), {
			meta: { direction: 'after' as const },
		});
		expect(findNextFakeParaPosForGapCursorSelection(gap, 'after')).toBeNull();
	});

	it('finds positions around a code block cursor', () => {
		const documentNode = basicMarkdownSchema.node('doc', null, [basicMarkdownSchema.node('code_block')]);
		const selection = TextSelection.create(documentNode, 1);

		expect(findFakeParaPosForCodeBlock(selection.$from, 'before')?.pos).toBe(0);
		expect(findFakeParaPosForCodeBlock(selection.$from, 'after')?.pos).toBe(2);
	});

	it('creates a gap selection and backspace returns to a native selection', () => {
		const documentNode = basicMarkdownSchema.node('doc', null, [
			basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('before')),
			basicMarkdownSchema.node('math_block', { latex: 'x' }),
		]);
		const state = EditorState.create({ doc: documentNode });
		const gapState = state.apply(createFakeParagraph(state.tr, state.doc.resolve(8), 'after'));
		let nextState = gapState;

		expect(gapState.selection).toBeInstanceOf(GapCursorSelection);
		expect(
			gapCursorBackspace(gapState, (transaction) => {
				nextState = gapState.apply(transaction);
			}),
		).toBe(true);
		expect(nextState.selection).not.toBeInstanceOf(GapCursorSelection);
	});
});
