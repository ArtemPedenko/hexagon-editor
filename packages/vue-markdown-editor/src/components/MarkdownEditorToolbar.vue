<script setup lang="ts">
import {ref} from 'vue';
import type {
    BasicEditorCommands,
    BasicWysiwygEditor,
    BasicWysiwygSelectionState,
} from '../core';
import type {MarkdownEditorToolbarPreset} from '../public-types';

type ToolbarCommand = Parameters<BasicWysiwygEditor['run']>[0];
type TranslationKey = 'bold' | 'code' | 'formula' | 'heading' | 'html' | 'italic' | 'link' | 'redo' | 'undo';

defineProps<{
    commands: BasicEditorCommands;
    formulaMenuVisible: boolean;
    headingMenuVisible: boolean;
    imageEditorVisible: boolean;
    linkEditorVisible: boolean;
    state: BasicWysiwygSelectionState;
    textStyleLabel: string;
    toolbarPreset: MarkdownEditorToolbarPreset;
    translate: (key: TranslationKey) => string;
}>();

const emit = defineEmits<{
    execute: [command: ToolbarCommand];
    'open-file-picker': [kind: 'file' | 'image'];
    'insert-html': [];
    'toggle-formula-menu': [reference: HTMLElement];
    'toggle-heading-menu': [reference: HTMLElement];
    'toggle-image-editor': [reference: HTMLElement];
    'toggle-link-editor': [reference: HTMLElement];
    'upload-files': [files: File[]];
}>();

const fileInput = ref<HTMLInputElement>();

function emitFiles(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.files === null) return;
    emit('upload-files', Array.from(input.files));
    input.value = '';
}

function getButton(event: MouseEvent): HTMLElement {
    return event.currentTarget as HTMLElement;
}

function openFilePicker(kind: 'file' | 'image'): void {
    emit('open-file-picker', kind);
    fileInput.value?.click();
}

defineExpose({openFilePicker});
</script>

