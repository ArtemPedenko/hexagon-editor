import { getMarkdownEditorMessages } from '../i18n';
import type { MarkdownEditorLocale, MarkdownFeatures, MermaidEngine } from '../public-types';
import type { NodeViewConstructor } from 'prosemirror-view';

let mermaidDiagramId = 0;
export function renderOptionalBlock(
  kind: 'math' | 'mermaid',
  source: string,
  display = true,
  features: MarkdownFeatures = {},
): HTMLElement {
  const element = document.createElement(kind === 'math' && !display ? 'span' : kind === 'math' ? 'pre' : 'div');
  element.setAttribute(`data-${kind}${kind === 'math' ? (display ? '-block' : '-inline') : ''}`, '');
  if (kind === 'math') {
    const fallback = display ? `$$\n${source}\n$$` : `$${source}$`;
    try {
      element.innerHTML = features.math?.renderToString(source, display) ?? '';
      if (features.math === undefined) element.textContent = fallback;
    } catch {
      element.setAttribute('data-math-error', '');
      const error = document.createElement(display ? 'pre' : 'span');
      error.className = 'markdown-editor__math-error';
      error.textContent = source;
      element.replaceChildren(error);
    }
    localizeMathElement(element, 'en');
  } else {
    element.setAttribute('aria-busy', 'true');
    const fallback = document.createElement('pre');
    fallback.textContent = source;
    element.append(fallback);
    if (features.mermaid !== undefined) void loadAndRenderMermaid(element, source, features.mermaid.load);
  }
  return element;
}

function localizeMathElement(element: HTMLElement, locale: MarkdownEditorLocale): void {
  const messages = getMarkdownEditorMessages(locale);
  element.title = messages.doubleClickToEdit;
  element.setAttribute('aria-label', `${messages.formula}. ${messages.doubleClickToEdit}.`);
}

export function localizeRenderedMath(root: ParentNode, locale: MarkdownEditorLocale): void {
  for (const element of root.querySelectorAll<HTMLElement>('[data-math-inline], [data-math-block]')) {
    localizeMathElement(element, locale);
  }
}

export async function loadAndRenderMermaid(
  element: HTMLElement,
  source: string,
  load: () => Promise<MermaidEngine>,
): Promise<void> {
  try {
    const engine = await load();
    engine.initialize({ securityLevel: 'strict', startOnLoad: false });
    const { bindFunctions, svg } = await engine.render(`markdown-editor-mermaid-${++mermaidDiagramId}`, source);
    if (!element.isConnected) return;
    element.innerHTML = svg;
    element.removeAttribute('aria-busy');
    bindFunctions?.(element);
  } catch {
    element.removeAttribute('aria-busy');
    element.setAttribute('data-mermaid-error', '');
  }
}

export function renderYfmHtml(source: string, features: MarkdownFeatures = {}): HTMLElement {
  if (features.html !== undefined) return features.html(source);
  const element = document.createElement('pre');
  element.setAttribute('data-yfm-html', '');
  element.textContent = source;
  return element;
}

function renderHtmlSource(source: string): HTMLElement {
  const template = document.createElement('template');
  template.innerHTML = source;
  const wrapper = document.createElement('div');
  wrapper.append(...Array.from(template.content.childNodes));
  return wrapper;
}

export function createFeatureNodeViews(features: MarkdownFeatures): Record<string, NodeViewConstructor> {
  const views: Record<string, NodeViewConstructor> = {
    inline_math: (node) => ({
      dom: renderOptionalBlock('math', node.attrs.latex, false, features),
      update: (next) => next.type.name === 'inline_math' && next.eq(node),
    }),
    math_block: (node) => ({
      dom: renderOptionalBlock('math', node.attrs.latex, true, features),
      update: (next) => next.type.name === 'math_block' && next.eq(node),
    }),
    mermaid: (node) => ({
      dom: renderOptionalBlock('mermaid', node.attrs.source, true, features),
      update: (next) => next.type.name === 'mermaid' && next.eq(node),
    }),
    directive: (node) => {
      const dom = document.createElement('div');
      const name = String(node.attrs.name);
      dom.setAttribute('data-directive', name);
      if (name === 'html') {
        dom.setAttribute('data-directive-html', '');
        dom.append(features.html?.(node.attrs.content) ?? renderHtmlSource(String(node.attrs.content)));
      } else {
        dom.textContent = node.attrs.content;
      }
      return { dom, update: (next) => next.type.name === 'directive' };
    },
  };
  return views;
}
