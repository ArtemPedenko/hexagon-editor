import markPlugin from 'markdown-it-mark';
import { toggleMark } from 'prosemirror-commands';
import type { MarkSpec, MarkType } from 'prosemirror-model';
import type { ParseSpec } from 'prosemirror-markdown';
import type { MarkdownSerializer } from 'prosemirror-markdown';
import type { Command } from 'prosemirror-state';

import type { ExtensionAuto } from '../../core/extension-builder';

import { createMarkdownMarkInputRule } from './bold';

export const markMarkName = 'mark';
export const markMarkSpec: MarkSpec = {
  parseDOM: [{ tag: 'mark' }],
  toDOM: () => ['mark', 0],
};
export const markTokenSpec: ParseSpec = { mark: markMarkName };
export const serializeMark: ConstructorParameters<typeof MarkdownSerializer>[1][string] = {
  close: '==',
  expelEnclosingWhitespace: true,
  mixable: true,
  open: '==',
};

export function getMarkType(schema: Parameters<Command>[0]['schema']): MarkType {
  const mark = schema.marks[markMarkName];
  if (mark === undefined) throw new Error('Mark extension requires a mark mark');
  return mark;
}

export const toggleHighlight: Command = (state, dispatch, view) =>
  toggleMark(getMarkType(state.schema))(state, dispatch, view);

export const Mark: ExtensionAuto = (builder) => {
  builder
    .configureMd((markdown) => markdown.use(markPlugin))
    .addMarkSpec(markMarkName, () => markMarkSpec)
    .addMarkdownTokenParserSpec(markMarkName, () => markTokenSpec)
    .addMarkSerializerSpec(markMarkName, () => serializeMark)
    .addInputRules(({ schema }) => ({
      rules: [createMarkdownMarkInputRule({ close: '==', ignoreBetween: '=', open: '==' }, getMarkType(schema))],
    }));
};
