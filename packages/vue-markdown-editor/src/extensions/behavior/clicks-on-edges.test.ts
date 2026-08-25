import { EditorState, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { describe, expect, it } from 'vitest';

import { basicMarkdownSchema } from '../../core/basic-editor';
import { ExtensionsManager } from '../../core/extensions-manager';
import { addParagraphToEnd, addParagraphToStart, ClicksOnEdges } from './clicks-on-edges';

describe('ClicksOnEdges', () => {
	it('adds paragraphs around an atomic document and moves the selection', () => {
		const documentNode = basicMarkdownSchema.node('doc', null, [
			basicMarkdownSchema.node('math_block', { latex: 'x' }),
		]);
		let state = EditorState.create({ doc: documentNode });

		expect(
			addParagraphToStart(state, (transaction) => {
				state = state.apply(transaction);
			}),
		).toBe(true);
		expect(state.doc.firstChild?.type.name).toBe('paragraph');
		expect(state.selection).toEqual(TextSelection.create(state.doc, 1));

		expect(
			addParagraphToEnd(state, (transaction) => {
				state = state.apply(transaction);
			}),
		).toBe(true);
		expect(state.doc.lastChild?.type.name).toBe('paragraph');
		expect(state.selection.from).toBe(state.doc.nodeSize - 3);
	});

	it('registers edge actions and a click plugin', () => {
		const result = ExtensionsManager.process((builder) => builder.use(ClicksOnEdges), {
			baseSchema: basicMarkdownSchema,
		});
		expect(result.plugins).toHaveLength(1);
		expect(result.actions.action('addEmptyDefaultTextblockToStartOfDocument')).toBeDefined();
		expect(result.actions.action('addEmptyDefaultTextblockToEndOfDocument')).toBeDefined();
	});

	it('does not handle a click above the document content', () => {
		const documentNode = basicMarkdownSchema.node('doc', null, [
			basicMarkdownSchema.node('math_block', { latex: 'x' }),
		]);
		const plugin = ExtensionsManager.process((builder) => builder.use(ClicksOnEdges), {
			baseSchema: basicMarkdownSchema,
		}).plugins[0];
		const view = new EditorView(document.createElement('div'), {
			state: EditorState.create({ doc: documentNode, plugins: [plugin] }),
		});

		const handled = plugin.props.handleClick?.(view, 0, {
			offsetY: -1,
			target: view.dom,
		} as MouseEvent);

		expect(handled).toBe(false);
		expect(view.state.doc).toBe(documentNode);
		view.destroy();
	});

	it('adds a trailing paragraph and moves the cursor after a click below the document content', () => {
		const documentNode = basicMarkdownSchema.node('doc', null, [
			basicMarkdownSchema.node('math_block', { latex: 'x' }),
		]);
		const plugin = ExtensionsManager.process((builder) => builder.use(ClicksOnEdges), {
			baseSchema: basicMarkdownSchema,
		}).plugins[0];
		const view = new EditorView(document.createElement('div'), {
			state: EditorState.create({ doc: documentNode, plugins: [plugin] }),
		});

		const handled = plugin.props.handleClick?.(view, 0, {
			offsetY: 1,
			target: view.dom,
		} as MouseEvent);

		expect(handled).toBe(true);
		expect(view.state.doc.lastChild?.type.name).toBe('paragraph');
		expect(view.state.selection).toEqual(TextSelection.create(view.state.doc, view.state.doc.nodeSize - 3));
		view.destroy();
	});
});
