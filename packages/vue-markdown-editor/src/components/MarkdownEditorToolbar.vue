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

type ToolbarCommand = Parameters<BasicWysiwygEditor['run']>[0];
type TranslationKey = 'bold' | 'code' | 'formula' | 'heading' | 'html' | 'italic' | 'link' | 'redo' | 'undo';

const props = defineProps<{
    commands: BasicEditorCommands;
    formulaMenuVisible: boolean;
    headingMenuVisible: boolean;
    imageEditorVisible: boolean;
    linkEditorVisible: boolean;
    state: BasicWysiwygSelectionState;
    textStyleLabel: string;
    toolbarPreset: MarkdownEditorToolbarPreset;
    toolbarConfig?: MarkdownEditorToolbarConfig;
    translate: (key: TranslationKey) => string;
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
    'toggle-heading-menu': [reference: HTMLElement];
    'toggle-image-editor': [reference: HTMLElement];
    'toggle-link-editor': [reference: HTMLElement];
}>();

function getButton(event: MouseEvent): HTMLElement {
    return event.currentTarget as HTMLElement;
}

</script>

<template>
  <div class="markdown-editor__toolbar" data-markdown-editor-toolbar role="toolbar" aria-label="Форматирование Markdown">
    <div v-for="group in (toolbarConfig ?? getToolbarConfig(toolbarPreset)).groups" :key="group.id" class="markdown-editor__toolbar-group" role="group" :data-toolbar-group="group.id">
      <template v-for="toolbarItem in availableItems(group.items)" :key="toolbarItem.id">
        <button v-if="toolbarItem.id === 'undo'" data-toolbar-item="undo" type="button" :disabled="!isToolbarItemEnabled(toolbarItem, state)" :aria-label="translate('undo')" :title="translate('undo')" @mousedown.prevent @click="runItem(toolbarItem, commands.undo)">↶</button>
        <button v-else-if="toolbarItem.id === 'redo'" data-toolbar-item="redo" type="button" :disabled="!isToolbarItemEnabled(toolbarItem, state)" :aria-label="translate('redo')" :title="translate('redo')" @mousedown.prevent @click="runItem(toolbarItem, commands.redo)">↷</button>
        <button v-else-if="toolbarItem.id === 'heading'" data-toolbar-item="heading" :aria-expanded="headingMenuVisible" :aria-label="translate('heading')" :aria-pressed="state.headingLevel !== undefined" :title="translate('heading')" type="button" @mousedown.prevent @click="emit('toggle-heading-menu', getButton($event))">{{ textStyleLabel }}⌄</button>
        <button v-else-if="toolbarItem.id === 'bold'" data-toolbar-item="bold" :disabled="!isToolbarItemEnabled(toolbarItem, state)" :aria-label="translate('bold')" :aria-pressed="isToolbarItemActive(toolbarItem, state, state.bold)" type="button" :title="translate('bold')" @mousedown.prevent @click="runItem(toolbarItem, commands.bold)"><strong>B</strong></button>
        <button v-else-if="toolbarItem.id === 'italic'" data-toolbar-item="italic" :disabled="!isToolbarItemEnabled(toolbarItem, state)" :aria-label="translate('italic')" :aria-pressed="isToolbarItemActive(toolbarItem, state, state.italic)" type="button" :title="translate('italic')" @mousedown.prevent @click="runItem(toolbarItem, commands.italic)"><em>I</em></button>
        <button v-else-if="toolbarItem.id === 'underline'" data-toolbar-item="underline" :disabled="!isToolbarItemEnabled(toolbarItem, state)" :aria-pressed="isToolbarItemActive(toolbarItem, state, state.underline)" type="button" title="Подчёркивание" @mousedown.prevent @click="runItem(toolbarItem, commands.underline)"><u>U</u></button>
        <button v-else-if="toolbarItem.id === 'strike'" data-toolbar-item="strike" :disabled="!isToolbarItemEnabled(toolbarItem, state)" :aria-pressed="isToolbarItemActive(toolbarItem, state, state.strikethrough)" type="button" title="Зачёркивание" @mousedown.prevent @click="runItem(toolbarItem, commands.strikethrough)"><s>S</s></button>
        <button v-else-if="toolbarItem.id === 'mark'" data-toolbar-item="mark" :disabled="!isToolbarItemEnabled(toolbarItem, state)" :aria-pressed="isToolbarItemActive(toolbarItem, state, state.mark)" type="button" title="Выделить" @mousedown.prevent @click="runItem(toolbarItem, commands.mark)">▣</button>
        <button v-else-if="toolbarItem.id === 'code'" data-toolbar-item="code" :disabled="!isToolbarItemEnabled(toolbarItem, state)" :aria-label="translate('code')" :aria-pressed="isToolbarItemActive(toolbarItem, state, state.code)" type="button" :title="translate('code')" @mousedown.prevent @click="runItem(toolbarItem, commands.code)">&lt;/&gt;</button>
        <button v-else-if="toolbarItem.id === 'bullet-list'" data-toolbar-item="bullet-list" :disabled="!isToolbarItemEnabled(toolbarItem, state)" :aria-pressed="isToolbarItemActive(toolbarItem, state, state.bulletList)" type="button" title="Маркированный список" @mousedown.prevent @click="runItem(toolbarItem, commands.bulletList)">•≡</button>
        <button v-else-if="toolbarItem.id === 'ordered-list'" data-toolbar-item="ordered-list" :disabled="!isToolbarItemEnabled(toolbarItem, state)" :aria-pressed="isToolbarItemActive(toolbarItem, state, state.orderedList)" type="button" title="Нумерованный список" @mousedown.prevent @click="runItem(toolbarItem, commands.orderedList)">1≡</button>
        <button v-else-if="toolbarItem.id === 'quote'" data-toolbar-item="quote" :disabled="!isToolbarItemEnabled(toolbarItem, state)" :aria-pressed="isToolbarItemActive(toolbarItem, state, state.quote)" type="button" title="Цитата" @mousedown.prevent @click="runItem(toolbarItem, commands.quote)">❝</button>
        <button v-else-if="toolbarItem.id === 'fold-heading'" data-toolbar-item="fold-heading" :aria-pressed="state.headingFolded" type="button" title="Свернуть раздел" @mousedown.prevent @click="emit('execute', commands.toggleHeadingFolding)">▸</button>
        <button v-else-if="toolbarItem.id === 'code-block'" data-toolbar-item="code-block" :aria-pressed="state.codeBlock" type="button" title="Code block" @mousedown.prevent @click="emit('execute', commands.codeBlock)">{ }</button>
        <label v-else-if="toolbarItem.id === 'code-language'" data-toolbar-item="code-language" class="markdown-editor__code-language">
          <select :value="state.codeBlockLanguage" aria-label="Язык кода" @change="emit('execute', commands.setCodeBlockLanguage(($event.target as HTMLSelectElement).value))">
            <option value="">Текст</option><option value="javascript">JavaScript</option><option value="typescript">TypeScript</option><option value="json">JSON</option><option value="html">HTML</option><option value="css">CSS</option>
          </select>
        </label>
        <button v-else-if="toolbarItem.id === 'link'" data-toolbar-item="link" :aria-expanded="linkEditorVisible" :aria-pressed="state.linkHref !== undefined" type="button" :aria-label="translate('link')" :title="translate('link')" @mousedown.prevent @click="emit('toggle-link-editor', getButton($event))">⌁</button>
        <label v-else-if="toolbarItem.id === 'color'" data-toolbar-item="color" class="markdown-editor__color" title="Цвет текста"><input aria-label="Цвет текста" type="color" value="#202125" @input="emit('execute', commands.setColor(($event.target as HTMLInputElement).value))"></label>
        <button v-else-if="toolbarItem.id === 'image'" data-toolbar-item="image" :aria-expanded="imageEditorVisible" type="button" title="Изображение" @mousedown.prevent @click="emit('toggle-image-editor', getButton($event))">▧</button>
        <button v-else-if="toolbarItem.id === 'image-width'" data-toolbar-item="image-width" type="button" title="На всю ширину" @mousedown.prevent @click="emit('execute', commands.setImageDisplay('100%', 'contain', null))">↔</button>
        <label v-else-if="toolbarItem.id === 'image-fit'" data-toolbar-item="image-fit" class="markdown-editor__image-fit"><select :value="state.imageObjectFit" aria-label="Отображение изображения" @change="emit('execute', commands.setImageDisplay(undefined, ($event.target as HTMLSelectElement).value as 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'))"><option value="contain">Contain</option><option value="cover">Cover</option><option value="fill">Fill</option><option value="none">None</option><option value="scale-down">Scale down</option></select></label>
        <button v-else-if="toolbarItem.id === 'formula'" data-toolbar-item="formula" :aria-expanded="formulaMenuVisible" :aria-label="translate('formula')" :aria-pressed="state.formula" :title="translate('formula')" type="button" @mousedown.prevent @click="emit('toggle-formula-menu', getButton($event))">Σ</button>
        <button v-else-if="toolbarItem.id === 'html'" data-toolbar-item="html" type="button" :aria-label="translate('html')" :title="translate('html')" @mousedown.prevent @click="emit('insert-html')">&lt;/&gt;</button>
        <button v-else-if="toolbarItem.id === 'horizontal-rule'" data-toolbar-item="horizontal-rule" type="button" title="Горизонтальная линия" @mousedown.prevent @click="emit('execute', commands.horizontalRule)">―</button>
        <button v-else-if="toolbarItem.id === 'table'" data-toolbar-item="table" type="button" title="Таблица 3×3" @mousedown.prevent @click="emit('execute', commands.insertTable())">▦</button>
      </template>
    </div>
    <slot :commands="commands" :execute="(command: ToolbarCommand) => emit('execute', command)" />
  </div>
</template>
