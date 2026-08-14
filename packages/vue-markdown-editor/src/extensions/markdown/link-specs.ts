import type {Mark, MarkSpec, Node} from 'prosemirror-model';
import type {ParseSpec} from 'prosemirror-markdown';
import type {MarkdownSerializer} from 'prosemirror-markdown';
import type MarkdownIt from 'markdown-it';

import type {ExtensionAuto} from '../../core/extension-builder';

export const linkMarkName = 'link';
export const LinkAttr = {
    Href: 'href',
    IsPlaceholder: 'is-placeholder',
    Rel: 'rel',
    RawLink: 'raw-link',
    Target: 'target',
    Title: 'title',
} as const;

export const linkMarkSpec: MarkSpec = {
    attrs: {
        [LinkAttr.Href]: {},
        [LinkAttr.IsPlaceholder]: {default: false},
        [LinkAttr.Rel]: {default: null},
        [LinkAttr.RawLink]: {default: false},
        [LinkAttr.Target]: {default: null},
        [LinkAttr.Title]: {default: null},
    },
    inclusive: false,
    parseDOM: [{
        getAttrs: (node) => ({
            [LinkAttr.Href]: (node as Element).getAttribute(LinkAttr.Href),
            [LinkAttr.Rel]: (node as Element).getAttribute(LinkAttr.Rel),
            [LinkAttr.Target]: (node as Element).getAttribute(LinkAttr.Target),
            [LinkAttr.Title]: (node as Element).getAttribute(LinkAttr.Title),
        }),
        tag: 'a[href]',
    }],
    toDOM: (mark) => ['a', {
        href: mark.attrs[LinkAttr.Href],
        rel: mark.attrs[LinkAttr.Rel],
        target: mark.attrs[LinkAttr.Target],
        title: mark.attrs[LinkAttr.Title],
        'data-link-tooltip': mark.attrs[LinkAttr.Href],
    }, 0],
};

export const linkTokenSpec: ParseSpec = {
    getAttrs: (token) => ({
        [LinkAttr.Href]: token.attrGet('href'),
        [LinkAttr.Rel]: token.attrGet('rel'),
        [LinkAttr.Target]: token.attrGet('target'),
        [LinkAttr.Title]: token.attrGet('title') || null,
    }),
    mark: linkMarkName,
};

export const serializeLink: ConstructorParameters<typeof MarkdownSerializer>[1][string] = {
    close: (state, mark) => {
        if (state.inAutolink) {
            state.inAutolink = undefined;
            return mark.attrs[LinkAttr.RawLink] ? '' : '>';
        }
        state.inAutolink = undefined;
        const external = mark.attrs[LinkAttr.Target] === '_blank' ? ' {target="_blank" rel="noopener noreferrer"}' : '';
        return `](${escapeParentheses(mark.attrs[LinkAttr.Href] as string)}${mark.attrs[LinkAttr.Title] ? ` ${state.quote(mark.attrs[LinkAttr.Title] as string)}` : ''})${external}`;
    },
    open: (state, mark, parent, index) => {
        state.inAutolink = isPlainUrl(mark, parent, index, 1);
        if (state.inAutolink) return mark.attrs[LinkAttr.RawLink] ? '' : '<';
        return '[';
    },
};

export function configureLinkMarkdown(markdown: MarkdownIt): MarkdownIt {
    markdown.core.ruler.after('inline', 'link_attributes', (state) => {
        for (const blockToken of state.tokens) {
            const children = blockToken.children;
            if (children === null) continue;
            for (let index = 0; index < children.length - 1; index += 1) {
                if (children[index]?.type !== 'link_close' || children[index + 1]?.type !== 'text') continue;
                const trailing = children[index + 1]!;
                const attributeMatch = trailing.content.match(/^\s*\{target="_blank" rel="noopener noreferrer"}/);
                if (attributeMatch === null) continue;
                for (let openIndex = index - 1; openIndex >= 0; openIndex -= 1) {
                    const open = children[openIndex];
                    if (open?.type !== 'link_open') continue;
                    open.attrSet('target', '_blank');
                    open.attrSet('rel', 'noopener noreferrer');
                    trailing.content = trailing.content.slice(attributeMatch[0].length);
                    break;
                }
            }
        }
    });
    return markdown;
}

export const LinkSpecs: ExtensionAuto = (builder) => {
    builder
        .configureMd(configureLinkMarkdown)
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
