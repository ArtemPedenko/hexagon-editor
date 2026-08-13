import type MarkdownIt from 'markdown-it';
import type {NodeSpec} from 'prosemirror-model';
import type {ParseSpec} from 'prosemirror-markdown';
import type {MarkdownSerializer} from 'prosemirror-markdown';
import {EditorState} from 'prosemirror-state';
import type {Command} from 'prosemirror-state';

import type {ExtensionAuto} from '../../core/extension-builder';

export const mermaidNodeName = 'mermaid';
export const mermaidActionName = 'createMermaid';
export const defaultMermaidSource = ['sequenceDiagram', '  Alice->>Bob: Hi Bob', '  Bob->>Alice: Hi Alice'].join('\n');

export interface MermaidActionContext {
    dispatch?: Parameters<Command>[1];
    state: EditorState;
}

/** Recognizes Mermaid fences without requiring the optional Diplodoc runtime. */
export function configureMermaidMarkdown(markdown: MarkdownIt): MarkdownIt {
    markdown.core.ruler.after('block', 'mermaid_fences', (state) => {
        for (const token of state.tokens) {
            if (token.type === 'fence' && token.info.trim() === 'mermaid') token.type = mermaidNodeName;
        }
    });
    return markdown;
}

export const mermaidNodeSpec: NodeSpec = {
    atom: true,
    attrs: {source: {default: ''}},
    group: 'block',
    selectable: true,
    toDOM: (node) => ['pre', {'data-mermaid': ''}, node.attrs.source],
};

export function createMermaidNodeSpec(render: (source: string) => HTMLElement): NodeSpec {
    return {...mermaidNodeSpec, toDOM: (node) => render(node.attrs.source)};
}

export const mermaidTokenSpec: ParseSpec = {
    getAttrs: (token) => ({source: token.content}),
    node: mermaidNodeName,
};

export const serializeMermaid: ConstructorParameters<typeof MarkdownSerializer>[0][string] = (state, node) => {
    state.write(`\`\`\`mermaid\n${node.attrs.source}\n\`\`\``);
    state.closeBlock(node);
};

export const insertMermaid: Command = (state, dispatch) => {
    const type = state.schema.nodes[mermaidNodeName];
    if (type === undefined || !state.selection.empty) return false;
    dispatch?.(state.tr.replaceSelectionWith(type.create({source: defaultMermaidSource})).scrollIntoView());
    return true;
};

function isMermaidActionContext(value: unknown): value is MermaidActionContext {
    return typeof value === 'object' && value !== null && 'state' in value && value.state instanceof EditorState;
}

export const Mermaid: ExtensionAuto = (builder) => {
    builder
        .configureMd(configureMermaidMarkdown)
        .addNodeSpec(mermaidNodeName, () => mermaidNodeSpec)
        .addMarkdownTokenParserSpec(mermaidNodeName, () => mermaidTokenSpec)
        .addNodeSerializerSpec(mermaidNodeName, () => serializeMermaid)
        .addAction(mermaidActionName, () => ({
            isActive: () => false,
            isEnabled: (context?: unknown) => isMermaidActionContext(context) && insertMermaid(context.state),
            metadata: () => undefined,
            run: (context?: unknown) => {
                if (isMermaidActionContext(context)) insertMermaid(context.state, context.dispatch);
            },
        }));
};
