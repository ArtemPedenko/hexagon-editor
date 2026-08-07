export interface AdvancedMarkdownRenderers {
    html?(source: string): HTMLElement;
    math?(latex: string, display: boolean): HTMLElement;
    mermaid?(source: string): HTMLElement;
}

let renderers: AdvancedMarkdownRenderers = {};

/** Configure host-owned renderers such as KaTeX or Mermaid without bundling them into the editor. */
export function configureAdvancedMarkdownRenderers(nextRenderers: AdvancedMarkdownRenderers): void {
    renderers = {...renderers, ...nextRenderers};
}

export function getAdvancedMarkdownRenderers(): AdvancedMarkdownRenderers {
    return renderers;
}
