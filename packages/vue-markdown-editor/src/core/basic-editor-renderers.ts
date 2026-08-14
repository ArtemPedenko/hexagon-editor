import katex from 'katex';
import type {Mermaid} from 'mermaid';

import {getMarkdownEditorMessages} from '../i18n';
import type {MarkdownEditorLocale} from '../public-types';

import {getAdvancedMarkdownRenderers} from './optional-renderers';

let mermaidDiagramId = 0;
let mermaidPromise: Promise<Mermaid> | undefined;

export function renderHtmlBlock(html: string, attribute: string): HTMLElement {
    const element = document.createElement('div');
    element.setAttribute(attribute, '');
    element.innerHTML = html;
    return element;
}

export function renderOptionalBlock(kind: 'math' | 'mermaid', source: string, display = true): HTMLElement {
    const renderers = getAdvancedMarkdownRenderers();
    if (kind === 'math' && renderers.math !== undefined) return renderers.math(source, display);
    if (kind === 'mermaid') return renderers.mermaid?.(source) ?? renderMermaid(source);
    const element = document.createElement(kind === 'math' && !display ? 'span' : 'pre');
    element.setAttribute(`data-${kind}${kind === 'math' ? display ? '-block' : '-inline' : ''}`, '');
    if (kind === 'math') {
        try { element.innerHTML = katex.renderToString(source, {displayMode: display, throwOnError: true}); }
        catch { element.setAttribute('data-math-error', ''); const fallback = document.createElement(display ? 'pre' : 'span'); fallback.className = 'markdown-editor__math-error'; fallback.textContent = source; element.replaceChildren(fallback); }
        localizeMathElement(element, 'en');
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

function renderMermaid(source: string): HTMLElement {
    const element = document.createElement('div');
    element.setAttribute('data-mermaid', '');
    element.setAttribute('aria-busy', 'true');
    element.setAttribute('aria-label', 'Mermaid diagram. Double-click to edit.');
    const fallback = document.createElement('pre');
    fallback.textContent = source;
    element.append(fallback);
    const id = `markdown-editor-mermaid-${++mermaidDiagramId}`;
    mermaidPromise ??= import('mermaid').then(({default: mermaid}) => {
        mermaid.initialize({securityLevel: 'strict', startOnLoad: false});
        return mermaid;
    });
    void mermaidPromise.then((mermaid) => mermaid.render(id, source)).then(({bindFunctions, svg}) => {
        element.innerHTML = svg;
        element.removeAttribute('aria-busy');
        bindFunctions?.(element);
    }).catch(() => {
        element.removeAttribute('aria-busy');
        element.setAttribute('data-mermaid-error', '');
    });
    return element;
}

export function renderYfmHtml(source: string): HTMLElement {
    const renderer = getAdvancedMarkdownRenderers().html;
    if (renderer !== undefined) return renderer(source);
    const element = document.createElement('pre');
    element.setAttribute('data-yfm-html', '');
    element.textContent = source;
    return element;
}
