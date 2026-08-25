import { baseKeymap, lift, selectParentNode } from 'prosemirror-commands';
import { ellipsis, undoInputRule } from 'prosemirror-inputrules';

import type { ExtensionAuto } from '../core/extension-builder';

export interface BaseSchemaOptions {
	paragraphPlaceholder?: string;
}

/** Base schema declarations used by the first Vue preset. */
export const BaseSchema: ExtensionAuto<BaseSchemaOptions> = (builder, options) => {
	builder.addNodeSpec('doc', () => ({ content: 'block+' }));
	builder.addNodeSpec('text', () => ({ group: 'inline' }));
	builder.addNodeSpec('paragraph', () => ({
		attrs: { 'data-line': { default: null } },
		content: 'inline*',
		group: 'block',
		parseDOM: [{ tag: 'p' }],
		toDOM: (node) => ['p', node.attrs['data-line'] === null ? {} : { 'data-line': node.attrs['data-line'] }, 0],
		...(options?.paragraphPlaceholder === undefined ? {} : { placeholder: { content: options.paragraphPlaceholder } }),
	}));
};

export const BaseKeymap: ExtensionAuto = (builder) => {
	builder
		.addKeymap(
			() => ({
				Backspace: undoInputRule,
				'Alt-Shift-Escape': selectParentNode,
				'Mod-BracketLeft': lift,
			}),
			builder.Priority.Lowest,
		)
		.addKeymap(() => baseKeymap, builder.Priority.Lowest);
};

export const BaseInputRules: ExtensionAuto = (builder) => {
	builder.addInputRules(() => ({ rules: [ellipsis] }));
};
