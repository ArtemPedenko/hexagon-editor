import type {BasicEditorCommands, BasicWysiwygEditor, BasicWysiwygSelectionState} from '../core';
import type {MarkdownEditorToolbarPreset} from '../public-types';

export const markdownEditorToolbarItemIds = [
    'undo', 'redo', 'heading', 'bold', 'italic', 'underline', 'strike', 'mark', 'code',
    'bullet-list', 'ordered-list', 'quote', 'fold-heading', 'code-block', 'code-language',
    'link', 'color', 'image', 'image-width', 'image-fit', 'formula', 'html',
    'horizontal-rule', 'table',
] as const;

export type MarkdownEditorToolbarItemId = typeof markdownEditorToolbarItemIds[number];
type ToolbarCommand = Parameters<BasicWysiwygEditor['run']>[0];

export interface MarkdownEditorToolbarActionContext {
    commands: BasicEditorCommands;
    execute(command: ToolbarCommand): void;
    state: Readonly<BasicWysiwygSelectionState>;
}

/** Framework-neutral equivalent of an upstream toolbar item's editor binding. */
export interface MarkdownEditorToolbarAction {
    isActive?(state: Readonly<BasicWysiwygSelectionState>): boolean;
    isEnabled?(state: Readonly<BasicWysiwygSelectionState>): boolean;
    run(context: MarkdownEditorToolbarActionContext): void;
}

export interface MarkdownEditorToolbarItem {
    id: MarkdownEditorToolbarItemId;
    action?: MarkdownEditorToolbarAction;
    /** Additional consumer-controlled availability on top of built-in contextual rules. */
    isAvailable?(state: Readonly<BasicWysiwygSelectionState>): boolean;
}

export interface MarkdownEditorToolbarGroup {
    id: string;
    items: readonly (MarkdownEditorToolbarItemId | MarkdownEditorToolbarItem)[];
}

export interface MarkdownEditorToolbarConfig {
    groups: readonly MarkdownEditorToolbarGroup[];
}

export function createToolbarItem(
    id: MarkdownEditorToolbarItemId,
    options: Omit<MarkdownEditorToolbarItem, 'id'> = {},
): MarkdownEditorToolbarItem {
    return {id, ...options};
}

export function createToolbarGroup(
    id: string,
    items: MarkdownEditorToolbarGroup['items'],
): MarkdownEditorToolbarGroup {
    return {id, items};
}

export function createToolbarConfig(
    groups: MarkdownEditorToolbarConfig['groups'],
): MarkdownEditorToolbarConfig {
    return {groups};
}

export const zeroToolbarConfig = createToolbarConfig([
    createToolbarGroup('history', ['undo', 'redo']),
]);

export const commonmarkToolbarConfig = createToolbarConfig([
    createToolbarGroup('history', ['undo', 'redo']),
    createToolbarGroup('text', ['bold', 'italic']),
    createToolbarGroup('blocks', ['heading', 'bullet-list', 'ordered-list', 'link', 'quote', 'code', 'code-block']),
    createToolbarGroup('hidden', ['horizontal-rule']),
]);

export const defaultToolbarConfig = createToolbarConfig([
    createToolbarGroup('history', ['undo', 'redo']),
    createToolbarGroup('text', ['bold', 'italic', 'strike']),
    createToolbarGroup('blocks', ['heading', 'bullet-list', 'ordered-list', 'link', 'quote', 'code', 'code-block', 'code-language']),
    createToolbarGroup('hidden', ['horizontal-rule']),
]);

/** Full preset restricted to extensions included in the agreed Vue port scope. */
export const fullToolbarConfig = createToolbarConfig([
    createToolbarGroup('history', ['undo', 'redo']),
    createToolbarGroup('text', ['heading', 'bold', 'italic', 'underline', 'strike', 'mark', 'code']),
    createToolbarGroup('blocks', ['bullet-list', 'ordered-list', 'quote', 'fold-heading', 'code-block', 'code-language']),
    createToolbarGroup('links', ['color', 'link', 'image', 'image-width', 'image-fit']),
    createToolbarGroup('insert', ['formula', 'html', 'horizontal-rule', 'table']),
]);

export const minimalToolbarConfig = createToolbarConfig([
    createToolbarGroup('history', ['undo', 'redo']),
    createToolbarGroup('text', ['heading', 'bold', 'italic', 'underline', 'strike']),
    createToolbarGroup('blocks', ['bullet-list', 'ordered-list', 'quote', 'fold-heading']),
    createToolbarGroup('links', ['link', 'image-width', 'image-fit']),
]);

export function getToolbarConfig(preset: MarkdownEditorToolbarPreset): MarkdownEditorToolbarConfig {
    switch (preset) {
        case 'zero': return zeroToolbarConfig;
        case 'commonmark': return commonmarkToolbarConfig;
        case 'full': return fullToolbarConfig;
        case 'minimal': return minimalToolbarConfig;
        default: return defaultToolbarConfig;
    }
}

export function isToolbarItemActive(
    toolbarItem: MarkdownEditorToolbarItem,
    state: Readonly<BasicWysiwygSelectionState>,
    fallback: boolean,
): boolean {
    return toolbarItem.action?.isActive?.(state) ?? fallback;
}

export function isToolbarItemEnabled(
    toolbarItem: MarkdownEditorToolbarItem,
    state: Readonly<BasicWysiwygSelectionState>,
): boolean {
    return toolbarItem.action?.isEnabled?.(state) ?? true;
}

export function normalizeToolbarItem(
    value: MarkdownEditorToolbarItemId | MarkdownEditorToolbarItem,
): MarkdownEditorToolbarItem {
    return typeof value === 'string' ? {id: value} : value;
}

export function isToolbarItemAvailable(
    toolbarItem: MarkdownEditorToolbarItem,
    state: Readonly<BasicWysiwygSelectionState>,
): boolean {
    const contextAvailable = toolbarItem.id === 'fold-heading'
        ? state.headingLevel !== undefined
        : toolbarItem.id === 'image-width' || toolbarItem.id === 'image-fit'
            ? state.image
            : true;
    return contextAvailable && (toolbarItem.isAvailable?.(state) ?? true);
}
