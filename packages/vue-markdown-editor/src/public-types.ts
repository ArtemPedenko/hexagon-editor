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
    /** Called after a value change from either editor surface or the public API. */
    onChange?(value: string): void;
    /** Called after the presentation mode changes. */
    onModeChange?(mode: MarkdownEditorMode): void;
    /** Called by the headless instance when a host should receive focus. */
    onFocus?(): void;
}

export interface MarkdownEditorEventMap {
    change: string;
    modeChange: MarkdownEditorMode;
}

export interface MarkdownEditorInstance {
    destroy(): void;
    focus(): void;
    getValue(): string;
    getMode(): MarkdownEditorMode;
    off<Key extends keyof MarkdownEditorEventMap>(
        type: Key,
        listener: (value: MarkdownEditorEventMap[Key]) => void,
    ): void;
    on<Key extends keyof MarkdownEditorEventMap>(
        type: Key,
        listener: (value: MarkdownEditorEventMap[Key]) => void,
    ): void;
    setMode(mode: MarkdownEditorMode): void;
    setValue(value: string): void;
}
