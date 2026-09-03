import MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import deflist from 'markdown-it-deflist';
import insPlugin from 'markdown-it-ins';
import markPlugin from 'markdown-it-mark';
import subPlugin from 'markdown-it-sub';
import { configureColorMarkdown } from '../extensions/markdown/color';
import { configureBackgroundColorMarkdown } from '../extensions/markdown/background-color';
import type { MarkdownFeatures } from '../public-types';
import type { MarkdownDirectives } from '../directives';

interface RendererEnvironment {
  directiveAttributes?: Array<{ name: string; raw: string }>;
  foldingHeadings?: number[];
  features?: MarkdownFeatures;
}

const htmlEscape = new MarkdownIt().utils.escapeHtml;

function configureMath(markdown: MarkdownIt): void {
  markdown.inline.ruler.after('backticks', 'inline_math', (state, silent) => {
    if (state.src[state.pos] !== '$' || state.src[state.pos + 1] === '$' || isEscaped(state.src, state.pos))
      return false;
    let close = state.pos + 1;
    while (close < state.posMax) {
      close = state.src.indexOf('$', close);
      if (close < 0 || close >= state.posMax) return false;
      if (!isEscaped(state.src, close)) break;
      close += 1;
    }
    if (close <= state.pos + 1 || /\s/.test(state.src[state.pos + 1] ?? '') || /\s/.test(state.src[close - 1] ?? ''))
      return false;
    if (!silent) {
      const token = state.push('inline_math', '', 0);
      token.content = state.src.slice(state.pos + 1, close);
    }
    state.pos = close + 1;
    return true;
  });
  markdown.block.ruler.before('fence', 'math_block', (state, startLine, endLine, silent) => {
    const opening = state.getLines(startLine, startLine + 1, 0, false).trim();
    if (!opening.startsWith('$$')) return false;
    const sameLine = opening.match(/^\$\$\s*(.*?)\s*\$\$$/);
    if (sameLine !== null) {
      if (!silent) {
        const token = state.push('math_block', '', 0);
        token.content = sameLine[1] ?? '';
      }
      state.line = startLine + 1;
      return true;
    }
    if (opening !== '$$') return false;
    let line = startLine + 1;
    while (line < endLine && state.getLines(line, line + 1, 0, false).trim() !== '$$') line += 1;
    if (line === endLine) return false;
    if (!silent) {
      const token = state.push('math_block', '', 0);
      token.content = state.getLines(startLine + 1, line, 0, false).trim();
    }
    if (!silent) state.line = line + 1;
    return true;
  });
}

function configureBlocks(markdown: MarkdownIt): void {
  markdown.block.ruler.before('fence', 'yfm_html_block', (state, startLine, endLine, silent) => {
    if (state.getLines(startLine, startLine + 1, 0, false).trim() !== ':::html') return false;
    let line = startLine + 1;
    while (line < endLine && state.getLines(line, line + 1, 0, false).trim() !== ':::') line += 1;
    if (line === endLine) return false;
    if (!silent) {
      const token = state.push('yfm_html_block', '', 0);
      token.content = state.getLines(startLine + 1, line, 0, false).trim();
    }
    if (!silent) state.line = line + 1;
    return true;
  });
  markdown.block.ruler.before('fence', 'directive', (state, startLine, endLine, silent) => {
    const opening = state.getLines(startLine, startLine + 1, 0, false).trim();
    const match = opening.match(/^:::\s*(\w+)(?:\s+(\{.*\}))?\s*$/);
    if (match === null) return false;
    let line = startLine + 1;
    while (line < endLine && state.getLines(line, line + 1, 0, false).trim() !== ':::') line += 1;
    if (line === endLine) return false;
    if (!silent) {
      const token = state.push('directive', '', 0);
      token.info = `${match[1] ?? 'note'}\u0000${match[2] ?? ''}`;
      token.meta = { rawAttrs: match[2] ?? '' };
      token.attrSet('data-raw-attrs', match[2] ?? '');
      token.content = state.getLines(startLine + 1, line, 0, false).trim();
    }
    state.line = line + 1;
    return true;
  });
}

