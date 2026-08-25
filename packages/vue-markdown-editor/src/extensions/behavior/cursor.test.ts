import { Mapping } from 'prosemirror-transform';
import { EditorState, NodeSelection } from 'prosemirror-state';
import { describe, expect, it, vi } from 'vitest';

import { basicMarkdownSchema } from '../../core/basic-editor';
import { ExtensionBuilder } from '../../core/extension-builder';
import { Cursor, GapCursorSelection, createGapCursorPlugin, isGapCursorSelection } from './cursor';

describe('Cursor', () => {
	it('preserves gap cursor identity and maps it back to a native selection', () => {
		const documentNode = basicMarkdownSchema.node('doc', null, [
			basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('before')),
			basicMarkdownSchema.node('horizontal_rule'),
			basicMarkdownSchema.node('paragraph', null, basicMarkdownSchema.text('after')),
		]);
		const selection = new GapCursorSelection(documentNode.resolve(8), {
			meta: { direction: 1 },
		});

		expect(isGapCursorSelection(selection)).toBe(true);
		expect(selection.pos).toBe(8);
		expect(selection.meta).toEqual({ direction: 1 });
		expect(selection.eq(new GapCursorSelection(documentNode.resolve(8)))).toBe(true);
		expect(isGapCursorSelection(selection.map(documentNode, new Mapping()))).toBe(false);
	});

	it('hides the native caret for gap and node selections', () => {
		const plugin = createGapCursorPlugin();
		const documentNode = basicMarkdownSchema.node('doc', null, [basicMarkdownSchema.node('horizontal_rule')]);
		const state = EditorState.create({ doc: documentNode, plugins: [plugin] });
		const gapState = state.apply(state.tr.setSelection(new GapCursorSelection(state.doc.resolve(0))));
		const nodeState = gapState.apply(gapState.tr.setSelection(NodeSelection.create(gapState.doc, 0)));

		expect(plugin.getState(state)).toBe(false);
		expect(plugin.getState(gapState)).toBe(true);
		expect(plugin.getState(nodeState)).toBe(true);
	});

	it('materializes a paragraph before other key handlers run', () => {
		const plugin = createGapCursorPlugin();
		const documentNode = basicMarkdownSchema.node('doc', null, [basicMarkdownSchema.node('horizontal_rule')]);
		const state = EditorState.create({ doc: documentNode, plugins: [plugin] });
		const gapState = state.apply(state.tr.setSelection(new GapCursorSelection(state.doc.resolve(0))));
		const dispatch = vi.fn();

		expect(plugin.props.handleKeyPress?.call(plugin, { state: gapState, dispatch } as never, {} as never)).toBe(false);
		expect(dispatch).toHaveBeenCalledOnce();
		expect(dispatch.mock.calls[0]?.[0].doc.firstChild?.type.name).toBe('paragraph');
	});

	it('registers gap cursor before the standard drop cursor', () => {
		const spec = new ExtensionBuilder().use(Cursor, {}).build();
		const plugins = spec.plugins({ schema: basicMarkdownSchema });

		expect(plugins).toHaveLength(2);
		expect(plugins[0]?.props.handleKeyPress).toBeTypeOf('function');
		expect(plugins[1]?.props.handleKeyPress).toBeUndefined();
	});
});
