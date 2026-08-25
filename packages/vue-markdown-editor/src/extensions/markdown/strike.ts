import { toggleMark } from 'prosemirror-commands';
import type { MarkSpec, MarkType } from 'prosemirror-model';
import type { ParseSpec } from 'prosemirror-markdown';
import type { MarkdownSerializer } from 'prosemirror-markdown';
import type { Command } from 'prosemirror-state';
import type { ExtensionAuto } from '../../core/extension-builder';
import { createMarkdownMarkInputRule } from './bold';
export const strikeMarkName = 'strike';
export const strikeMarkSpec: MarkSpec = {
	parseDOM: [{ tag: 'strike' }, { tag: 's' }],
	toDOM: () => ['strike', 0],
};
export const strikeTokenSpec: ParseSpec = { mark: strikeMarkName };
export const serializeStrike: ConstructorParameters<typeof MarkdownSerializer>[1][string] = {
	close: '~~',
	expelEnclosingWhitespace: true,
	mixable: true,
	open: '~~',
};
export function getStrikeType(schema: Parameters<Command>[0]['schema']): MarkType {
	const strike = schema.marks[strikeMarkName];
	if (strike === undefined) throw new Error('Strike extension requires a strike mark');
	return strike;
}
export const toggleStrike: Command = (state, dispatch, view) =>
	toggleMark(getStrikeType(state.schema))(state, dispatch, view);
export const Strike: ExtensionAuto = (builder) =>
	builder
		.configureMd((markdown) => markdown.enable('strikethrough'))
		.addMarkSpec(strikeMarkName, () => strikeMarkSpec)
		.addMarkdownTokenParserSpec('s', () => strikeTokenSpec)
		.addMarkSerializerSpec(strikeMarkName, () => serializeStrike)
		.addInputRules(({ schema }) => ({
			rules: [createMarkdownMarkInputRule({ close: '~~', ignoreBetween: '~', open: '~~' }, getStrikeType(schema))],
		}));
