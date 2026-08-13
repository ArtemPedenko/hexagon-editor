import type {BasicWysiwygSelectionState} from '../core';
import type {MarkdownEditorToolbarPreset} from '../public-types';

export const markdownEditorToolbarItemIds = [
    'undo', 'redo', 'heading', 'bold', 'italic', 'underline', 'strike', 'mark', 'code',
    'bullet-list', 'ordered-list', 'quote', 'fold-heading', 'code-block', 'code-language',
    'link', 'color', 'image', 'image-width', 'image-fit', 'formula', 'html',
    'horizontal-rule', 'table',
] as const;

export type MarkdownEditorToolbarItemId = typeof markdownEditorToolbarItemIds[number];

export interface MarkdownEditorToolbarItem {
    id: MarkdownEditorToolbarItemId;
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

const item = (id: MarkdownEditorToolbarItemId): MarkdownEditorToolbarItemId => id;

export const defaultToolbarConfig: MarkdownEditorToolbarConfig = {
    groups: [
        {id: 'history', items: [item('undo'), item('redo')]},
        {id: 'text', items: [item('heading'), item('bold'), item('italic'), item('underline'), item('strike'), item('mark'), item('code')]},
        {id: 'blocks', items: [item('bullet-list'), item('ordered-list'), item('quote'), item('fold-heading'), item('code-block'), item('code-language')]},
        {id: 'links', items: [item('link'), item('color'), item('image'), item('image-width'), item('image-fit')]},
        {id: 'insert', items: [item('formula'), item('html'), item('horizontal-rule'), item('table')]},
    ],
};

export const minimalToolbarConfig: MarkdownEditorToolbarConfig = {
    groups: [
        {id: 'history', items: [item('undo'), item('redo')]},
        {id: 'text', items: [item('heading'), item('bold'), item('italic'), item('underline'), item('strike')]},
        {id: 'blocks', items: [item('bullet-list'), item('ordered-list'), item('quote'), item('fold-heading')]},
        {id: 'links', items: [item('link'), item('image-width'), item('image-fit')]},
    ],
};

export function getToolbarConfig(preset: MarkdownEditorToolbarPreset): MarkdownEditorToolbarConfig {
    return preset === 'minimal' ? minimalToolbarConfig : defaultToolbarConfig;
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
