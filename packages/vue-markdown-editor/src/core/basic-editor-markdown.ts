import MarkdownIt from 'markdown-it';
import deflist from 'markdown-it-deflist';
import insPlugin from 'markdown-it-ins';
import markPlugin from 'markdown-it-mark';
import subPlugin from 'markdown-it-sub';
import { Schema } from 'prosemirror-model';
import type { Mark, MarkSpec, Node as ProseMirrorNode, NodeSpec } from 'prosemirror-model';
import type { MarkdownSerializerState, ParseSpec } from 'prosemirror-markdown';

import { colorMarkSpec, colorTokenSpec, configureColorMarkdown } from '../extensions/markdown/color';
import {
  backgroundColorMarkSpec,
  backgroundColorTokenSpec,
  configureBackgroundColorMarkdown,
} from '../extensions/markdown/background-color';

import {
  configureMathMarkdown,
  mathNodeSpecs,
  mathSerializerNodes,
  mathTokenSpecs,
} from '../extensions/additional/math';
import {
  configureMermaidMarkdown,
  mermaidNodeSpec,
  mermaidTokenSpec,
  serializeMermaid,
} from '../extensions/additional/mermaid';
import {
  configureQuoteLinkMarkdown,
  quoteLinkNodeSpec,
  quoteLinkTokenSpec,
  serializeQuoteLink,
} from '../extensions/additional/quote-link';
import { configureYfmHtmlBlockMarkdown } from '../extensions/additional/yfm-html-block';
import { blockquoteNodeSpec, blockquoteTokenSpec, serializeBlockquote } from '../extensions/markdown/blockquote';
import { boldMarkSpec, boldTokenSpec, serializeBold } from '../extensions/markdown/bold';
import {
  breakTokenSpecs,
  hardBreakNodeSpec,
  serializeHardBreak,
  serializeSoftBreak,
  softBreakNodeSpec,
} from '../extensions/markdown/breaks';
import { codeMarkSpec, codeTokenSpec, serializeCode } from '../extensions/markdown/code';
import { codeBlockNodeSpec, codeBlockTokenSpecs, serializeCodeBlock } from '../extensions/markdown/code-block';
import { deflistNodeSpecs, deflistSerializerNodes, deflistTokenSpecs } from '../extensions/markdown/deflist';
import { htmlNodeSpecs, htmlSerializerNodes, htmlTokenSpecs } from '../extensions/markdown/html';
import {
  horizontalRuleNodeSpec,
  horizontalRuleTokenSpec,
  serializeHorizontalRule,
} from '../extensions/markdown/horizontal-rule';
import { configureImageMarkdown, imageNodeSpec, imageTokenSpec, serializeImage } from '../extensions/markdown/image';
import { italicMarkSpec, italicTokenSpec, serializeItalic } from '../extensions/markdown/italic';
import { configureLinkMarkdown, linkMarkSpec, linkTokenSpec, serializeLink } from '../extensions/markdown/link';
import { listNodeSpecs, listSerializerNodes, listTokenSpecs } from '../extensions/markdown/list-specs';
import { markTokenSpec } from '../extensions/markdown/mark';
import { serializeStrike, strikeMarkSpec, strikeTokenSpec } from '../extensions/markdown/strike';
import { serializeSubscript, subscriptMarkSpec, subscriptTokenSpec } from '../extensions/markdown/subscript';
import { serializeUnderline, underlineMarkSpec, underlineTokenSpec } from '../extensions/markdown/underline';
import { TableNode, tableNodeSpecs, tableSerializerNodes } from '../extensions/markdown/table';

import { ExtensionsManager } from './extensions-manager';
import type { ExtensionBuilder } from './extension-builder';
import { defaultMarkdownSchema, MarkdownCodec } from './markdown';
import type { MarkdownDirectives } from '../directives';

const basicMarks: Record<string, MarkSpec> = {
  ins: underlineMarkSpec,
  sub: subscriptMarkSpec,
  strike: strikeMarkSpec,
  background_color: backgroundColorMarkSpec,
  color: colorMarkSpec,
  mark: {
    parseDOM: [{ tag: 'mark' }, { tag: 'span[data-mark]' }],
    toDOM: () => ['mark', 0],
  },
  strikethrough: {
    parseDOM: [{ tag: 's' }, { tag: 'del' }, { style: 'text-decoration=line-through' }],
    toDOM: () => ['s', 0],
  },
  underline: {
    parseDOM: [{ tag: 'u' }, { style: 'text-decoration=underline' }],
    toDOM: () => ['u', 0],
  },
};

