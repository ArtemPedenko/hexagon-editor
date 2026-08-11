import MarkdownIt from 'markdown-it';
import deflist from 'markdown-it-deflist';
import insPlugin from 'markdown-it-ins';
import markPlugin from 'markdown-it-mark';
import subPlugin from 'markdown-it-sub';
import {Schema} from 'prosemirror-model';
import type {Mark, MarkSpec, Node as ProseMirrorNode, NodeSpec} from 'prosemirror-model';
import type {MarkdownSerializerState, ParseSpec} from 'prosemirror-markdown';

import {configureMathMarkdown, createMathNodeSpecs, mathSerializerNodes, mathTokenSpecs} from '../extensions/additional/math';
import {configureMermaidMarkdown, createMermaidNodeSpec, mermaidTokenSpec, serializeMermaid} from '../extensions/additional/mermaid';
import {configureQuoteLinkMarkdown, quoteLinkNodeSpec, quoteLinkTokenSpec, serializeQuoteLink} from '../extensions/additional/quote-link';
import {configureYfmHtmlBlockMarkdown, createYfmHtmlBlockNodeSpec, serializeYfmHtmlBlock, yfmHtmlBlockTokenSpec} from '../extensions/additional/yfm-html-block';
import {blockquoteNodeSpec, blockquoteTokenSpec, serializeBlockquote} from '../extensions/markdown/blockquote';
import {boldMarkSpec, boldTokenSpec, serializeBold} from '../extensions/markdown/bold';
import {breakTokenSpecs, hardBreakNodeSpec, serializeHardBreak, serializeSoftBreak, softBreakNodeSpec} from '../extensions/markdown/breaks';
import {codeMarkSpec, codeTokenSpec, serializeCode} from '../extensions/markdown/code';
import {codeBlockNodeSpec, codeBlockTokenSpecs, serializeCodeBlock} from '../extensions/markdown/code-block';
import {deflistNodeSpecs, deflistSerializerNodes, deflistTokenSpecs} from '../extensions/markdown/deflist';
import {htmlNodeSpecs, htmlSerializerNodes, htmlTokenSpecs} from '../extensions/markdown/html';
import {horizontalRuleNodeSpec, horizontalRuleTokenSpec, serializeHorizontalRule} from '../extensions/markdown/horizontal-rule';
import {configureImageMarkdown, imageNodeSpec, imageTokenSpec, serializeImage} from '../extensions/markdown/image';
import {italicMarkSpec, italicTokenSpec, serializeItalic} from '../extensions/markdown/italic';
import {linkMarkSpec, linkTokenSpec, serializeLink} from '../extensions/markdown/link';
import {listNodeSpecs, listSerializerNodes, listTokenSpecs} from '../extensions/markdown/list-specs';
import {markTokenSpec} from '../extensions/markdown/mark';
import {serializeStrike, strikeMarkSpec, strikeTokenSpec} from '../extensions/markdown/strike';
import {serializeSubscript, subscriptMarkSpec, subscriptTokenSpec} from '../extensions/markdown/subscript';
import {serializeUnderline, underlineMarkSpec, underlineTokenSpec} from '../extensions/markdown/underline';
import {TableNode, tableNodeSpecs, tableSerializerNodes} from '../extensions/markdown/table';

import {ExtensionsManager} from './extensions-manager';
import type {ExtensionBuilder} from './extension-builder';
import {defaultMarkdownSchema, MarkdownCodec} from './markdown';
import {renderHtmlBlock, renderOptionalBlock, renderYfmHtml} from './basic-editor-renderers';

const basicMarks: Record<string, MarkSpec> = {
    ins: underlineMarkSpec,
    sub: subscriptMarkSpec,
    strike: strikeMarkSpec,
    color: {attrs: {color: {}}, parseDOM: [{style: 'color', getAttrs: (color) => ({color})}], toDOM: (mark) => ['span', {style: `color: ${mark.attrs.color}`}, 0]},
    mark: {parseDOM: [{tag: 'mark'}, {tag: 'span[data-mark]'}], toDOM: () => ['mark', 0]},
    strikethrough: {parseDOM: [{tag: 's'}, {tag: 'del'}, {style: 'text-decoration=line-through'}], toDOM: () => ['s', 0]},
    underline: {parseDOM: [{tag: 'u'}, {style: 'text-decoration=underline'}], toDOM: () => ['u', 0]},
};

