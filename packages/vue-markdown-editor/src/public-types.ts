import type {EditorAction, EditorActions} from './core/actions';

/** Modes available to the consuming Vue application. */
export type MarkdownEditorMode = 'wysiwyg' | 'markup' | 'split';
export type MarkdownEditorLocale = 'en' | 'ru';
export type MarkdownEditorToolbarPreset = 'zero' | 'commonmark' | 'default' | 'full' | 'minimal';
export type MarkdownEditorPreset = Exclude<MarkdownEditorToolbarPreset, 'minimal'>;
export type MarkdownEditorTheme = 'auto' | 'dark' | 'light';
export type MarkdownEditorCursorPosition = 'start' | 'end' | {line: number};

export interface ChangeEditorModeOptions {
    emit?: boolean;
    mode: MarkdownEditorMode;
    reason: 'error-boundary' | 'settings' | 'manually';
}

export interface MarkdownEditorInitialOptions {
    markup?: string;
    mode?: MarkdownEditorMode;
    readonly?: boolean;
    toolbarVisible?: boolean;
}

/**
 * Stable options shared by the planned composable and component API.
 * The detailed option set will be added with the corresponding editor features.
 */
export interface MarkdownEditorOptions {
    /** Host-bound actions exposed through the upstream-compatible action storage. */
    actions?: EditorActions;
    /** Markdown/YFM source used when the editor instance is created. */
    initialValue?: string;
    /** Upstream-compatible initial state. Flat options take precedence. */
    initial?: MarkdownEditorInitialOptions;
    /** Initial presentation mode. Defaults to `wysiwyg`. */
    mode?: MarkdownEditorMode;
    preset?: MarkdownEditorPreset;
    readonly?: boolean;
    toolbarVisible?: boolean;
    locale?: MarkdownEditorLocale;
    theme?: MarkdownEditorTheme;
    /** Enables source Markdown preview when the markup editor supports it. */
    preview?: boolean;
    /** Text displayed in an empty visual editor. */
    placeholder?: string;
    /** Called after a value change from either editor surface or the public API. */
    onChange?(value: string): void;
    /** Called after the presentation mode changes. */
    onModeChange?(mode: MarkdownEditorMode): void;
    /** Called by the headless instance when a host should receive focus. */
    onFocus?(): void;
    onHasFocus?(): boolean;
    onMoveCursor?(position: MarkdownEditorCursorPosition): void;
    beforeEditorModeChange?(options: Pick<ChangeEditorModeOptions, 'mode' | 'reason'>): boolean | undefined;
}

export interface MarkdownEditorEventMap {
    change: string;
    changeEditorMode: ChangeEditorModeOptions;
    changeReadonly: {readonly: boolean};
    changeToolbarVisibility: {visible: boolean};
    destroy: undefined;
    modeChange: MarkdownEditorMode;
}

export interface MarkdownEditorInstance {
    readonly actions: Readonly<EditorActions>;
    readonly currentMode: MarkdownEditorMode;
    readonly preset: MarkdownEditorPreset;
    readonly readonly: boolean;
    readonly toolbarVisible: boolean;
    append(markup: string): void;
    action(name: string): EditorAction<unknown, unknown> | undefined;
    changeEditorMode(options: ChangeEditorModeOptions): void;
    changeToolbarVisibility(options: {visible: boolean}): void;
    clear(): void;
    destroy(): void;
    focus(): void;
    hasFocus(): boolean;
    getValue(): string;
    getMode(): MarkdownEditorMode;
    insert(markup: string): void;
    isEmpty(): boolean;
    moveCursor(position: MarkdownEditorCursorPosition): void;
    off<Key extends keyof MarkdownEditorEventMap>(
        type: Key,
        listener: (value: MarkdownEditorEventMap[Key]) => void,
    ): void;
    on<Key extends keyof MarkdownEditorEventMap>(
        type: Key,
        listener: (value: MarkdownEditorEventMap[Key]) => void,
    ): void;
    setMode(mode: MarkdownEditorMode): void;
    setEditorMode(mode: MarkdownEditorMode, options?: Pick<ChangeEditorModeOptions, 'emit'>): void;
    setReadonly(readonly: boolean): void;
    setValue(value: string): void;
    prepend(markup: string): void;
    replace(markup: string): void;
}
