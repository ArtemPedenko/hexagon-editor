export type {
    MarkdownEditorEventMap,
    MarkdownEditorInstance,
    MarkdownEditorLocale,
    MarkdownEditorMode,
    MarkdownEditorTheme,
    MarkdownEditorOptions,
    MarkdownEditorToolbarPreset,
    MarkdownEditorUploadResult,
} from './public-types';
export * from './core';
export {default as MarkdownEditor} from './MarkdownEditor.vue';
export type {MarkdownEditorExposed} from './MarkdownEditor.vue';
export {useMarkdownEditor} from './use-markdown-editor';
export type {UseMarkdownEditorResult} from './use-markdown-editor';
export {createListActions, Lists} from './extensions/markdown/lists';
export type {ListActions, ListsOptions} from './extensions/markdown/lists';
export {
    Blockquote,
    BlockquoteSpecs,
    blockquoteNodeName,
    getBlockquoteType,
    liftFromQuote,
    toggleQuote,
} from './extensions/markdown/blockquote';
export type {BlockquoteOptions} from './extensions/markdown/blockquote';
export {
    Bold,
    BoldAttrs,
    BoldSpecs,
    boldMarkName,
    getBoldType,
    toggleBold,
} from './extensions/markdown/bold';
export type {BoldOptions} from './extensions/markdown/bold';
export {
    Italic,
    ItalicAttrs,
    ItalicSpecs,
    getItalicType,
    italicMarkName,
    toggleItalic,
} from './extensions/markdown/italic';
export type {ItalicOptions} from './extensions/markdown/italic';
export {
    Code,
    CodeSpecs,
    codeMarkName,
    getCodeType,
    toggleCode,
} from './extensions/markdown/code';
export type {CodeOptions} from './extensions/markdown/code';
export {
    CodeBlock,
    CodeBlockAttrs,
    CodeBlockSpecs,
    codeBlockNodeName,
    getCodeBlockType,
    newlineInCode,
    resetCodeBlock,
    setCodeBlock,
} from './extensions/markdown/code-block';
export type {CodeBlockOptions} from './extensions/markdown/code-block';
export {BaseInputRules, BaseKeymap, BaseSchema} from './extensions/base';
export type {BaseSchemaOptions} from './extensions/base';
export {ZeroPreset} from './presets/zero';
export type {ZeroPresetOptions} from './presets/zero';
export {DefaultPreset} from './presets/default';
export type {DefaultPresetOptions} from './presets/default';
export {createHistoryActions, History, HistoryAction} from './extensions/behavior/history';
export type {HistoryActions, HistoryOptions} from './extensions/behavior/history';
export {Placeholder} from './extensions/behavior/placeholder';
export type {PlaceholderOptions} from './extensions/behavior/placeholder';
export {FilePaste} from './extensions/behavior/file-paste';
export type {FilePasteOptions} from './extensions/behavior/file-paste';
export {Clipboard, isInsideCode} from './extensions/behavior/clipboard';
export {Selection} from './extensions/behavior/selection';
export {SelectionContext} from './extensions/behavior/selection-context';
export type {SelectionContextOptions} from './extensions/behavior/selection-context';
export {SearchQA} from './modules/search';
export type {SearchCounter, SearchState} from './modules/search';

/** Version of this independent Vue port. */
export const VERSION = '0.1.0-alpha.0';
