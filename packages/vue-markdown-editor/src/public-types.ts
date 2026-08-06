/** Modes available to the consuming Vue application. */
export type MarkdownEditorMode = 'wysiwyg' | 'markup' | 'split';

/**
 * Stable options shared by the planned composable and component API.
 * The detailed option set will be added with the corresponding editor features.
 */
export interface MarkdownEditorOptions {
    /** Markdown/YFM source used when the editor instance is created. */
    initialValue?: string;
    /** Initial presentation mode. Defaults to `wysiwyg`. */
    mode?: MarkdownEditorMode;
    /** Enables source Markdown preview when the markup editor supports it. */
    preview?: boolean;
}

export interface MarkdownEditorInstance {
    getValue(): string;
    setValue(value: string): void;
    getMode(): MarkdownEditorMode;
    setMode(mode: MarkdownEditorMode): void;
    focus(): void;
    destroy(): void;
}

