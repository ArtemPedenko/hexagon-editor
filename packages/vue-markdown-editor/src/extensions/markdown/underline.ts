import insPlugin from 'markdown-it-ins';
import { toggleMark } from 'prosemirror-commands';
import type { MarkSpec, MarkType } from 'prosemirror-model';
import type { ParseSpec } from 'prosemirror-markdown';
import type { MarkdownSerializer } from 'prosemirror-markdown';
import type { Command } from 'prosemirror-state';
import type { ExtensionAuto } from '../../core/extension-builder';
import { createMarkdownMarkInputRule } from './bold';
export const underlineMarkName = 'ins';
export const underlineMarkSpec: MarkSpec = {
	parseDOM: [{ tag: 'ins' }, { tag: 'u' }],
	toDOM: () => ['ins', 0],
};
export const underlineTokenSpec: ParseSpec = { mark: underlineMarkName };
export const serializeUnderline: ConstructorParameters<typeof MarkdownSerializer>[1][string] = {
	close: '++',
	expelEnclosingWhitespace: true,
	mixable: true,
	open: '++',
};
export function getUnderlineType(schema: Parameters<Command>[0]['schema']): MarkType {
	const underline = schema.marks.ins;
	if (!underline) throw new Error('Underline requires ins mark');
	return underline;
}
export const toggleUnderline: Command = (state, dispatch, view) =>
	toggleMark(getUnderlineType(state.schema))(state, dispatch, view);
export const Underline: ExtensionAuto = (builder) =>
	builder
		.configureMd((markdown) => markdown.use(insPlugin))
		.addMarkSpec(underlineMarkName, () => underlineMarkSpec)
		.addMarkdownTokenParserSpec(underlineMarkName, () => underlineTokenSpec)
		.addMarkSerializerSpec(underlineMarkName, () => serializeUnderline)
		.addInputRules(({ schema }) => ({
			rules: [createMarkdownMarkInputRule({ close: '++', ignoreBetween: '+', open: '++' }, getUnderlineType(schema))],
		}));
