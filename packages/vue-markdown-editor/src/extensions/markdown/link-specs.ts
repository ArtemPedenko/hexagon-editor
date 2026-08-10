import type {Mark, MarkSpec, Node} from 'prosemirror-model';
import type {ParseSpec} from 'prosemirror-markdown';
import type {MarkdownSerializer} from 'prosemirror-markdown';

import type {ExtensionAuto} from '../../core/extension-builder';

export const linkMarkName = 'link';
export const LinkAttr = {
    Href: 'href',
    IsPlaceholder: 'is-placeholder',
    RawLink: 'raw-link',
    Title: 'title',
} as const;

export const linkMarkSpec: MarkSpec = {
    attrs: {
        [LinkAttr.Href]: {},
        [LinkAttr.IsPlaceholder]: {default: false},
        [LinkAttr.RawLink]: {default: false},
        [LinkAttr.Title]: {default: null},
    },
    inclusive: false,
    parseDOM: [{
        getAttrs: (node) => ({
            [LinkAttr.Href]: (node as Element).getAttribute(LinkAttr.Href),
            [LinkAttr.Title]: (node as Element).getAttribute(LinkAttr.Title),
        }),
        tag: 'a[href]',
    }],
    toDOM: (mark) => ['a', mark.attrs],
};

export const linkTokenSpec: ParseSpec = {
    getAttrs: (token) => ({[LinkAttr.Href]: token.attrGet('href'), [LinkAttr.Title]: token.attrGet('title') || null}),
    mark: linkMarkName,
};

export const serializeLink: Parameters<typeof MarkdownSerializer>[1][string] = {
    close: (state, mark) => {
        if (state.inAutolink) {
            state.inAutolink = undefined;
            return mark.attrs[LinkAttr.RawLink] ? '' : '>';
        }
        state.inAutolink = undefined;
        return `](${escapeParentheses(mark.attrs[LinkAttr.Href] as string)}${mark.attrs[LinkAttr.Title] ? ` ${state.quote(mark.attrs[LinkAttr.Title] as string)}` : ''})`;
    },
    open: (state, mark, parent, index) => {
        state.inAutolink = isPlainUrl(mark, parent, index, 1);
        if (state.inAutolink) return mark.attrs[LinkAttr.RawLink] ? '' : '<';
        return '[';
    },
};

export const LinkSpecs: ExtensionAuto = (builder) => {
    builder
        .addMarkSpec(linkMarkName, () => linkMarkSpec, builder.Priority.High)
        .addMarkdownTokenParserSpec(linkMarkName, () => linkTokenSpec)
        .addMarkSerializerSpec(linkMarkName, () => serializeLink);
};

function escapeParentheses(url: string): string {
    return url.replaceAll(/[()]/g, (character) => `\\${character}`);
}

function isPlainUrl(link: Mark, parent: Node, index: number, side: number): boolean {
    if (link.attrs[LinkAttr.Title] || !/^\w+:/.test(link.attrs[LinkAttr.Href] as string)) return false;
    const content = parent.child(index + (side < 0 ? -1 : 0));
    if (!content.isText || content.text !== link.attrs[LinkAttr.Href] || content.marks.at(-1) !== link) return false;
    if (index === (side < 0 ? 1 : parent.childCount - 1)) return true;
    return !link.isInSet(parent.child(index + (side < 0 ? -2 : 1)).marks);
}
