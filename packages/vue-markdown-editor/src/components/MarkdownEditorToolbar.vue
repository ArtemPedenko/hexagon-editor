<script setup lang="ts">
import type {
    BasicEditorCommands,
    BasicWysiwygEditor,
    BasicWysiwygSelectionState,
} from '../core';
import type {MarkdownEditorToolbarPreset} from '../public-types';
import {
    getToolbarConfig,
    isToolbarItemAvailable,
    isToolbarItemActive,
    isToolbarItemEnabled,
    normalizeToolbarItem,
} from '../toolbar';
import type {MarkdownEditorToolbarConfig, MarkdownEditorToolbarItem} from '../toolbar';
import ToolbarIcon from './MarkdownEditorToolbarIcon.vue';
import type {MarkdownEditorMessageKey} from '../i18n';

type ToolbarCommand = Parameters<BasicWysiwygEditor['run']>[0];

const props = defineProps<{
    commands: BasicEditorCommands;
    codeMenuVisible: boolean;
    formulaMenuVisible: boolean;
    headingMenuVisible: boolean;
    imageEditorVisible: boolean;
    linkEditorVisible: boolean;
    listMenuVisible: boolean;
    state: BasicWysiwygSelectionState;
    textStyleLabel: string;
    toolbarPreset: MarkdownEditorToolbarPreset;
    toolbarConfig?: MarkdownEditorToolbarConfig;
    translate: (key: MarkdownEditorMessageKey) => string;
}>();

function availableItems(items: MarkdownEditorToolbarConfig['groups'][number]['items']): MarkdownEditorToolbarItem[] {
    return items.map(normalizeToolbarItem).filter((toolbarItem) => isToolbarItemAvailable(toolbarItem, props.state));
}

function runItem(toolbarItem: MarkdownEditorToolbarItem, command: ToolbarCommand): void {
    if (!isToolbarItemEnabled(toolbarItem, props.state)) return;
    if (toolbarItem.action) {
        toolbarItem.action.run({commands: props.commands, execute: (nextCommand) => emit('execute', nextCommand), state: props.state});
    } else {
        emit('execute', command);
    }
}

const emit = defineEmits<{
    execute: [command: ToolbarCommand];
    'insert-html': [];
    'toggle-formula-menu': [reference: HTMLElement];
    'toggle-code-menu': [reference: HTMLElement];
    'toggle-heading-menu': [reference: HTMLElement];
    'toggle-image-editor': [reference: HTMLElement];
    'toggle-link-editor': [reference: HTMLElement];
    'toggle-list-menu': [reference: HTMLElement];
}>();

function getButton(event: MouseEvent): HTMLElement {
    return event.currentTarget as HTMLElement;
}

</script>

