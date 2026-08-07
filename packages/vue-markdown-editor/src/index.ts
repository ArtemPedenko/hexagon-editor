export type {
    MarkdownEditorEventMap,
    MarkdownEditorInstance,
    MarkdownEditorMode,
    MarkdownEditorOptions,
    MarkdownEditorToolbarPreset,
    MarkdownEditorUploadResult,
} from './public-types';
export * from './core';
export {default as MarkdownEditor} from './MarkdownEditor.vue';
export type {MarkdownEditorExposed} from './MarkdownEditor.vue';
export {useMarkdownEditor} from './use-markdown-editor';
export type {UseMarkdownEditorResult} from './use-markdown-editor';

/** Version of this independent Vue port. */
export const VERSION = '0.1.0-alpha.0';
