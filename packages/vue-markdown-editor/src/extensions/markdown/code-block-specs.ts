import type {NodeSpec} from 'prosemirror-model';
import type {ParseSpec} from 'prosemirror-markdown';
import type {MarkdownSerializer} from 'prosemirror-markdown';

import type {ExtensionAuto} from '../../core/extension-builder';

export const codeBlockNodeName = 'code_block';
export const CodeBlockAttrs = {
    Lang: 'data-language',
    Line: 'data-line',
    Markup: 'data-markup',
} as const;

export const codeBlockNodeSpec: NodeSpec = {
    attrs: {
        [CodeBlockAttrs.Lang]: {default: ''},
        [CodeBlockAttrs.Line]: {default: null},
        [CodeBlockAttrs.Markup]: {default: '```'},
    },
    code: true,
    content: 'text*',
    group: 'block',
    marks: '',
    parseDOM: [{
        getAttrs: (node) => ({[CodeBlockAttrs.Lang]: getLanguage(node as Element)}),
        preserveWhitespace: 'full',
        tag: 'pre',
    }],
    selectable: true,
    toDOM: ({attrs}) => ['pre', attrs, ['code', 0]],
};

export const codeBlockTokenSpecs: Record<'code_block' | 'fence', ParseSpec> = {
    code_block: {block: codeBlockNodeName, noCloseToken: true},
    fence: {
        block: codeBlockNodeName,
        getAttrs: (token) => ({
            [CodeBlockAttrs.Lang]: token.info.split(/\s+/)[0] ?? '',
            [CodeBlockAttrs.Line]: token.attrGet('data-line'),
            [CodeBlockAttrs.Markup]: token.markup,
        }),
        noCloseToken: true,
    },
};

export const serializeCodeBlock: ConstructorParameters<typeof MarkdownSerializer>[0][string] = (state, node) => {
    const language = node.attrs[CodeBlockAttrs.Lang] as string;
    const fence = getCodeBlockFence(node.attrs[CodeBlockAttrs.Markup] as string, node.textContent);
    state.write(`${fence}${language}\n`);
    state.text(node.textContent, false);
    state.write('\n');
    state.write(fence);
    state.closeBlock(node);
};

export const CodeBlockSpecs: ExtensionAuto = (builder) => {
    builder
        .addNodeSpec(codeBlockNodeName, () => codeBlockNodeSpec)
        .addMarkdownTokenParserSpec('code_block', () => codeBlockTokenSpecs.code_block)
        .addMarkdownTokenParserSpec('fence', () => codeBlockTokenSpecs.fence)
        .addNodeSerializerSpec(codeBlockNodeName, () => serializeCodeBlock)
        .addKeymap(({schema}) => ({
            Tab: (state, dispatch) => {
                const {$anchor, $head} = state.selection;
                if (!$anchor.sameParent($head) || $anchor.parent.type !== schema.nodes[codeBlockNodeName]) return false;
                dispatch?.(state.tr.replaceSelectionWith(state.schema.text('\t')).scrollIntoView());
                return true;
            },
        }));
};

function getLanguage(node: Element): string {
    const explicit = node.getAttribute(CodeBlockAttrs.Lang);
    if (explicit !== null && explicit.length > 0) return explicit;
    const code = node.firstElementChild;
    return code?.nodeName.toLowerCase() === 'code' && code.classList.contains('hljs')
        ? code.classList[1] ?? ''
        : '';
}

function getCodeBlockFence(markup: string, content: string): string {
    const normalized = markup.trim() || '```';
    const character = normalized.startsWith('~') ? '~' : '`';
    const runs = content.match(character === '~' ? /~{3,}/g : /`{3,}/g) ?? [];
    const longest = runs.reduce((maximum, run) => Math.max(maximum, run.length), 0);
    return character.repeat(Math.max(normalized.length, 3, longest + 1));
}