function configureTokenTransforms(markdown: MarkdownIt): void {
  markdown.core.ruler.after('block', 'mermaid_fences', (state) => {
    for (const token of state.tokens) {
      if (token.type === 'fence' && token.info.trim() === 'mermaid') token.type = 'mermaid';
    }
  });
  markdown.core.ruler.after('inline', 'renderer_extensions', (state) => {
    for (let index = 0; index < state.tokens.length; index += 1) {
      const token = state.tokens[index];
      const inline = state.tokens[index + 1];
      const close = state.tokens[index + 2];
      if (token?.type === 'paragraph_open' && inline?.type === 'inline' && close?.type === 'paragraph_close') {
        const folding = inline.content.match(/^(#{1,6})\+\s+(.+)$/);
        if (folding !== null) {
          token.type = 'heading_open';
          token.tag = `h${folding[1]?.length ?? 1}`;
          token.attrSet('data-folding', 'true');
          inline.content = folding[2] ?? '';
          retokenizeInline(state, inline);
          close.type = 'heading_close';
          close.tag = token.tag;
        }
      }
      if (token?.type === 'heading_open' && inline?.type === 'inline') {
        if (inline.content.startsWith('+ ')) {
          inline.content = inline.content.slice(2);
          token.attrSet('data-folding', 'true');
          retokenizeInline(state, inline);
        }
        const attributes = inline.content.match(/\s+\{([^}]+)\}$/);
        if (attributes !== null) {
          inline.content = inline.content.slice(0, attributes.index);
          retokenizeInline(state, inline);
          for (const attribute of attributes[1]?.split(/\s+/) ?? []) {
            if (attribute.startsWith('#')) token.attrSet('id', attribute.slice(1));
            if (attribute.startsWith('.')) token.attrJoin('class', attribute.slice(1));
          }
        }
      }
      const children = token?.children;
      if (children === null || children === undefined) continue;
      configureInlineTokens(children);
    }
  });
}

function retokenizeInline(
  state: Parameters<Parameters<MarkdownIt['core']['ruler']['after']>[2]>[0],
  token: Token,
): void {
  const children: Token[] = [];
  state.md.inline.parse(token.content, state.md, state.env, children);
  token.children = children;
}

function configureInlineTokens(children: Token[]): void {
  for (let index = 0; index < children.length; index += 1) {
    const token = children[index];
    const suffix = children[index + 1];
    if (token?.type === 'image' && suffix?.type === 'text') {
      const dimensions = suffix.content.match(
        /^\{width=(\d+%?)(?:\s+height=(\d+))?(?:\s+object-fit=(contain|cover|fill|none|scale-down))?}/,
      );
      if (dimensions !== null) {
        token.attrSet('width', dimensions[1] ?? '');
        if (dimensions[2] !== undefined) token.attrSet('height', dimensions[2]);
        if (dimensions[3] !== undefined) token.attrSet('data-image-object-fit', dimensions[3]);
        suffix.content = suffix.content.slice(dimensions[0].length);
      }
    }
    if (token?.type === 'link_close' && suffix?.type === 'text') {
      const attributes = suffix.content.match(/^\s*\{target="_blank" rel="noopener noreferrer"}/);
      if (attributes !== null) {
        for (let openIndex = index - 1; openIndex >= 0; openIndex -= 1) {
          const open = children[openIndex];
          if (open?.type !== 'link_open') continue;
          open.attrSet('target', '_blank');
          open.attrSet('rel', 'noopener noreferrer');
          suffix.content = suffix.content.slice(attributes[0].length);
          break;
        }
      }
    }
  }
}

function configureQuoteLinks(markdown: MarkdownIt): void {
  markdown.core.ruler.after('renderer_extensions', 'quote_links', (state) => {
    for (let index = 0; index < state.tokens.length; index += 1) {
      const open = state.tokens[index];
      const paragraph = state.tokens[index + 1];
      const inline = state.tokens[index + 2];
      const paragraphClose = state.tokens[index + 3];
      if (
        open?.type !== 'blockquote_open' ||
        paragraph?.type !== 'paragraph_open' ||
        inline?.type !== 'inline' ||
        paragraphClose?.type !== 'paragraph_close'
      )
        continue;
      const match = inline.content.match(/^\[([^\]]+)]\(([^)]+)\)\{data-quotelink=true}$/);
      if (match === null) continue;
      const closeIndex = state.tokens.findIndex(
        (candidate, candidateIndex) => candidateIndex > index && candidate.type === 'blockquote_close',
      );
      if (closeIndex < 0) continue;
      open.attrSet('cite', match[2] ?? '');
      open.attrSet('data-content', match[1] ?? '');
      open.attrSet('data-quote-link', '');
      state.tokens.splice(index + 1, 3);
    }
  });
}

