import type {Component} from 'vue';

export interface MarkdownDirectiveComponentProps {
    content: string;
    name: string;
    readonly: boolean;
    updateContent(content: string): void;
}

/** Vue components keyed by the name in a `::: name` Markdown block. */
export type MarkdownDirectiveComponents = Readonly<Record<string, Component>>;
