import type {NodeSpec} from 'prosemirror-model';
import type {ParseSpec} from 'prosemirror-markdown';
import type {MarkdownSerializer} from 'prosemirror-markdown';

import type {ExtensionAuto} from '../../core/extension-builder';

export const blockquoteNodeName = 'blockquote';

export const blockquoteNodeSpec: NodeSpec = {
    content: 'block+',
    defining: true,
    group: 'block',
    parseDOM: [{tag: 'blockquote'}],
    selectable: true,
    selectAll: 'node',
    toDOM: () => ['blockquote', 0],
};

export const blockquoteTokenSpec: ParseSpec = {block: blockquoteNodeName};

export const serializeBlockquote: Parameters<typeof MarkdownSerializer>[0][string] = (state, node) => {
    state.wrapBlock('> ', null, node, () => state.renderContent(node));
};

/** Schema and Markdown registrations shared by the Blockquote extension and the visual codec. */
export const BlockquoteSpecs: ExtensionAuto = (builder) => {
    builder
        .addNodeSpec(blockquoteNodeName, () => blockquoteNodeSpec)
        .addMarkdownTokenParserSpec(blockquoteNodeName, () => blockquoteTokenSpec)
        .addNodeSerializerSpec(blockquoteNodeName, () => serializeBlockquote);
};

declare module 'prosemirror-model' {
    interface NodeSpec {
        selectAll?: false | 'content' | 'node' | undefined;
    }
}
