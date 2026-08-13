import deflist from 'markdown-it-deflist';
import type {NodeSpec} from 'prosemirror-model';
import type {ParseSpec} from 'prosemirror-markdown';
import type {MarkdownSerializer} from 'prosemirror-markdown';

import type {ExtensionAuto} from '../../core/extension-builder';

export enum DeflistNode {
    List = 'dl',
    Term = 'dt',
    Desc = 'dd',
}

export const DeflistAttr = {Line: 'data-line'} as const;

export const deflistNodeSpecs: Record<DeflistNode, NodeSpec> = {
    [DeflistNode.List]: {
        content: '(dt dd)+',
        group: 'block',
        parseDOM: [{tag: 'dl'}],
        selectable: true,
        toDOM: () => ['dl', 0],
    },
    [DeflistNode.Term]: {
        attrs: {[DeflistAttr.Line]: {default: null}},
        content: 'inline*',
        defining: true,
        group: 'block',
        parseDOM: [{tag: 'dt'}],
        selectable: false,
        toDOM: (node) => ['dt', node.attrs, 0],
    },
    [DeflistNode.Desc]: {
        content: 'block+',
        defining: true,
        group: 'block',
        parseDOM: [{tag: 'dd'}],
        selectable: false,
        toDOM: () => ['dd', 0],
    },
};

export const deflistTokenSpecs: Record<DeflistNode, ParseSpec> = {
    [DeflistNode.List]: {block: DeflistNode.List},
    [DeflistNode.Term]: {block: DeflistNode.Term, getAttrs: (token) => ({[DeflistAttr.Line]: token.attrGet(DeflistAttr.Line)})},
    [DeflistNode.Desc]: {block: DeflistNode.Desc},
};

export const deflistSerializerNodes: Record<DeflistNode, ConstructorParameters<typeof MarkdownSerializer>[0][string]> = {
    [DeflistNode.List]: (state, node) => state.renderContent(node),
    [DeflistNode.Term]: (state, node) => {
        state.renderInline(node);
        state.ensureNewLine();
    },
    [DeflistNode.Desc]: (state, node) => {
        state.wrapBlock('  ', ': ', node, () => state.renderContent(node));
    },
};

export const DeflistSpecs: ExtensionAuto = (builder) => {
    builder.configureMd((markdown) => markdown.use(deflist));
    for (const node of Object.values(DeflistNode)) {
        builder.addNodeSpec(node, () => deflistNodeSpecs[node]);
        builder.addMarkdownTokenParserSpec(node, () => deflistTokenSpecs[node]);
        builder.addNodeSerializerSpec(node, () => deflistSerializerNodes[node]);
    }
};
