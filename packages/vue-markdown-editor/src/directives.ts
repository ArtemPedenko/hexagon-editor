import type { Component } from 'vue';

export type MarkdownDirectiveAttrs = Record<string, unknown>;

export interface MarkdownDirectiveComponentProps<Attrs = MarkdownDirectiveAttrs> {
  attrs: Attrs;
  content: string;
  name: string;
  readonly: boolean;
  updateContent(content: string): void;
  updateAttrs(attrs: Attrs): void;
}

export interface MarkdownDirectivePlugin<Attrs = MarkdownDirectiveAttrs> {
  component: Component;
  icon?: Component;
  insert: { attrs: Attrs; content: string };
  label?: string;
  parseAttributes?(raw: string): Attrs;
  serializeAttributes?(attrs: Attrs): string;
  toolbar?: boolean;
}

/** Plugins keyed by the name in a `::: name {attrs}` Markdown block. */
export type MarkdownDirectives = Readonly<Record<string, MarkdownDirectivePlugin>>;

/** `html` is an internal trusted directive and cannot be overridden. */
export function normalizeMarkdownDirectives(directives?: MarkdownDirectives): MarkdownDirectives {
  if (directives?.html !== undefined) {
    console.error('The "html" Markdown directive is reserved and will be ignored.');
    const { html: _html, ...rest } = directives;
    return rest;
  }
  return directives ?? {};
}