<template>
  <div class="markdown-editor__toolbar" data-markdown-editor-toolbar role="toolbar" aria-label="Форматирование Markdown">
    <button type="button" :aria-label="translate('undo')" :title="translate('undo')" @mousedown.prevent @click="emit('execute', commands.undo)">↶</button>
    <button type="button" :aria-label="translate('redo')" :title="translate('redo')" @mousedown.prevent @click="emit('execute', commands.redo)">↷</button>
    <button :aria-expanded="headingMenuVisible" :aria-label="translate('heading')" :aria-pressed="state.headingLevel !== undefined" :title="translate('heading')" type="button" @mousedown.prevent @click="emit('toggle-heading-menu', getButton($event))">{{ textStyleLabel }}⌄</button>
    <button :aria-label="translate('bold')" :aria-pressed="state.bold" type="button" :title="translate('bold')" @mousedown.prevent @click="emit('execute', commands.bold)"><strong>B</strong></button>
    <button :aria-label="translate('italic')" :aria-pressed="state.italic" type="button" :title="translate('italic')" @mousedown.prevent @click="emit('execute', commands.italic)"><em>I</em></button>
    <button :aria-pressed="state.underline" type="button" title="Подчёркивание" @mousedown.prevent @click="emit('execute', commands.underline)"><u>U</u></button>
    <button :aria-pressed="state.strikethrough" type="button" title="Зачёркивание" @mousedown.prevent @click="emit('execute', commands.strikethrough)"><s>S</s></button>
    <button v-if="toolbarPreset === 'default'" :aria-pressed="state.mark" type="button" title="Выделить" @mousedown.prevent @click="emit('execute', commands.mark)">▣</button>
    <button v-if="toolbarPreset === 'default'" :aria-label="translate('code')" :aria-pressed="state.code" type="button" :title="translate('code')" @mousedown.prevent @click="emit('execute', commands.code)">&lt;/&gt;</button>
    <button :aria-pressed="state.bulletList" type="button" title="Маркированный список" @mousedown.prevent @click="emit('execute', commands.bulletList)">•≡</button>
    <button :aria-pressed="state.orderedList" type="button" title="Нумерованный список" @mousedown.prevent @click="emit('execute', commands.orderedList)">1≡</button>
    <button :aria-pressed="state.quote" type="button" title="Цитата" @mousedown.prevent @click="emit('execute', commands.quote)">❝</button>
    <button v-if="state.headingLevel !== undefined" :aria-pressed="state.headingFolded" type="button" title="Свернуть раздел" @mousedown.prevent @click="emit('execute', commands.toggleHeadingFolding)">▸</button>
    <button v-if="toolbarPreset === 'default'" :aria-pressed="state.codeBlock" type="button" title="Code block" @mousedown.prevent @click="emit('execute', commands.codeBlock)">{ }</button>
    <label v-if="toolbarPreset === 'default'" class="markdown-editor__code-language">
      <select :value="state.codeBlockLanguage" aria-label="Язык кода" @change="emit('execute', commands.setCodeBlockLanguage(($event.target as HTMLSelectElement).value))">
        <option value="">Текст</option><option value="javascript">JavaScript</option><option value="typescript">TypeScript</option><option value="json">JSON</option><option value="html">HTML</option><option value="css">CSS</option>
      </select>
    </label>
    <button :aria-expanded="linkEditorVisible" :aria-pressed="state.linkHref !== undefined" type="button" :aria-label="translate('link')" :title="translate('link')" @mousedown.prevent @click="emit('toggle-link-editor', getButton($event))">⌁</button>
    <label v-if="toolbarPreset === 'default'" class="markdown-editor__color" title="Цвет текста"><input aria-label="Цвет текста" type="color" value="#202125" @input="emit('execute', commands.setColor(($event.target as HTMLInputElement).value))"></label>
    <button v-if="toolbarPreset === 'default'" :aria-expanded="imageEditorVisible" type="button" title="Изображение" @mousedown.prevent @click="emit('toggle-image-editor', getButton($event))">▧</button>
    <template v-if="state.image">
      <button type="button" title="На всю ширину" @mousedown.prevent @click="emit('execute', commands.setImageDisplay('100%', 'contain', null))">↔</button>
      <label class="markdown-editor__image-fit"><select :value="state.imageObjectFit" aria-label="Отображение изображения" @change="emit('execute', commands.setImageDisplay(undefined, ($event.target as HTMLSelectElement).value as 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'))"><option value="contain">Contain</option><option value="cover">Cover</option><option value="fill">Fill</option><option value="none">None</option><option value="scale-down">Scale down</option></select></label>
    </template>
    <button v-if="toolbarPreset === 'default'" type="button" title="Файл" @mousedown.prevent @click="openFilePicker('file')">⌕</button>
    <button v-if="toolbarPreset === 'default'" :aria-expanded="formulaMenuVisible" :aria-label="translate('formula')" :aria-pressed="state.formula" :title="translate('formula')" type="button" @mousedown.prevent @click="emit('toggle-formula-menu', getButton($event))">Σ</button>
    <button v-if="toolbarPreset === 'default'" type="button" :aria-label="translate('html')" :title="translate('html')" @mousedown.prevent @click="emit('insert-html')">&lt;/&gt;</button>
    <button v-if="toolbarPreset === 'default'" type="button" title="Горизонтальная линия" @mousedown.prevent @click="emit('execute', commands.horizontalRule)">―</button>
    <button v-if="toolbarPreset === 'default'" type="button" title="Таблица 3×3" @mousedown.prevent @click="emit('execute', commands.insertTable())">▦</button>
    <slot :commands="commands" :execute="(command: ToolbarCommand) => emit('execute', command)" />
    <input ref="fileInput" class="markdown-editor__file-input" multiple type="file" @change="emitFiles">
  </div>
</template>