const extendedMarkdownNodes: Record<string, NodeSpec> = {
    ...createMathNodeSpecs((latex, display) => renderOptionalBlock('math', latex, display)),
    mermaid: createMermaidNodeSpec((source) => renderOptionalBlock('mermaid', source)),
    definition_description: {content: 'block+', group: 'block', toDOM: () => ['dd', 0]},
    definition_list: {content: 'definition_term definition_description+', group: 'block', toDOM: () => ['dl', 0]},
    definition_term: {content: 'inline*', toDOM: () => ['dt', 0]},
    quote_link: quoteLinkNodeSpec,
    directive: {atom: true, attrs: {content: {default: ''}, name: {default: 'note'}}, group: 'block', toDOM: (node) => node.attrs.name === 'html' ? renderHtmlBlock(node.attrs.content, 'data-directive-html') : ['div', {'data-directive': node.attrs.name}, node.attrs.content]},
    raw_html: {atom: true, attrs: {html: {default: ''}}, group: 'block', toDOM: (node) => renderHtmlBlock(node.attrs.html, 'data-raw-html')},
    yfm_html_block: createYfmHtmlBlockNodeSpec((html) => renderYfmHtml(html)),
};

export const basicMarkdownSchema = new Schema({
    marks: defaultMarkdownSchema.spec.marks.update('code', codeMarkSpec).update('em', italicMarkSpec).update('link', linkMarkSpec).update('strong', boldMarkSpec).append(basicMarks),
    nodes: defaultMarkdownSchema.spec.nodes
        .update('blockquote', blockquoteNodeSpec).update('code_block', codeBlockNodeSpec).update('horizontal_rule', horizontalRuleNodeSpec).update('image', imageNodeSpec).update('hard_break', hardBreakNodeSpec)
        .update('list_item', listNodeSpecs.list_item).update('bullet_list', listNodeSpecs.bullet_list).update('ordered_list', listNodeSpecs.ordered_list)
        .update('heading', {attrs: {class: {default: null}, folding: {default: null}, id: {default: null}, level: {default: 1}}, content: 'inline*', group: 'block', defining: true, toDOM: (node) => [`h${node.attrs.level}`, {class: node.attrs.class, id: node.attrs.id}, 0]})
        .append({soft_break: softBreakNodeSpec, ...deflistNodeSpecs, ...htmlNodeSpecs, ...tableNodeSpecs, ...extendedMarkdownNodes}),
});

const tableTokenSpecs: Record<string, ParseSpec> = {
    blockquote: blockquoteTokenSpec, code_inline: codeTokenSpec, ...codeBlockTokenSpecs, em: italicTokenSpec, hr: horizontalRuleTokenSpec, link: linkTokenSpec, image: imageTokenSpec, mark: markTokenSpec, s: strikeTokenSpec, sub: subscriptTokenSpec, ins: underlineTokenSpec, ...breakTokenSpecs, strong: boldTokenSpec, ...listTokenSpecs, ...deflistTokenSpecs, ...htmlTokenSpecs,
    directive: {node: 'directive', getAttrs: (token) => ({content: token.content, name: token.info})},
    heading: {block: 'heading', getAttrs: (token) => ({class: token.attrGet('class'), folding: token.attrGet('folding') === null ? null : token.attrGet('folding') === 'true', id: token.attrGet('id'), level: Number(token.tag.slice(1))})},
    ...mathTokenSpecs, quote_link: quoteLinkTokenSpec, table: {block: 'table'}, tbody: {block: TableNode.Body}, td: {block: TableNode.DataCell}, th: {block: TableNode.HeaderCell}, thead: {block: TableNode.Head}, tr: {block: TableNode.Row}, yfm_html_block: yfmHtmlBlockTokenSpec,
};

