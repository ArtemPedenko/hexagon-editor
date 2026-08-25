import { EditorState, NodeSelection, TextSelection } from 'prosemirror-state';
import { describe, expect, it, vi } from 'vitest';

import { basicMarkdownSchema } from '../../core/basic-editor';
import { ExtensionsManager } from '../../core/extensions-manager';

import {
	createLatexPastePlugin,
	defaultMathLatex,
	insertInlineMath,
	Math,
	mathBlockActionName,
	mathInlineActionName,
	MathNode,
	moveCursorLeftOfMathInline,
	moveCursorRightOfMathInline,
	parseLatexFormulas,
	selectMathInlineBeforeCursor,
} from './math';

describe('Math extension', () => {
	it('parses and serializes inline and block formulas without Diplodoc', () => {
		const result = ExtensionsManager.process((builder) => builder.use(Math), {
			baseSchema: basicMarkdownSchema,
		});
		const document = result.textParser.parse('Inline $\\sqrt{3x-1}$\n\n$$x^2 + y^2 = z^2$$');

		expect(document.firstChild?.lastChild?.type.name).toBe(MathNode.Inline);
		expect(document.child(1).type.name).toBe(MathNode.Block);
		expect(result.serializer.serialize(document)).toContain('$\\sqrt{3x-1}$');
		expect(result.serializer.serialize(document)).toContain('$$\nx^2 + y^2 = z^2\n$$');
		expect(result.plugins).toHaveLength(3);
	});

	it('does not turn escaped delimiters, whitespace delimiters, or code into formulas', () => {
		const result = ExtensionsManager.process((builder) => builder.use(Math), {
			baseSchema: basicMarkdownSchema,
		});
		const document = result.textParser.parse('\\$x$ $ x$ `$x$`');

		expect(document.firstChild?.content.content.some((node) => node.type.name === MathNode.Inline)).toBe(false);
		expect(document.textContent).toBe('$x$ $ x$ $x$');
	});

	it('inserts selected text as inline math and supports atomic cursor navigation', () => {
		const paragraph = basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('x'));
		const document = basicMarkdownSchema.node('doc', null, [paragraph]);
		const initial = EditorState.create({
			doc: document,
			selection: TextSelection.create(document, 1, 2),
		});
		let inserted = initial;

		expect(
			insertInlineMath(initial, (transaction) => {
				inserted = initial.apply(transaction);
			}),
		).toBe(true);
		expect(inserted.doc.firstChild?.firstChild?.type.name).toBe(MathNode.Inline);
		expect(inserted.doc.firstChild?.firstChild?.attrs.latex).toBe('x');

		const afterMath = EditorState.create({
			doc: inserted.doc,
			selection: TextSelection.create(inserted.doc, 2),
		});
		let beforeMath = afterMath;
		expect(
			moveCursorLeftOfMathInline(afterMath, (transaction) => {
				beforeMath = afterMath.apply(transaction);
			}),
		).toBe(true);
		expect(beforeMath.selection.from).toBe(1);

		let afterAgain = beforeMath;
		expect(
			moveCursorRightOfMathInline(beforeMath, (transaction) => {
				afterAgain = beforeMath.apply(transaction);
			}),
		).toBe(true);
		expect(afterAgain.selection.from).toBe(2);

		let selected = afterAgain;
		expect(
			selectMathInlineBeforeCursor(afterAgain, (transaction) => {
				selected = afterAgain.apply(transaction);
			}),
		).toBe(true);
		expect(selected.selection.from).toBe(1);
	});

	it('uses a predictable template for an empty selection', () => {
		const document = basicMarkdownSchema.node('doc', null, [basicMarkdownSchema.node('paragraph')]);
		const state = EditorState.create({
			doc: document,
			selection: TextSelection.create(document, 1),
		});
		let next = state;

		expect(
			insertInlineMath(state, (transaction) => {
				next = state.apply(transaction);
			}),
		).toBe(true);
		expect(next.doc.firstChild?.firstChild?.attrs.latex).toBe(defaultMathLatex);
	});

	it('exposes inline and block actions through the extension registry', () => {
		const documentNode = basicMarkdownSchema.node('doc', null, [basicMarkdownSchema.node('paragraph')]);
		let state = EditorState.create({
			doc: documentNode,
			selection: TextSelection.create(documentNode, 1),
		});
		const actions = ExtensionsManager.process((builder) => builder.use(Math), {
			baseSchema: basicMarkdownSchema,
		}).actions;
		const inline = actions.action(mathInlineActionName);
		const block = actions.action(mathBlockActionName);

		expect(inline?.isEnabled({ state })).toBe(true);
		inline?.run({
			state,
			dispatch: (transaction) => {
				state = state.apply(transaction);
			},
		});
		state = EditorState.create({
			doc: state.doc,
			selection: NodeSelection.create(state.doc, 1),
		});
		expect(inline?.isActive({ state })).toBe(true);

		const blockState = EditorState.create({
			doc: documentNode,
			selection: TextSelection.create(documentNode, 1),
		});
		expect(block?.isEnabled({ state: blockState })).toBe(true);
		let next = blockState;
		block?.run({
			state: blockState,
			dispatch: (transaction) => {
				next = blockState.apply(transaction);
			},
		});
		expect(next.doc.firstChild?.type.name).toBe(MathNode.Block);
	});

	it('turns a VS Code LaTeX clipboard selection into math blocks', () => {
		const state = EditorState.create({ schema: basicMarkdownSchema });
		let next = state;
		const preventDefault = vi.fn();
		const plugin = createLatexPastePlugin();

		const handled = plugin.props.handleDOMEvents?.paste?.(
			{
				dispatch: (transaction) => {
					next = state.apply(transaction);
				},
				state,
			} as never,
			{
				clipboardData: {
					getData: (type: string) =>
						type === 'vscode-editor-data' ? '{"mode":"latex"}' : 'E = mc^2\n\ne^{i\\pi} + 1 = 0',
					types: ['text/plain', 'vscode-editor-data'],
				},
				preventDefault,
			} as never,
		);

		expect(handled).toBe(true);
		expect(preventDefault).toHaveBeenCalledOnce();
		expect(next.doc.childCount).toBe(3);
		expect(next.doc.child(1).attrs.latex).toBe('E = mc^2');
		expect(next.doc.child(2).attrs.latex).toBe('e^{i\\pi} + 1 = 0');
	});

	it('splits VS Code LaTeX clipboard text by blank lines', () => {
		expect(parseLatexFormulas('% Einstein equation\nE = mc^2\n\ne^{i\\pi} + 1 = 0')).toEqual([
			'% Einstein equation\nE = mc^2',
			'e^{i\\pi} + 1 = 0',
		]);
	});
});
