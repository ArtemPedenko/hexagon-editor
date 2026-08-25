import codemark from 'prosemirror-codemark';
import { toggleMark } from 'prosemirror-commands';
import { Plugin } from 'prosemirror-state';
import type { MarkType } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';

import type { ExtensionAuto } from '../../core/extension-builder';

import { CodeSpecs, codeMarkName } from './code-specs';

import './code.css';

export { CodeSpecs, codeMarkName, codeMarkSpec, codeTokenSpec, serializeCode } from './code-specs';

export interface CodeOptions {
	codeKey?: string | null;
}

export function getCodeType(schema: Parameters<Command>[0]['schema']): MarkType {
	const code = schema.marks[codeMarkName];
	if (code === undefined) throw new Error('Code extension requires a code mark');
	return code;
}

export const toggleCode: Command = (state, dispatch, view) =>
	toggleMark(getCodeType(state.schema))(state, dispatch, view);

export const Code: ExtensionAuto<CodeOptions> = (builder, options) => {
	builder.use(CodeSpecs);
	if (options?.codeKey !== null && options?.codeKey !== undefined) {
		builder.addKeymap(({ schema }) => ({
			[options.codeKey!]: toggleMark(getCodeType(schema)),
		}));
	}
	builder
		.addPlugin(({ schema }) => codemark({ markType: getCodeType(schema) }))
		.addPlugin(
			() =>
				new Plugin({
					props: {
						handleTextInput: (view, from, to, text) => {
							const { $anchor } = view.state.selection;
							if (!$anchor.nodeBefore?.text?.endsWith('`') || !$anchor.nodeAfter?.text?.startsWith('`')) {
								return false;
							}
							view.dispatch(
								view.state.tr.replaceRangeWith(
									from - 1,
									to + 1,
									view.state.schema.text(text, [getCodeType(view.state.schema).create()]),
								),
							);
							return true;
						},
					},
				}),
		);
};
