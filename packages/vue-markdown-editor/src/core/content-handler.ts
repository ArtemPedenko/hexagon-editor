import { Slice } from 'prosemirror-model';
import type { Fragment } from 'prosemirror-model';
import { AllSelection, TextSelection } from 'prosemirror-state';
import type { Transaction } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

import type { MarkdownCodec } from './markdown';

type MarkdownParser = Pick<MarkdownCodec, 'parse'>;

/**
 * Framework-independent upstream content operations for a mounted WYSIWYG
 * view. Vue only owns the view lifecycle; document mutation semantics stay
 * identical to the upstream implementation.
 */
export class WysiwygContentHandler {
	readonly #parser: MarkdownParser;
	readonly #view: EditorView;

	constructor(view: EditorView, parser: MarkdownParser) {
		this.#view = view;
		this.#parser = parser;
	}

	clear(): void {
		this.#view.dispatch(
			this.#view.state.tr.setSelection(new AllSelection(this.#view.state.doc)).replaceSelection(Slice.empty),
		);
	}

	replace(markdown: string): void {
		this.#view.dispatch(
			this.#view.state.tr
				.setSelection(new AllSelection(this.#view.state.doc))
				.replaceSelection(new Slice(this.#parser.parse(markdown).content, 0, 0)),
		);
	}

	prepend(markdown: string): void {
		this.#view.dispatch(this.#view.state.tr.insert(0, this.#parser.parse(markdown).content));
	}

	append(markdown: string): void {
		let transaction = this.#view.state.tr;
		if (transaction.doc.lastChild?.type.name === 'paragraph' && transaction.doc.lastChild.childCount === 0) {
			const position = transaction.doc.nodeSize - 3;
			transaction = transaction.replaceWith(position - 1, position + 1, this.#parser.parse(markdown));
		} else {
			transaction = this.appendContent(transaction, markdown);
		}

		if (transaction.doc.lastChild?.type.name !== 'paragraph' || transaction.doc.lastChild.childCount !== 0) {
			transaction = this.appendContent(transaction, '');
		}
		this.#view.dispatch(transaction);
	}

	insert(markdown: string): void {
		const { state } = this.#view;
		if (state.selection.$from.parent.type.spec.code) {
			this.#view.dispatch(state.tr.replaceSelectionWith(state.schema.text(markdown), true).scrollIntoView());
			return;
		}

		const content = this.#parser.parse(markdown).content;
		if (content.size > 0) {
			this.#view.dispatch(state.tr.replaceSelection(getSliceFromMarkdownFragment(content)).scrollIntoView());
		}
	}

	moveCursor(position: 'start' | 'end'): void {
		if (position === 'start') {
			this.#view.dispatch(this.#view.state.tr.setSelection(TextSelection.create(this.#view.state.doc, 1)));
			return;
		}
		if (position === 'end') {
			const { tr } = this.#view.state;
			const cursorPosition = tr.doc.nodeSize - 2;
			if (!tr.doc.lastChild?.isTextblock && !tr.doc.lastChild?.isText) {
				this.appendContent(tr, '');
			}
			this.#view.dispatch(
				tr.setSelection(TextSelection.create(tr.doc, tr.mapping.map(cursorPosition) - 1)).scrollIntoView(),
			);
			return;
		}
		throw new Error('The "position" argument must be "start" or "end"');
	}

	private appendContent(transaction: Transaction, markdown: string): Transaction {
		return transaction.insert(transaction.doc.nodeSize - 2, this.#parser.parse(markdown).content);
	}
}

function getSliceFromMarkdownFragment(fragment: Fragment): Slice {
	let openStart = 0;
	let openEnd = 0;
	if (fragment.firstChild?.isTextblock) {
		openStart = 1;
		if (fragment.childCount === 1) openEnd = 1;
	}
	return new Slice(fragment, openStart, openEnd);
}
