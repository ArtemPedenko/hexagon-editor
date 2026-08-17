import type {NodeSpec} from 'prosemirror-model';
import type {ParseSpec} from 'prosemirror-markdown';
import type {MarkdownSerializer} from 'prosemirror-markdown';

import type {ExtensionAuto} from '../../core/extension-builder';

export enum HtmlNode {
    Block = 'html_block',
    Inline = 'html_inline',
}

export const HtmlAttr = {Content: 'html-content'} as const;

export const htmlNodeSpecs: Record<HtmlNode, NodeSpec> = {
    [HtmlNode.Block]: {
        atom: true,
        attrs: {[HtmlAttr.Content]: {}},
        group: 'block',
        parseDOM: [{
            getAttrs: (node) => ({[HtmlAttr.Content]: (node as HTMLElement).getAttribute('data-html-raw') ?? (node as HTMLElement).innerHTML}),
            tag: '[data-html]',
        }],
        toDOM: (node) => ['div', {
            'data-html': '',
            'data-html-raw': node.attrs[HtmlAttr.Content],
            'data-raw-html': '',
            contenteditable: 'false',
        }, node.attrs[HtmlAttr.Content]],
    },
    [HtmlNode.Inline]: {
        atom: true,
        attrs: {[HtmlAttr.Content]: {}},
        group: 'inline',
        inline: true,
        parseDOM: [{getAttrs: (node) => ({[HtmlAttr.Content]: (node as HTMLElement).textContent}), tag: 'span[data-html]'}],
        toDOM: (node) => ['span', {'data-html': '', contenteditable: 'false'}, node.attrs[HtmlAttr.Content]],
    },
};

export const htmlTokenSpecs: Record<HtmlNode, ParseSpec> = {
    [HtmlNode.Block]: {getAttrs: (token) => ({[HtmlAttr.Content]: token.content}), noCloseToken: true, node: HtmlNode.Block},
    [HtmlNode.Inline]: {getAttrs: (token) => ({[HtmlAttr.Content]: token.content}), noCloseToken: true, node: HtmlNode.Inline},
};

export const htmlSerializerNodes: Record<HtmlNode, ConstructorParameters<typeof MarkdownSerializer>[0][string]> = {
    [HtmlNode.Block]: (state, node) => {
        state.write(node.attrs[HtmlAttr.Content] as string);
        state.ensureNewLine();
        state.closeBlock(node);
    },
    [HtmlNode.Inline]: (state, node) => state.write(node.attrs[HtmlAttr.Content] as string),
};

export const Html: ExtensionAuto = (builder) => {
    for (const node of Object.values(HtmlNode)) {
        builder.addNodeSpec(node, () => htmlNodeSpecs[node]);
        builder.addMarkdownTokenParserSpec(node, () => htmlTokenSpecs[node]);
        builder.addNodeSerializerSpec(node, () => htmlSerializerNodes[node]);
    }
};