function configureRenderer(markdown: MarkdownIt, directives: MarkdownDirectives): void {
  markdown.renderer.rules.inline_math = (tokens, index, _options, environment) =>
    renderMath(tokens[index]?.content ?? '', false, (environment as RendererEnvironment).features);
  markdown.renderer.rules.math_block = (tokens, index, _options, environment) =>
    renderMath(tokens[index]?.content ?? '', true, (environment as RendererEnvironment).features);
  markdown.renderer.rules.mermaid = (tokens, index) =>
    `<div data-mermaid aria-busy="true"><pre>${htmlEscape(tokens[index]?.content ?? '')}</pre></div>\n`;
  markdown.renderer.rules.yfm_html_block = (tokens, index) =>
    `<p data-yfm-html>:::html<br>${htmlEscape(tokens[index]?.content ?? '')}<br>:::</p>\n`;
  markdown.renderer.rules.directive = (tokens, index, _options, environment) => {
    const token = tokens[index];
    const [name = 'note', encodedAttrs = ''] = (token?.info ?? 'note').split('\u0000', 2);
    if (name === 'html') return `${token?.content ?? ''}\n`;
    const headers = (environment as RendererEnvironment).directiveAttributes;
    const headerIndex = headers?.findIndex((header) => header.name === name) ?? -1;
    const header = headerIndex >= 0 ? headers?.splice(headerIndex, 1)[0] : undefined;
    const rawAttrs = header?.raw || encodedAttrs || String(token?.attrGet('data-raw-attrs') ?? '');
    let attrs: Record<string, unknown> = {};
    const plugin = directives[name];
    if (rawAttrs && plugin?.parseAttributes !== undefined) {
      try {
        attrs = plugin.parseAttributes(rawAttrs.slice(1, -1)) as Record<string, unknown>;
      } catch {
        /* safe empty attrs */
      }
    }
    return `<div data-directive="${htmlEscape(name)}" data-directive-attrs="${htmlEscape(encodeURIComponent(JSON.stringify(attrs)))}">${htmlEscape(token?.content ?? '')}</div>\n`;
  };
  markdown.renderer.rules.html_block = (tokens, index) =>
    `<div data-raw-html>${htmlEscape(tokens[index]?.content ?? '')}</div>\n`;
  markdown.renderer.rules.html_inline = (tokens, index) => renderKnownInlineHtml(tokens[index]?.content ?? '');

  const defaultImage = markdown.renderer.rules.image;
  markdown.renderer.rules.image = (tokens, index, options, environment, renderer) => {
    const token = tokens[index];
    const width = token?.attrGet('width');
    const height = token?.attrGet('height');
    const objectFit = token?.attrGet('data-image-object-fit');
    const styles: string[] = [];
    if (width !== null && width !== undefined && /^\d+%?$/.test(width))
      styles.push(`width: ${width.endsWith('%') ? width : `${width}px`}`);
    if (height !== null && height !== undefined && /^\d+$/.test(height)) styles.push(`height: ${height}px`);
    if (objectFit !== null && objectFit !== undefined) styles.push(`object-fit: ${objectFit}`);
    if (styles.length > 0) token?.attrSet('style', styles.join('; '));
    return (
      defaultImage?.(tokens, index, options, environment, renderer) ?? renderer.renderToken(tokens, index, options)
    );
  };

  const defaultHeadingOpen =
    markdown.renderer.rules.heading_open ??
    ((tokens, index, options, _environment, renderer) => renderer.renderToken(tokens, index, options));
  const defaultHeadingClose =
    markdown.renderer.rules.heading_close ??
    ((tokens, index, options, _environment, renderer) => renderer.renderToken(tokens, index, options));
  markdown.renderer.rules.heading_open = (tokens, index, options, environment: RendererEnvironment, renderer) => {
    const token = tokens[index];
    const level = Number(token?.tag.slice(1)) || 1;
    const stack = (environment.foldingHeadings ??= []);
    let result = '';
    while ((stack.at(-1) ?? 0) >= level) {
      stack.pop();
      result += '</details>';
    }
    if (token?.attrGet('data-folding') === 'true') {
      stack.push(level);
      result += '<details data-folding-section open><summary>';
    }
    return result + defaultHeadingOpen(tokens, index, options, environment, renderer);
  };
  markdown.renderer.rules.heading_close = (tokens, index, options, environment: RendererEnvironment, renderer) => {
    const open = tokens[index - 2];
    return (
      defaultHeadingClose(tokens, index, options, environment, renderer) +
      (open?.attrGet('data-folding') === 'true' ? '</summary>' : '')
    );
  };
}