export function createExtendedMarkdownIt(markdown = new MarkdownIt('commonmark', {html: true})): MarkdownIt {
    markdown.enable('table').use(deflist).use(markPlugin).enable('strikethrough').use(subPlugin).use(insPlugin);
    configureMathMarkdown(markdown); configureMermaidMarkdown(markdown); configureQuoteLinkMarkdown(markdown); configureYfmHtmlBlockMarkdown(markdown); configureImageMarkdown(markdown);
    markdown.core.ruler.after('block', 'folding_heading', (state) => {
        for (const [index, token] of state.tokens.entries()) {
            const inline = state.tokens[index + 1]; const close = state.tokens[index + 2];
            if (token?.type !== 'paragraph_open' || inline?.type !== 'inline' || close?.type !== 'paragraph_close') continue;
            const match = inline.content.match(/^(#{1,6})\+\s+(.+)$/); if (match === null) continue;
            const level = match[1]?.length ?? 1; token.type = 'heading_open'; token.tag = `h${level}`; token.attrSet('folding', 'false'); inline.content = match[2] ?? ''; close.type = 'heading_close'; close.tag = `h${level}`;
        }
    });
    markdown.core.ruler.after('folding_heading', 'heading_attributes', (state) => {
        for (const [index, token] of state.tokens.entries()) {
            const inline = state.tokens[index + 1]; if (token?.type !== 'heading_open' || inline?.type !== 'inline') continue;
            if (inline.content.startsWith('+ ')) { inline.content = inline.content.slice(2); token.attrSet('folding', 'false'); }
            const match = inline.content.match(/\s+\{([^}]+)\}$/); if (match === null) continue;
            inline.content = inline.content.slice(0, match.index);
            for (const attribute of match[1]?.split(/\s+/) ?? []) { if (attribute.startsWith('#')) token.attrSet('id', attribute.slice(1)); if (attribute.startsWith('.')) token.attrSet('class', attribute.slice(1)); }
        }
    });
    markdown.block.ruler.before('fence', 'directive', (state, startLine, endLine, silent) => {
        const start = state.getLines(startLine, startLine + 1, 0, false).trim(); const match = start.match(/^:::\s*(\w+)\s*$/); if (match === null || start === ':::html') return false;
        let line = startLine + 1; while (line < endLine && state.getLines(line, line + 1, 0, false).trim() !== ':::') line += 1; if (line === endLine) return false;
        if (!silent) { const token = state.push('directive', '', 0); token.content = state.getLines(startLine + 1, line, 0, false).trim(); token.info = match[1] ?? 'note'; }
        state.line = line + 1; return true;
    });
    return markdown;
}

const basicMarkdownParserExtension = (builder: ExtensionBuilder) => {
    builder.configureMd(createExtendedMarkdownIt);
    for (const [name, token] of Object.entries(tableTokenSpecs)) builder.addParserToken(name, token);
    builder.addParserToken('mermaid', mermaidTokenSpec);
};

const basicMarkdownParser = ExtensionsManager.process(basicMarkdownParserExtension, {baseSchema: basicMarkdownSchema, markdown: {html: true}}).textParser;

const basicMarkdownSerializerNodes = {
    blockquote: serializeBlockquote, code_block: serializeCodeBlock, hard_break: serializeHardBreak, horizontal_rule: serializeHorizontalRule, image: serializeImage, ...listSerializerNodes,
    definition_description(state: MarkdownSerializerState, node: ProseMirrorNode) { state.renderContent(node); state.closeBlock(node); },
    definition_list(state: MarkdownSerializerState, node: ProseMirrorNode) { state.renderContent(node); state.closeBlock(node); },
    definition_term(state: MarkdownSerializerState, node: ProseMirrorNode) { state.renderInline(node); state.write('\n: '); },
    directive(state: MarkdownSerializerState, node: ProseMirrorNode) { state.write(`::: ${node.attrs.name}\n${node.attrs.content}\n:::`); state.closeBlock(node); },
    ...mathSerializerNodes, mermaid: serializeMermaid,
    heading(state: MarkdownSerializerState, node: ProseMirrorNode) { state.write(`${'#'.repeat(node.attrs.level)}${node.attrs.folding === null ? '' : '+'} `); state.renderInline(node); const attributes = [node.attrs.id === null ? '' : `#${node.attrs.id}`, node.attrs.class === null ? '' : `.${node.attrs.class}`].filter(Boolean).join(' '); if (attributes) state.write(` {${attributes}}`); state.closeBlock(node); },
    raw_html(state: MarkdownSerializerState, node: ProseMirrorNode) { state.write(node.attrs.html); state.closeBlock(node); }, soft_break: serializeSoftBreak, ...deflistSerializerNodes, ...htmlSerializerNodes, yfm_html_block: serializeYfmHtmlBlock, quote_link: serializeQuoteLink, ...tableSerializerNodes,
};

const basicMarkdownSerializerMarks = {
    ins: serializeUnderline, sub: serializeSubscript, strike: serializeStrike, code: serializeCode, em: serializeItalic, link: serializeLink, strong: serializeBold,
    color: {close: '</span>', open: (_state: MarkdownSerializerState, mark: Mark) => `<span style="color: ${mark.attrs.color}">`}, mark: {close: '==', open: '=='}, strikethrough: {close: '~~', open: '~~'}, underline: {close: '</u>', open: '<u>'},
};

const basicMarkdownSerializer = ExtensionsManager.process((builder) => {
    basicMarkdownParserExtension(builder);
    for (const [name, token] of Object.entries(basicMarkdownSerializerNodes)) builder.addNodeSerializer(name, token);
    for (const [name, token] of Object.entries(basicMarkdownSerializerMarks)) builder.addMarkSerializer(name, token);
}, {baseSchema: basicMarkdownSchema, markdown: {html: true}}).serializer;

export const basicMarkdownCodec = new MarkdownCodec({parser: basicMarkdownParser, serializer: basicMarkdownSerializer});
