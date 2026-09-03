import { toggleMark } from 'prosemirror-commands';
import type { MarkType } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';

import type { ExtensionAuto } from '../../core/extension-builder';

import { createMarkdownMarkInputRule } from './bold';
import { ItalicSpecs, italicMarkName } from './italic-specs';

export {
  ItalicAttrs,
  ItalicSpecs,
  italicMarkName,
  italicMarkSpec,
  italicTokenSpec,
  serializeItalic,
} from './italic-specs';

export interface ItalicOptions {
  italicKey?: string | null;
}

export function getItalicType(schema: Parameters<Command>[0]['schema']): MarkType {
  const italic = schema.marks[italicMarkName];
  if (italic === undefined) throw new Error('Italic extension requires an em mark');
  return italic;
}

export const toggleItalic: Command = (state, dispatch, view) =>
  toggleMark(getItalicType(state.schema))(state, dispatch, view);

export const Italic: ExtensionAuto<ItalicOptions> = (builder, options) => {
  builder.use(ItalicSpecs);
  builder.addInputRules(({ schema }) => ({
    rules: [
      createMarkdownMarkInputRule({ close: '*', ignoreBetween: '*', open: '*' }, getItalicType(schema)),
      createMarkdownMarkInputRule({ close: '_', ignoreBetween: '_', open: '_' }, getItalicType(schema)),
    ],
  }));
  if (options?.italicKey !== null && options?.italicKey !== undefined) {
    builder.addKeymap(({ schema }) => ({
      [options.italicKey!]: toggleMark(getItalicType(schema)),
    }));
  }
};