<template>
  <div class="markdown-editor__toolbar" data-markdown-editor-toolbar role="toolbar" :aria-label="translate('toolbar')">
    <div v-for="group in (toolbarConfig ?? getToolbarConfig(toolbarPreset)).groups" :key="group.id" class="markdown-editor__toolbar-group" role="group" :data-toolbar-group="group.id">
      <template v-for="toolbarItem in availableItems(group.items)" :key="toolbarItem.id">
        <button v-if="toolbarItem.id === 'undo'" data-toolbar-item="undo" type="button" :disabled="!isToolbarItemEnabled(toolbarItem, state)" :aria-label="translate('undo')" :title="translate('undo')" @mousedown.prevent @click="runItem(toolbarItem, commands.undo)"><ToolbarIcon name="arrowLeft" /></button>
        <button v-else-if="toolbarItem.id === 'redo'" data-toolbar-item="redo" type="button" :disabled="!isToolbarItemEnabled(toolbarItem, state)" :aria-label="translate('redo')" :title="translate('redo')" @mousedown.prevent @click="runItem(toolbarItem, commands.redo)"><ToolbarIcon name="arrowRight" /></button>
        <button v-else-if="toolbarItem.id === 'heading'" class="markdown-editor__toolbar-heading" data-toolbar-item="heading" :aria-expanded="headingMenuVisible" :aria-label="translate('heading')" :aria-pressed="state.headingLevel !== undefined" :title="translate('heading')" type="button" @mousedown.prevent @click="emit('toggle-heading-menu', getButton($event))"><span>{{ textStyleLabel }}</span><ToolbarIcon name="chevronDown" /></button>
        <button v-else-if="toolbarItem.id === 'bold'" data-toolbar-item="bold" :disabled="!isToolbarItemEnabled(toolbarItem, state)" :aria-label="translate('bold')" :aria-pressed="isToolbarItemActive(toolbarItem, state, state.bold)" type="button" :title="translate('bold')" @mousedown.prevent @click="runItem(toolbarItem, commands.bold)"><ToolbarIcon name="bold" /></button>
        <button v-else-if="toolbarItem.id === 'italic'" data-toolbar-item="italic" :disabled="!isToolbarItemEnabled(toolbarItem, state)" :aria-label="translate('italic')" :aria-pressed="isToolbarItemActive(toolbarItem, state, state.italic)" type="button" :title="translate('italic')" @mousedown.prevent @click="runItem(toolbarItem, commands.italic)"><ToolbarIcon name="italic" /></button>
        <button v-else-if="toolbarItem.id === 'underline'" data-toolbar-item="underline" :disabled="!isToolbarItemEnabled(toolbarItem, state)" :aria-label="translate('underline')" :aria-pressed="isToolbarItemActive(toolbarItem, state, state.underline)" type="button" :title="translate('underline')" @mousedown.prevent @click="runItem(toolbarItem, commands.underline)"><ToolbarIcon name="underline" /></button>
        <button v-else-if="toolbarItem.id === 'strike'" data-toolbar-item="strike" :disabled="!isToolbarItemEnabled(toolbarItem, state)" :aria-label="translate('strike')" :aria-pressed="isToolbarItemActive(toolbarItem, state, state.strikethrough)" type="button" :title="translate('strike')" @mousedown.prevent @click="runItem(toolbarItem, commands.strikethrough)"><ToolbarIcon name="strike" /></button>
        <button v-else-if="toolbarItem.id === 'mark'" data-toolbar-item="mark" :disabled="!isToolbarItemEnabled(toolbarItem, state)" :aria-label="translate('mark')" :aria-pressed="isToolbarItemActive(toolbarItem, state, state.mark)" type="button" :title="translate('mark')" @mousedown.prevent @click="runItem(toolbarItem, commands.mark)">M</button>
        <button v-else-if="toolbarItem.id === 'code'" class="markdown-editor__toolbar-code" data-toolbar-item="code" :aria-expanded="codeMenuVisible" :aria-label="translate(state.codeBlock ? 'codeBlock' : 'code')" :aria-pressed="state.code || state.codeBlock" :title="translate(state.codeBlock ? 'codeBlock' : 'code')" type="button" @mousedown.prevent @click="emit('toggle-code-menu', getButton($event))"><ToolbarIcon name="code" /><ToolbarIcon name="chevronDown" /></button>
        <button v-else-if="toolbarItem.id === 'bullet-list'" class="markdown-editor__toolbar-list" data-toolbar-item="list" :aria-expanded="listMenuVisible" :aria-label="translate(state.orderedList ? 'orderedList' : 'bulletList')" :aria-pressed="state.bulletList || state.orderedList" :title="translate(state.orderedList ? 'orderedList' : 'bulletList')" type="button" @mousedown.prevent @click="emit('toggle-list-menu', getButton($event))"><ToolbarIcon :name="state.orderedList ? 'orderedList' : 'bulletList'" /><ToolbarIcon name="chevronDown" /></button>
        <template v-else-if="toolbarItem.id === 'ordered-list'" />
        <button v-else-if="toolbarItem.id === 'quote'" data-toolbar-item="quote" :disabled="!isToolbarItemEnabled(toolbarItem, state)" :aria-label="translate('quote')" :aria-pressed="isToolbarItemActive(toolbarItem, state, state.quote)" type="button" :title="translate('quote')" @mousedown.prevent @click="runItem(toolbarItem, commands.quote)"><ToolbarIcon name="quote" /></button>
        <button v-else-if="toolbarItem.id === 'fold-heading'" data-toolbar-item="fold-heading" :aria-label="translate('foldHeading')" :aria-pressed="state.headingFolded" type="button" :title="translate('foldHeading')" @mousedown.prevent @click="emit('execute', commands.toggleHeadingFolding)">▸</button>
        <template v-else-if="toolbarItem.id === 'code-block'" />
        <button v-else-if="toolbarItem.id === 'link'" data-toolbar-item="link" :aria-expanded="linkEditorVisible" :aria-pressed="state.linkHref !== undefined" type="button" :aria-label="translate('link')" :title="translate('link')" @mousedown.prevent @click="emit('toggle-link-editor', getButton($event))"><ToolbarIcon name="link" /></button>
        <label v-else-if="toolbarItem.id === 'color'" data-toolbar-item="color" class="markdown-editor__color" :title="translate('color')"><input :aria-label="translate('color')" type="color" value="#202125" @input="emit('execute', commands.setColor(($event.target as HTMLInputElement).value))"></label>
        <button v-else-if="toolbarItem.id === 'image'" data-toolbar-item="image" :aria-expanded="imageEditorVisible" :aria-label="translate('image')" type="button" :title="translate('image')" @mousedown.prevent @click="emit('toggle-image-editor', getButton($event))"><ToolbarIcon name="image" /></button>
        <button v-else-if="toolbarItem.id === 'image-width'" data-toolbar-item="image-width" :aria-label="translate('imageWidthFull')" type="button" :title="translate('imageWidthFull')" @mousedown.prevent @click="emit('execute', commands.setImageDisplay('100%', 'contain', null))">↔</button>
        <label v-else-if="toolbarItem.id === 'image-fit'" data-toolbar-item="image-fit" class="markdown-editor__image-fit"><select :value="state.imageObjectFit" :aria-label="translate('imageFit')" @change="emit('execute', commands.setImageDisplay(undefined, ($event.target as HTMLSelectElement).value as 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'))"><option value="contain">Contain</option><option value="cover">Cover</option><option value="fill">Fill</option><option value="none">None</option><option value="scale-down">Scale down</option></select></label>
        <button v-else-if="toolbarItem.id === 'formula'" data-toolbar-item="formula" :aria-expanded="formulaMenuVisible" :aria-label="translate('formula')" :aria-pressed="state.formula" :title="translate('formula')" type="button" @mousedown.prevent @click="emit('toggle-formula-menu', getButton($event))"><ToolbarIcon name="function" /></button>
        <button v-else-if="toolbarItem.id === 'mermaid'" data-toolbar-item="mermaid" type="button" :aria-label="translate('mermaid')" :aria-pressed="state.mermaid" :title="translate('mermaid')" @mousedown.prevent @click="runItem(toolbarItem, commands.insertMermaid)"><ToolbarIcon name="mermaid" /></button>
        <button v-else-if="toolbarItem.id === 'html'" data-toolbar-item="html" type="button" :aria-label="translate('html')" :title="translate('html')" @mousedown.prevent @click="emit('insert-html')">&lt;/&gt;</button>
        <button v-else-if="toolbarItem.id === 'horizontal-rule'" data-toolbar-item="horizontal-rule" :aria-label="translate('horizontalRule')" type="button" :title="translate('horizontalRule')" @mousedown.prevent @click="emit('execute', commands.horizontalRule)"><ToolbarIcon name="horizontalRule" /></button>
        <button v-else-if="toolbarItem.id === 'table'" data-toolbar-item="table" :aria-label="translate('table')" type="button" :title="translate('table')" @mousedown.prevent @click="emit('execute', commands.insertTable())"><ToolbarIcon name="table" /></button>
      </template>
    </div>
    <slot :commands="commands" :execute="(command: ToolbarCommand) => emit('execute', command)" />
  </div>
