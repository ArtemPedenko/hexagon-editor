import { dropCursor } from 'prosemirror-dropcursor';
import { DOMSerializer } from 'prosemirror-model';
import type { Node as ProseMirrorNode, ResolvedPos } from 'prosemirror-model';
import { NodeSelection, Plugin, PluginKey, Selection, TextSelection } from 'prosemirror-state';
import type { Mapping } from 'prosemirror-transform';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { EditorView } from 'prosemirror-view';

import type { ExtensionAuto } from '../../core/extension-builder';

import './cursor.css';

export function isGapCursorSelection<Meta>(selection: Selection): selection is GapCursorSelection<Meta> {
	return selection instanceof GapCursorSelection;
}

/** Virtual text position between block nodes used by upstream selection behavior. */
export class GapCursorSelection<Meta = unknown> extends Selection {
	readonly meta: Meta | undefined;
	readonly selectionName = 'GapCursorSelection';

	get $pos(): ResolvedPos {
		return this.$head;
	}
	get pos(): number {
		return this.$head.pos;
	}

	constructor($pos: ResolvedPos, options?: { meta?: Meta }) {
		super($pos, $pos);
		this.meta = options?.meta;
	}

	eq(other: Selection): boolean {
		return isGapCursorSelection(other) && this.pos === other.pos && this.$pos.doc.eq(other.$pos.doc);
	}

	map(documentNode: ProseMirrorNode, mapping: Mapping): Selection {
		return Selection.near(documentNode.resolve(mapping.map(this.head)));
	}

	toJSON(): { type: string; pos: number } {
		return { type: this.selectionName, pos: this.pos };
	}
}

const gapCursorPluginKey = new PluginKey<boolean>('gapCursorPlugin');

export function createGapCursorPlugin(): Plugin<boolean> {
	return new Plugin<boolean>({
		key: gapCursorPluginKey,
		state: {
			init: () => false,
			apply: (_transaction, _pluginState, _oldState, newState) =>
				isGapCursorSelection(newState.selection) || newState.selection instanceof NodeSelection,
		},
		view: () => ({
			update(view) {
				view.dom.classList.toggle('Prosemirror-hide-cursor', gapCursorPluginKey.getState(view.state) === true);
			},
		}),
		props: {
			handleKeyPress(view) {
				const selection = view.state.selection;
				if (!isGapCursorSelection(selection)) return false;
				const paragraph = view.state.schema.nodes.paragraph?.create();
				if (paragraph === undefined) return false;
				const transaction = view.state.tr.replaceSelectionWith(paragraph);
				transaction.setSelection(TextSelection.create(transaction.doc, selection.pos + 1));
				view.dispatch(transaction.scrollIntoView());
				return false;
			},
			decorations: ({ doc, selection }) =>
				isGapCursorSelection(selection)
					? DecorationSet.create(doc, [
							Decoration.widget(selection.head, renderGapCursor, {
								key: 'gapcursor',
								side: -1,
							}),
						])
					: null,
		},
	});
}

function renderGapCursor(view: EditorView, getPosition: () => number | undefined): HTMLElement {
	const paragraph = view.state.schema.nodes.paragraph?.create();
	const element =
		paragraph === undefined
			? document.createElement('p')
			: (DOMSerializer.fromSchema(view.state.schema).serializeNode(paragraph) as HTMLElement);
	element.classList.add('hx-md-gapcursor');
	element.addEventListener('mousedown', () => {
		const position = getPosition();
		if (position !== undefined && paragraph !== undefined) view.dispatch(view.state.tr.replaceSelectionWith(paragraph));
	});
	return element;
}

export interface CursorOptions {
	dropOptions?: Parameters<typeof dropCursor>[0];
}

/** Upstream cursor behavior: virtual block cursor and drag-and-drop cursor. */
export const Cursor: ExtensionAuto<CursorOptions> = (builder, options) => {
	builder.addPlugin(() => createGapCursorPlugin(), builder.Priority.Highest);
	builder.addPlugin(() => dropCursor(options?.dropOptions));
};