const extendedMarkdownNodes: Record<string, NodeSpec> = {
  ...mathNodeSpecs,
  mermaid: mermaidNodeSpec,
  definition_description: {
    content: 'block+',
    group: 'block',
    toDOM: () => ['dd', 0],
  },
  definition_list: {
    content: 'definition_term definition_description+',
    group: 'block',
    toDOM: () => ['dl', 0],
  },
  definition_term: { content: 'inline*', toDOM: () => ['dt', 0] },
  quote_link: quoteLinkNodeSpec,
  directive: {
    atom: true,
    attrs: {
      attrs: { default: {} },
      content: { default: '' },
      name: { default: 'note' },
      rawAttrs: { default: '' },
      attrsParseFailed: { default: false },
    },
    group: 'block',
    toDOM: (node) => ['pre', { 'data-directive': node.attrs.name }, node.attrs.content],
  },
  raw_html: {
    atom: true,
    attrs: { html: { default: '' } },
    group: 'block',
    toDOM: (node) => ['div', { 'data-raw-html': '' }, node.attrs.html],
  },
  yfm_html_block: {
    attrs: { html: { default: '' } },
    content: 'text*',
    group: 'block',
    toDOM: () => ['p', { 'data-yfm-html': '', style: 'white-space: pre-wrap' }, 0],
  },
};

export const basicMarkdownSchema: Schema = new Schema({
  marks: defaultMarkdownSchema.spec.marks
    .update('code', codeMarkSpec)
    .update('em', italicMarkSpec)
    .update('link', linkMarkSpec)
    .update('strong', boldMarkSpec)
    .append(basicMarks),
  nodes: defaultMarkdownSchema.spec.nodes
    .update('blockquote', blockquoteNodeSpec)
    .update('code_block', codeBlockNodeSpec)
    .update('horizontal_rule', horizontalRuleNodeSpec)
    .update('image', imageNodeSpec)
    .update('hard_break', hardBreakNodeSpec)
    .update('list_item', listNodeSpecs.list_item)
    .update('bullet_list', listNodeSpecs.bullet_list)
    .update('ordered_list', listNodeSpecs.ordered_list)
    .update('heading', {
      attrs: {
        class: { default: null },
        folding: { default: null },
        id: { default: null },
        level: { default: 1 },
      },
      content: 'inline*',
      group: 'block',
      defining: true,
      toDOM: (node) => [`h${node.attrs.level}`, { class: node.attrs.class, id: node.attrs.id }, 0],
    })
    .append({
      soft_break: softBreakNodeSpec,
      ...deflistNodeSpecs,
      ...htmlNodeSpecs,
      ...tableNodeSpecs,
      ...extendedMarkdownNodes,
    }),
});

const tableTokenSpecs: Record<string, ParseSpec> = {
  blockquote: blockquoteTokenSpec,
  background_color: backgroundColorTokenSpec,
  color: colorTokenSpec,
  code_inline: codeTokenSpec,
  ...codeBlockTokenSpecs,
  em: italicTokenSpec,
  hr: horizontalRuleTokenSpec,
  link: linkTokenSpec,
  image: imageTokenSpec,
  mark: markTokenSpec,
  s: strikeTokenSpec,
  sub: subscriptTokenSpec,
  ins: underlineTokenSpec,
  ...breakTokenSpecs,
  strong: boldTokenSpec,
  ...listTokenSpecs,
  ...deflistTokenSpecs,
  ...htmlTokenSpecs,
  directive: {
    node: 'directive',
    getAttrs: (token) => token.meta,
  },
  heading: {
    block: 'heading',
    getAttrs: (token) => ({
      class: token.attrGet('class'),
      folding: token.attrGet('folding') === null ? null : token.attrGet('folding') === 'true',
      id: token.attrGet('id'),
      level: Number(token.tag.slice(1)),
    }),
  },
  ...mathTokenSpecs,
  quote_link: quoteLinkTokenSpec,
  table: { block: 'table' },
  tbody: { block: TableNode.Body },
  td: { block: TableNode.DataCell },
  th: { block: TableNode.HeaderCell },
  thead: { block: TableNode.Head },
  tr: { block: TableNode.Row },
  yfm_html_block: { block: 'yfm_html_block', noCloseToken: true },
};