</template>

<style scoped>
.markdown-editor__toolbar-group { display: contents; }
.markdown-editor__toolbar-group + .markdown-editor__toolbar-group > :first-child { position: relative; margin-inline-start: .625rem; }
.markdown-editor__toolbar-group + .markdown-editor__toolbar-group > :first-child::after { position: absolute; inset-block: .125rem; inset-inline-start: -.375rem; border-inline-start: 1px solid color-mix(in srgb, var(--markdown-border) 75%, transparent); content: ''; }
button { display: inline-flex; align-items: center; justify-content: center; min-width: 1.75rem; height: 1.75rem; padding: 0 .375rem; border: 0; border-radius: .375rem; color: color-mix(in srgb, var(--markdown-text) 88%, transparent); background: transparent; font: inherit; cursor: pointer; }
button:hover { color: var(--markdown-text); background: color-mix(in srgb, var(--markdown-text) 10%, transparent); }
button:focus-visible { outline: 2px solid var(--markdown-focus-text); outline-offset: 1px; }
button[aria-pressed='true'], button[aria-expanded='true'] { color: var(--markdown-text); background: color-mix(in srgb, var(--markdown-text) 22%, transparent); }
button:disabled { cursor: default; opacity: .35; }
.markdown-editor__toolbar-heading { gap: .125rem; min-width: 2.75rem; }
.markdown-editor__toolbar-heading :deep(.markdown-editor__toolbar-icon), .markdown-editor__toolbar-list :deep(.markdown-editor__toolbar-icon:last-child), .markdown-editor__toolbar-code :deep(.markdown-editor__toolbar-icon:last-child) { width: .75rem; height: .75rem; }
.markdown-editor__toolbar-list, .markdown-editor__toolbar-code { gap: .1875rem; }
select { height: 1.75rem; border: 0; border-radius: .375rem; color: var(--markdown-text); background: transparent; font: inherit; }
select:hover { background: color-mix(in srgb, var(--markdown-text) 10%, transparent); }
.markdown-editor__color { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 1.75rem; height: 1.75rem; border-radius: .375rem; cursor: pointer; }
.markdown-editor__color::before { content: 'A'; line-height: 1; padding-bottom: .125rem; border-bottom: .125rem solid currentColor; }
.markdown-editor__color:hover { background: color-mix(in srgb, var(--markdown-text) 10%, transparent); }
.markdown-editor__color input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
</style>
