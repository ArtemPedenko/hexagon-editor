import type { Mark, MarkSpec } from 'prosemirror-model';
import type { ParseSpec } from 'prosemirror-markdown';
import type { MarkdownSerializer } from 'prosemirror-markdown';

import type { ExtensionAuto } from '../../core/extension-builder';

export const boldMarkName = 'strong';
export const BoldAttrs = { Markup: 'data-markup' } as const;
const defaultMarkup = '**';

export const boldMarkSpec: MarkSpec = {
  attrs: { [BoldAttrs.Markup]: { default: defaultMarkup } },
  parseDOM: [
    { tag: 'b' },
    {
      getAttrs: (node) => ({
        [BoldAttrs.Markup]: node.getAttribute(BoldAttrs.Markup),
      }),
      tag: 'strong',
    },
    {
      getAttrs: (value) => /^(bold(er)?|[5-9]\d{2,})$/.test(value as string) && null,
      style: 'font-weight',
    },
  ],
  toDOM: (mark) => ['strong', mark.attrs],
};

export const boldTokenSpec: ParseSpec = {
  getAttrs: (token) => ({ [BoldAttrs.Markup]: token.markup }),
  mark: boldMarkName,
};

export const serializeBold: ConstructorParameters<typeof MarkdownSerializer>[1][string] = {
  close: getMarkup,
  expelEnclosingWhitespace: true,
  mixable: true,
  open: getMarkup,
};

export const BoldSpecs: ExtensionAuto = (builder) => {
  builder
    .addMarkSpec(boldMarkName, () => boldMarkSpec)
    .addMarkdownTokenParserSpec(boldMarkName, () => boldTokenSpec)
    .addMarkSerializerSpec(boldMarkName, () => serializeBold);
};

function getMarkup(_: unknown, mark: Mark): string {
  return mark.attrs[BoldAttrs.Markup] || defaultMarkup;
}
