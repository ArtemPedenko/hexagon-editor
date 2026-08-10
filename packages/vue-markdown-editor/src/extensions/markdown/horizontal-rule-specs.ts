import type {NodeSpec} from 'prosemirror-model';
import type {ParseSpec} from 'prosemirror-markdown';
import type {MarkdownSerializer} from 'prosemirror-markdown';

import type {ExtensionAuto} from '../../core/extension-builder';

export const horizontalRuleNodeName = 'horizontal_rule';
export const horizontalRuleMarkupAttr = 'markup';

export const horizontalRuleNodeSpec: NodeSpec = {
    attrs: {[horizontalRuleMarkupAttr]: {default: '---'}},
    group: 'block',
    parseDOM: [{tag: 'hr'}],
    selectable: true,
    toDOM: () => ['div', ['hr']],
};

export const horizontalRuleTokenSpec: ParseSpec = {
    getAttrs: (token) => ({[horizontalRuleMarkupAttr]: token.markup}),
    node: horizontalRuleNodeName,
};

export const serializeHorizontalRule: Parameters<typeof MarkdownSerializer>[0][string] = (state, node) => {
    state.write(node.attrs[horizontalRuleMarkupAttr] as string);
    state.closeBlock(node);
};

export const HorizontalRuleSpecs: ExtensionAuto = (builder) => {
    builder
        .addNodeSpec(horizontalRuleNodeName, () => horizontalRuleNodeSpec)
        .addMarkdownTokenParserSpec('hr', () => horizontalRuleTokenSpec)
        .addNodeSerializerSpec(horizontalRuleNodeName, () => serializeHorizontalRule);
};
