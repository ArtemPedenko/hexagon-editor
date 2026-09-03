import type MarkdownIt from 'markdown-it';
import type { NodeSpec } from 'prosemirror-model';
import type { ParseSpec } from 'prosemirror-markdown';
import type { MarkdownSerializer } from 'prosemirror-markdown';
import { EditorState } from 'prosemirror-state';
import type { Command } from 'prosemirror-state';

import type { ExtensionAuto } from '../../core/extension-builder';

export const yfmHtmlBlockNodeName = 'yfm_html_block';
export const yfmHtmlBlockActionName = 'createYfmHtmlBlock';
export const defaultYfmHtml = '<div>YFM HTML</div>';

export interface YfmHtmlBlockActionContext {
  dispatch?: Parameters<Command>[1];
  state: EditorState;
}

/** Parses local YFM HTML directives without bundling the Diplodoc HTML runtime. */
export function configureYfmHtmlBlockMarkdown(markdown: MarkdownIt): MarkdownIt {
  markdown.block.ruler.before('fence', yfmHtmlBlockNodeName, (state, startLine, endLine, silent) => {
    if (state.getLines(startLine, startLine + 1, 0, false).trim() !== ':::html') return false;
    let line = startLine + 1;
    while (line < endLine && state.getLines(line, line + 1, 0, false).trim() !== ':::') line += 1;
    if (line === endLine) return false;
    if (!silent) {
      const token = state.push(yfmHtmlBlockNodeName, '', 0);
      token.content = state.getLines(startLine + 1, line, 0, false).trim();
    }
    state.line = line + 1;
    return true;
  });
  return markdown;
}

export const yfmHtmlBlockNodeSpec: NodeSpec = {
  atom: true,
  attrs: { html: { default: '' } },
  group: 'block',
  selectable: true,
  toDOM: (node) => ['div', { 'data-yfm-html': '' }, node.attrs.html],
};

export function createYfmHtmlBlockNodeSpec(render: (html: string) => HTMLElement): NodeSpec {
  return { ...yfmHtmlBlockNodeSpec, toDOM: (node) => render(node.attrs.html) };
}

export const yfmHtmlBlockTokenSpec: ParseSpec = {
  getAttrs: (token) => ({ html: token.content }),
  node: yfmHtmlBlockNodeName,
};

export const serializeYfmHtmlBlock: ConstructorParameters<typeof MarkdownSerializer>[0][string] = (state, node) => {
  state.write(`:::html\n${node.attrs.html}\n:::`);
  state.closeBlock(node);
};

export const insertYfmHtmlBlock: Command = (state, dispatch) => {
  const type = state.schema.nodes[yfmHtmlBlockNodeName];
  if (type === undefined || !state.selection.empty) return false;
  const node = type.isTextblock
    ? type.create({ html: defaultYfmHtml }, state.schema.text(`:::html\n${defaultYfmHtml}\n:::`))
    : type.create({ html: defaultYfmHtml });
  dispatch?.(state.tr.replaceSelectionWith(node).scrollIntoView());
  return true;
};

function isYfmHtmlBlockActionContext(value: unknown): value is YfmHtmlBlockActionContext {
  return typeof value === 'object' && value !== null && 'state' in value && value.state instanceof EditorState;
}

export const YfmHtmlBlock: ExtensionAuto = (builder) => {
  builder
    .configureMd(configureYfmHtmlBlockMarkdown)
    .addNodeSpec(yfmHtmlBlockNodeName, () => yfmHtmlBlockNodeSpec)
    .addMarkdownTokenParserSpec(yfmHtmlBlockNodeName, () => yfmHtmlBlockTokenSpec)
    .addNodeSerializerSpec(yfmHtmlBlockNodeName, () => serializeYfmHtmlBlock)
    .addAction(yfmHtmlBlockActionName, () => ({
      isActive: () => false,
      isEnabled: (context?: unknown) => isYfmHtmlBlockActionContext(context) && insertYfmHtmlBlock(context.state),
      metadata: () => undefined,
      run: (context?: unknown) => {
        if (isYfmHtmlBlockActionContext(context)) insertYfmHtmlBlock(context.state, context.dispatch);
      },
    }));
};
