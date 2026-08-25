import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { NodeSelection, Plugin, PluginKey } from 'prosemirror-state';
import type { StateField } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { EditorView } from 'prosemirror-view';

import { mountBasicMarkupEditor } from './markup-editor';

export const atomicSourcePluginKey = new PluginKey<number | null>('atomic-source-editor');
const atomicSourceNodeNames = new Set(['directive', 'inline_math', 'math_block', 'mermaid', 'raw_html']);

function getAtomicSource(node: ProseMirrorNode): string {
	switch (node.type.name) {
		case 'inline_math':
			return `$${node.attrs.latex}$`;
		case 'math_block':
			return `$$\n${node.attrs.latex}\n$$`;
		case 'mermaid':
			return `\`\`\`mermaid\n${node.attrs.source}\n\`\`\``;
		case 'directive':
			return `::: ${node.attrs.name}\n${node.attrs.content}\n:::`;
		case 'yfm_html_block':
			return `:::html\n${node.attrs.html}\n:::`;
		default:
			return node.attrs.html;
	}
}

function getAtomicAttrs(node: ProseMirrorNode, source: string): Record<string, unknown> {
	switch (node.type.name) {
		case 'inline_math':
		case 'math_block':
			return {
				...node.attrs,
				latex: source.replace(/^\$\$?\s*/, '').replace(/\s*\$\$?$/, ''),
			};
		case 'mermaid':
			return {
				...node.attrs,
				source: source.replace(/^```mermaid\s*\n?/, '').replace(/\n?```\s*$/, ''),
			};
		case 'directive':
			return {
				...node.attrs,
				content: source.replace(/^:::\s*\w+\s*\n?/, '').replace(/\n?:::\s*$/, ''),
			};
		case 'yfm_html_block':
			return {
				...node.attrs,
				html: source.replace(/^:::html\s*\n?/, '').replace(/\n?:::\s*$/, ''),
			};
		default:
			return { ...node.attrs, html: source };
	}
}

export function findAtomicSourceNode(
	doc: ProseMirrorNode,
	position: number,
): { node: ProseMirrorNode; position: number } | undefined {
	const directNode = doc.nodeAt(position);
	if (directNode !== null && atomicSourceNodeNames.has(directNode.type.name)) return { node: directNode, position };
	const previousNode = position > 0 ? doc.nodeAt(position - 1) : null;
	if (previousNode !== null && atomicSourceNodeNames.has(previousNode.type.name))
		return { node: previousNode, position: position - 1 };
	const $position = doc.resolve(position);
	if ($position.nodeAfter !== null && atomicSourceNodeNames.has($position.nodeAfter.type.name))
		return { node: $position.nodeAfter, position };
	for (let depth = $position.depth; depth > 0; depth -= 1) {
		const node = $position.node(depth);
		if (atomicSourceNodeNames.has(node.type.name)) return { node, position: $position.before(depth) };
	}
	return undefined;
}

export function createAtomicSourceEditorPlugin(): Plugin<number | null> {
	let editorView: EditorView | undefined;
	const close = (): void => {
		if (editorView !== undefined) editorView.dispatch(editorView.state.tr.setMeta(atomicSourcePluginKey, null));
	};
	return new Plugin({
		key: atomicSourcePluginKey,
		state: {
			init: () => null,
			apply: (transaction, value) => {
				const position = transaction.getMeta(atomicSourcePluginKey);
				if (position !== undefined) return position;
				if (value === null || !transaction.docChanged) return value;
				const mapped = transaction.mapping.mapResult(value);
				return mapped.deleted ? null : mapped.pos;
			},
		} as StateField<number | null>,
		view: (view) => {
			editorView = view;
			return {
				destroy: () => {
					editorView = undefined;
				},
			};
		},
		props: {
			decorations: (state) => {
				const position = atomicSourcePluginKey.getState(state);
				if (position === null || position === undefined) return DecorationSet.empty;
				const found = findAtomicSourceNode(state.doc, position);
				if (found === undefined) return DecorationSet.empty;
				let markupEditor: ReturnType<typeof mountBasicMarkupEditor> | undefined;
				let destroyMarkupEditor: (() => void) | undefined;
				const sourceEditor = Decoration.widget(
					found.position,
					() => {
						const dom = document.createElement('div');
						dom.className = 'markdown-editor__atomic-source';
						let finished = false;
						let removeOutsidePointerDown: (() => void) | undefined;
						const finish = (commit: boolean): void => {
							if (finished || editorView === undefined) return;
							finished = true;
							removeOutsidePointerDown?.();
							if (commit) {
								const node = editorView.state.doc.nodeAt(found.position);
								const source = markupEditor?.getValue();
								if (node !== null && source !== undefined)
									editorView.dispatch(
										editorView.state.tr
											.setNodeMarkup(found.position, undefined, getAtomicAttrs(node, source))
											.setMeta(atomicSourcePluginKey, null),
									);
							} else {
								close();
							}
						};
						markupEditor = mountBasicMarkupEditor({
							initialValue: getAtomicSource(found.node),
							target: dom,
						});
						const handleOutsidePointerDown = (event: PointerEvent): void => {
							if (
								!(event.target instanceof Node) ||
								dom.contains(event.target) ||
								(event.target instanceof Element && event.target.closest('[data-markdown-editor-toolbar]'))
							)
								return;
							finish(true);
						};
						document.addEventListener('pointerdown', handleOutsidePointerDown, true);
						removeOutsidePointerDown = () =>
							document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
						destroyMarkupEditor = () => {
							removeOutsidePointerDown?.();
							markupEditor?.destroy();
						};
						dom.addEventListener(
							'keydown',
							(event) => {
								if (event.key === 'Escape') {
									event.preventDefault();
									finish(false);
								}
								if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
									event.preventDefault();
									finish(true);
								}
							},
							true,
						);
						queueMicrotask(() => markupEditor?.focus());
						return dom;
					},
					{
						destroy: () => destroyMarkupEditor?.(),
						side: -1,
						stopEvent: () => true,
					},
				);
				return DecorationSet.create(state.doc, [
					Decoration.node(found.position, found.position + found.node.nodeSize, {
						class: 'markdown-editor__atomic-source-original',
					}),
					sourceEditor,
				]);
			},
			handleDOMEvents: {
				dblclick: (view, event) => {
					const target = event.target;
					const atomicElement =
						target instanceof HTMLElement
							? target.closest<HTMLElement>(
									'[data-math-inline], [data-math-block], [data-mermaid], [data-raw-html], [data-directive-html], [data-yfm-html]',
								)
							: null;
					const position =
						atomicElement === null
							? view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
							: view.posAtDOM(atomicElement, 0);
					const selectedNode =
						position === undefined
							? view.state.selection instanceof NodeSelection &&
								atomicSourceNodeNames.has(view.state.selection.node.type.name)
								? {
										node: view.state.selection.node,
										position: view.state.selection.from,
									}
								: undefined
							: findAtomicSourceNode(view.state.doc, position);
					if (selectedNode === undefined) return false;
					event.preventDefault();
					view.dispatch(view.state.tr.setMeta(atomicSourcePluginKey, selectedNode.position));
					return true;
				},
			},
		},
	});
}
