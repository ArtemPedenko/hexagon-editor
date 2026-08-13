import type {NodeSpec} from 'prosemirror-model';
import type {ParseSpec} from 'prosemirror-markdown';
import type {MarkdownSerializer} from 'prosemirror-markdown';

import type {ExtensionAuto} from '../../core/extension-builder';

export const headingNodeName = 'heading';
export const headingLevelAttr = 'level';
export const headingLineNumberAttr = 'data-line';

export const headingNodeSpec: NodeSpec = {
    attrs: {[headingLevelAttr]: {default: 1}, [headingLineNumberAttr]: {default: null}},
    content: '(text | inline)*',
    defining: true,
    group: 'block',
    parseDOM: [1, 2, 3, 4, 5, 6].map((level) => ({attrs: {[headingLevelAttr]: level}, tag: `h${level}`})),
    toDOM: (node) => [
        `h${node.attrs[headingLevelAttr]}`,
        node.attrs[headingLineNumberAttr] === null ? {} : {[headingLineNumberAttr]: node.attrs[headingLineNumberAttr]},
        0,
    ],
};

export const headingTokenSpec: ParseSpec = {
    block: headingNodeName,
    getAttrs: (token) => ({[headingLevelAttr]: Number(token.tag.slice(1))}),
};

export const serializeHeading: ConstructorParameters<typeof MarkdownSerializer>[0][string] = (state, node) => {
    state.write(`${state.repeat('#', node.attrs[headingLevelAttr] as number)} `);
    state.renderInline(node);
    state.closeBlock(node);
};

export const HeadingSpecs: ExtensionAuto = (builder) => {
    builder
        .addNodeSpec(headingNodeName, () => headingNodeSpec)
        .addMarkdownTokenParserSpec(headingNodeName, () => headingTokenSpec)
        .addNodeSerializerSpec(headingNodeName, () => serializeHeading);
};
