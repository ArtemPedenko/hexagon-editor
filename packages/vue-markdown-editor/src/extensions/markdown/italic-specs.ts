import type {Mark, MarkSpec} from 'prosemirror-model';
import type {ParseSpec} from 'prosemirror-markdown';
import type {MarkdownSerializer} from 'prosemirror-markdown';

import type {ExtensionAuto} from '../../core/extension-builder';

export const italicMarkName = 'em';
export const ItalicAttrs = {Markup: 'data-markup'} as const;
const defaultMarkup = '*';

export const italicMarkSpec: MarkSpec = {
    attrs: {[ItalicAttrs.Markup]: {default: defaultMarkup}},
    parseDOM: [
        {tag: 'i'},
        {getAttrs: (node) => ({[ItalicAttrs.Markup]: node.getAttribute(ItalicAttrs.Markup)}), tag: 'em'},
        {getAttrs: (value) => value === 'italic' && null, style: 'font-style'},
    ],
    toDOM: (mark) => ['em', mark.attrs],
};

export const italicTokenSpec: ParseSpec = {getAttrs: (token) => ({[ItalicAttrs.Markup]: token.markup}), mark: italicMarkName};

export const serializeItalic: Parameters<typeof MarkdownSerializer>[1][string] = {
    close: getMarkup,
    expelEnclosingWhitespace: true,
    mixable: true,
    open: getMarkup,
};

export const ItalicSpecs: ExtensionAuto = (builder) => {
    builder
        .addMarkSpec(italicMarkName, () => italicMarkSpec)
        .addMarkdownTokenParserSpec(italicMarkName, () => italicTokenSpec)
        .addMarkSerializerSpec(italicMarkName, () => serializeItalic);
};

function getMarkup(_: unknown, mark: Mark): string {
    return mark.attrs[ItalicAttrs.Markup] || defaultMarkup;
}