export function createExtendedMarkdownIt(
  markdown = new MarkdownIt('commonmark', { html: false }),
  directives: MarkdownDirectives = {},
): MarkdownIt {
  markdown.enable('table').use(deflist).use(markPlugin).enable('strikethrough').use(subPlugin).use(insPlugin);
  configureMathMarkdown(markdown);
  configureMermaidMarkdown(markdown);
  configureQuoteLinkMarkdown(markdown);
  configureYfmHtmlBlockMarkdown(markdown);
  configureImageMarkdown(markdown);
  configureLinkMarkdown(markdown);
  configureBackgroundColorMarkdown(markdown);
  configureColorMarkdown(markdown);
  markdown.core.ruler.after('block', 'yfm_html_source', (state) => {
    for (const token of state.tokens) {
      if (token.type === 'yfm_html_block') token.content = `:::html\n${token.content}\n:::`;
    }
  });
  markdown.core.ruler.after('block', 'folding_heading', (state) => {
    for (const [index, token] of state.tokens.entries()) {
      const inline = state.tokens[index + 1];
      const close = state.tokens[index + 2];
      if (token?.type !== 'paragraph_open' || inline?.type !== 'inline' || close?.type !== 'paragraph_close') continue;
      const match = inline.content.match(/^(#{1,6})\+\s+(.+)$/);
      if (match === null) continue;
      const level = match[1]?.length ?? 1;
      token.type = 'heading_open';
      token.tag = `h${level}`;
      token.attrSet('folding', 'false');
      inline.content = match[2] ?? '';
      close.type = 'heading_close';
      close.tag = `h${level}`;
    }
  });
  markdown.core.ruler.after('folding_heading', 'heading_attributes', (state) => {
    for (const [index, token] of state.tokens.entries()) {
      const inline = state.tokens[index + 1];
      if (token?.type !== 'heading_open' || inline?.type !== 'inline') continue;
      if (inline.content.startsWith('+ ')) {
        inline.content = inline.content.slice(2);
        token.attrSet('folding', 'false');
      }
      const match = inline.content.match(/\s+\{([^}]+)\}$/);
      if (match === null) continue;
      inline.content = inline.content.slice(0, match.index);
      for (const attribute of match[1]?.split(/\s+/) ?? []) {
        if (attribute.startsWith('#')) token.attrSet('id', attribute.slice(1));
        if (attribute.startsWith('.')) token.attrSet('class', attribute.slice(1));
      }
    }
  });
  markdown.block.ruler.before('fence', 'directive', (state, startLine, endLine, silent) => {
    const start = state.getLines(startLine, startLine + 1, 0, false).trim();
    const match = start.match(/^:::\s*(\w+)(?:\s+(\{.*\}))?\s*$/);
    if (match === null || start === ':::html') return false;
    let line = startLine + 1;
    while (line < endLine && state.getLines(line, line + 1, 0, false).trim() !== ':::') line += 1;
    if (line === endLine) return false;
    if (!silent) {
      const token = state.push('directive', '', 0);
      token.content = state.getLines(startLine + 1, line, 0, false).trim();
      token.info = match[1] ?? 'note';
      const rawAttrs = match[2] ?? '';
      const plugin = directives[token.info];
      let attrs: Record<string, unknown> = {};
      let attrsParseFailed = false;
      if (rawAttrs && plugin?.parseAttributes !== undefined) {
        try {
          attrs = plugin.parseAttributes(rawAttrs.slice(1, -1)) as Record<string, unknown>;
        } catch {
          attrsParseFailed = true;
        }
      }
      token.meta = { attrs, attrsParseFailed, content: token.content, name: token.info, rawAttrs };
    }
    if (!silent) state.line = line + 1;
    return true;
  });
  return markdown;
}

const basicMarkdownParserExtension =
  (directives: MarkdownDirectives = {}) =>
  (builder: ExtensionBuilder) => {
    builder.configureMd((markdown) => createExtendedMarkdownIt(markdown, directives));
    for (const [name, token] of Object.entries(tableTokenSpecs)) builder.addParserToken(name, token);
    builder.addParserToken('mermaid', mermaidTokenSpec);
  };

const basicMarkdownSerializerNodes = {
  blockquote: serializeBlockquote,
  code_block: serializeCodeBlock,
  hard_break: serializeHardBreak,
  horizontal_rule: serializeHorizontalRule,
  image: serializeImage,
  ...listSerializerNodes,
  definition_description(state: MarkdownSerializerState, node: ProseMirrorNode) {
    state.renderContent(node);
    state.closeBlock(node);
  },
  definition_list(state: MarkdownSerializerState, node: ProseMirrorNode) {
    state.renderContent(node);
    state.closeBlock(node);
  },
  definition_term(state: MarkdownSerializerState, node: ProseMirrorNode) {
    state.renderInline(node);
    state.write('\n: ');
  },
  ...mathSerializerNodes,
  mermaid: serializeMermaid,
  heading(state: MarkdownSerializerState, node: ProseMirrorNode) {
    state.write(`${'#'.repeat(node.attrs.level)}${node.attrs.folding === null ? '' : '+'} `);
    state.renderInline(node);
    const attributes = [
      node.attrs.id === null ? '' : `#${node.attrs.id}`,
      node.attrs.class === null ? '' : `.${node.attrs.class}`,
    ]
      .filter(Boolean)
      .join(' ');
    if (attributes) state.write(` {${attributes}}`);
    state.closeBlock(node);
  },
  raw_html(state: MarkdownSerializerState, node: ProseMirrorNode) {
    state.write(node.attrs.html);
    state.closeBlock(node);
  },
  soft_break: serializeSoftBreak,
  ...deflistSerializerNodes,
  ...htmlSerializerNodes,
  yfm_html_block(state: MarkdownSerializerState, node: ProseMirrorNode) {
    state.write(node.textContent || `:::html\n${node.attrs.html || ''}\n:::`);
    state.closeBlock(node);
  },
  quote_link: serializeQuoteLink,
  ...tableSerializerNodes,
};

const basicMarkdownSerializerMarks = {
  ins: serializeUnderline,
  sub: serializeSubscript,
  strike: serializeStrike,
  code: serializeCode,
  em: serializeItalic,
  link: serializeLink,
  strong: serializeBold,
  background_color: {
    close: ')',
    mixable: true,
    open: (_state: MarkdownSerializerState, mark: Mark) => `{bg-${mark.attrs.color}}(`,
  },
  color: {
    close: ')',
    mixable: true,
    open: (_state: MarkdownSerializerState, mark: Mark) => `{${mark.attrs.color}}(`,
  },
  mark: { close: '==', open: '==' },
  strikethrough: { close: '~~', open: '~~' },
  underline: { close: '++', open: '++' },
};

export function createBasicMarkdownCodec(directives: MarkdownDirectives = {}): MarkdownCodec {
  const parser = ExtensionsManager.process(basicMarkdownParserExtension(directives), {
    baseSchema: basicMarkdownSchema,
    markdown: { html: false },
  }).textParser;
  const serializer = ExtensionsManager.process(
    (builder) => {
      basicMarkdownParserExtension(directives)(builder);
      for (const [name, token] of Object.entries(basicMarkdownSerializerNodes)) builder.addNodeSerializer(name, token);
      builder.addNodeSerializer('directive', (state: MarkdownSerializerState, node: ProseMirrorNode) => {
        const plugin = directives[String(node.attrs.name)];
        let rawAttrs = String(node.attrs.rawAttrs ?? '');
        if (!node.attrs.attrsParseFailed && plugin?.serializeAttributes !== undefined) {
          const serialized = plugin.serializeAttributes(node.attrs.attrs);
          rawAttrs = serialized ? `{${serialized}}` : '';
        }
        state.write(`::: ${node.attrs.name}${rawAttrs ? ` ${rawAttrs}` : ''}\n${node.attrs.content}\n:::`);
        state.closeBlock(node);
      });
      for (const [name, token] of Object.entries(basicMarkdownSerializerMarks)) builder.addMarkSerializer(name, token);
    },
    { baseSchema: basicMarkdownSchema, markdown: { html: false } },
  ).serializer;

  return new MarkdownCodec({ parser, serializer });
}

export const basicMarkdownCodec = createBasicMarkdownCodec();
