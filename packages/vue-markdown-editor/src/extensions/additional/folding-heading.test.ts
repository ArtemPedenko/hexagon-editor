import { EditorState, TextSelection } from 'prosemirror-state';
import { describe, expect, it } from 'vitest';

import { basicMarkdownSchema } from '../../core/basic-editor';
import { ExtensionsManager } from '../../core/extensions-manager';

import { FoldingHeading, toggleFoldingHeading } from './folding-heading';

describe('FoldingHeading', () => {
	it('enables folding and creates content after a terminal heading', () => {
		const documentNode = basicMarkdownSchema.node('doc', null, [
			basicMarkdownSchema.node('heading', { folding: null, level: 2 }, basicMarkdownSchema.text('Section')),
		]);
		const state = EditorState.create({
			doc: documentNode,
			selection: TextSelection.create(documentNode, 1),
		});
		let next = state;

		expect(
			toggleFoldingHeading(state, (transaction) => {
				next = state.apply(transaction);
			}),
		).toBe(true);
		expect(next.doc.child(0).attrs.folding).toBe(false);
		expect(next.doc.child(1).type.name).toBe('paragraph');
	});

	it('collapses and expands an enabled folding heading', () => {
		const documentNode = basicMarkdownSchema.node('doc', null, [
			basicMarkdownSchema.node('heading', { folding: false, level: 2 }, basicMarkdownSchema.text('Section')),
			basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('Content')),
		]);
		const state = EditorState.create({
			doc: documentNode,
			selection: TextSelection.create(documentNode, 1),
		});
		let folded = state;
		let expanded = state;

		expect(
			toggleFoldingHeading(state, (transaction) => {
				folded = state.apply(transaction);
			}),
		).toBe(true);
		expect(folded.doc.child(0).attrs.folding).toBe(true);
		expect(
			toggleFoldingHeading(folded, (transaction) => {
				expanded = folded.apply(transaction);
			}),
		).toBe(true);
		expect(expanded.doc.child(0).attrs.folding).toBe(false);
	});

	it('exposes the toggle action through the extension registry', () => {
		const documentNode = basicMarkdownSchema.node('doc', null, [
			basicMarkdownSchema.node('heading', { folding: false, level: 2 }, basicMarkdownSchema.text('Section')),
			basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('Content')),
		]);
		let state = EditorState.create({
			doc: documentNode,
			selection: TextSelection.create(documentNode, 1),
		});
		const action = ExtensionsManager.process((builder) => builder.use(FoldingHeading), {
			baseSchema: basicMarkdownSchema,
		}).actions.action('toggleHeadingFolding');

		expect(action?.isActive({ state })).toBe(true);
		expect(action?.isEnabled({ state })).toBe(true);
		action?.run({
			state,
			dispatch: (transaction) => {
				state = state.apply(transaction);
			},
		});
		expect(state.doc.child(0).attrs.folding).toBe(true);
	});
});