function renderMath(source: string, display: boolean, features: MarkdownFeatures | undefined): string {
  try {
    if (features?.math !== undefined) return features.math.renderToString(source, display);
  } catch {
    return `<${display ? 'pre' : 'span'} data-math-error>${htmlEscape(display ? `$$\n${source}\n$$` : `$${source}$`)}</${display ? 'pre' : 'span'}>`;
  }
  return `<${display ? 'pre' : 'span'} data-math-fallback>${htmlEscape(display ? `$$\n${source}\n$$` : `$${source}$`)}</${display ? 'pre' : 'span'}>`;
}

function renderKnownInlineHtml(source: string): string {
  if (/^<\/?u>$/.test(source)) return source;
  if (source === '</span>') return source;
  const color = source.match(/^<span style="color:\s*([^";<>]+)">$/i)?.[1]?.trim();
  if (color !== undefined && /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\([^;<>]+\)|[a-z]+)$/i.test(color)) {
    return `<span style="color: ${htmlEscape(color)}">`;
  }
  return htmlEscape(source);
}

function isEscaped(source: string, position: number): boolean {
  let slashes = 0;
  for (let index = position - 1; index >= 0 && source[index] === '\\'; index -= 1) slashes += 1;
  return slashes % 2 === 1;
}

function createMarkdownRenderer(directives: MarkdownDirectives = {}): MarkdownIt {
  const markdown = new MarkdownIt('commonmark', { html: true })
    .enable('table')
    .enable('strikethrough')
    .use(deflist)
    .use(markPlugin)
    .use(subPlugin)
    .use(insPlugin);
  configureMath(markdown);
  configureBlocks(markdown);
  configureTokenTransforms(markdown);
  configureQuoteLinks(markdown);
  configureBackgroundColorMarkdown(markdown);
  configureColorMarkdown(markdown);
  configureRenderer(markdown, directives);
  return markdown;
}

export function renderMarkdownContent(
  content: string,
  features: MarkdownFeatures = {},
  directives: MarkdownDirectives = {},
): string {
  const environment: RendererEnvironment = {
    directiveAttributes: [...content.matchAll(/^:::\s*(\w+)(?:\s+(\{.*\}))?\s*$/gm)].map((match) => ({
      name: match[1] ?? 'note',
      raw: match[2] ?? '',
    })),
    features,
  };
  const result = createMarkdownRenderer(directives).render(content, environment);
  const unclosedSections = environment.foldingHeadings?.length ?? 0;
  return result + '</details>'.repeat(unclosedSections);
}
