<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue';

import {
    createBasicEditorCommands,
    mountBasicMarkupEditor,
    mountBasicWysiwygEditor,
} from './core';
import type {BasicMarkupEditor, BasicWysiwygEditor, BasicWysiwygSelectionState} from './core';
import type {MarkdownEditorMode} from './public-types';

export interface MarkdownEditorExposed {
    focus(): void;
    getMode(): MarkdownEditorMode;
    getValue(): string;
    setMode(mode: MarkdownEditorMode): Promise<void>;
    setValue(value: string): void;
}

defineOptions({name: 'MarkdownEditor'});

const props = withDefaults(
    defineProps<{
        modelValue?: string;
        mode?: MarkdownEditorMode;
        readonly?: boolean;
    }>(),
    {
        modelValue: '',
        mode: 'wysiwyg',
        readonly: false,
    },
);

const emit = defineEmits<{
    change: [value: string];
    'mode-change': [mode: MarkdownEditorMode];
    'update:modelValue': [value: string];
    'update:mode': [mode: MarkdownEditorMode];
}>();

const commands = createBasicEditorCommands();
const markupTarget = ref<HTMLElement>();
const value = ref(props.modelValue);
const visualTarget = ref<HTMLElement>();
const mode = ref<MarkdownEditorMode>(props.mode);
const linkEditorVisible = ref(false);
const linkUrl = ref('https://');
const toolbarState = ref<BasicWysiwygSelectionState>({
    bold: false,
    bulletList: false,
    code: false,
    codeBlock: false,
    headingLevel: undefined,
    italic: false,
    mark: false,
    orderedList: false,
    quote: false,
    strikethrough: false,
    underline: false,
});
const textStyle = computed(() => toolbarState.value.headingLevel?.toString() ?? 'paragraph');
let markupEditor: BasicMarkupEditor | undefined;
let modeChangeId = 0;
let syncing = false;
let visualEditor: BasicWysiwygEditor | undefined;

function destroyHosts(): void {
    markupEditor?.destroy();
    visualEditor?.destroy();
    markupEditor = undefined;
    visualEditor = undefined;
    toolbarState.value = {
        bold: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        headingLevel: undefined,
        italic: false,
        mark: false,
        orderedList: false,
        quote: false,
        strikethrough: false,
        underline: false,
    };
}

function updateValue(nextValue: string, source: 'markup' | 'visual'): void {
    if (nextValue === value.value || syncing) {
        return;
    }

    value.value = nextValue;
    emit('update:modelValue', nextValue);
    emit('change', nextValue);
    syncing = true;
    if (source !== 'markup') {
        markupEditor?.setValue(nextValue);
    }
    if (source !== 'visual') {
        visualEditor?.setValue(nextValue);
    }
    syncing = false;
}

function setValue(nextValue: string): void {
    if (nextValue === value.value) {
        return;
    }

    value.value = nextValue;
    emit('update:modelValue', nextValue);
    emit('change', nextValue);
    syncing = true;
    markupEditor?.setValue(nextValue);
    visualEditor?.setValue(nextValue);
    syncing = false;
}

function applyLink(): void {
    if (linkUrl.value.trim().length === 0) {
        return;
    }

    execute(commands.link(linkUrl.value.trim()));
    linkEditorVisible.value = false;
}

function applyTextStyle(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
        return;
    }

    if (target.value === 'paragraph') {
        execute(commands.paragraph);
        return;
    }

    execute(commands.heading(Number(target.value)));
}

function mountHosts(): void {
    if (mode.value !== 'markup' && visualTarget.value !== undefined) {
        visualEditor = mountBasicWysiwygEditor({
            editable: !props.readonly,
            initialValue: value.value,
            onChange: (nextValue) => updateValue(nextValue, 'visual'),
            onSelectionChange: (nextSelection) => {
                toolbarState.value = nextSelection;
            },
            target: visualTarget.value,
        });
    }

    if (mode.value !== 'wysiwyg' && markupTarget.value !== undefined) {
        markupEditor = mountBasicMarkupEditor({
            editable: !props.readonly,
            initialValue: value.value,
            onChange: (nextValue) => updateValue(nextValue, 'markup'),
            target: markupTarget.value,
        });
    }
}

async function setMode(nextMode: MarkdownEditorMode): Promise<void> {
    if (nextMode === mode.value) {
        return;
    }

    const changeId = ++modeChangeId;
    mode.value = nextMode;
    emit('update:mode', nextMode);
    emit('mode-change', nextMode);
    destroyHosts();
    await nextTick();
    if (changeId === modeChangeId) {
        mountHosts();
    }
}

function execute(command: Parameters<BasicWysiwygEditor['run']>[0]): void {
    if (!props.readonly) {
        visualEditor?.run(command);
    }
}

watch(
    () => props.modelValue,
    (nextValue) => {
        if (nextValue === value.value) {
            return;
        }

        value.value = nextValue;
        syncing = true;
        markupEditor?.setValue(nextValue);
        visualEditor?.setValue(nextValue);
        syncing = false;
    },
);

watch(
    () => props.mode,
    (nextMode) => {
        void setMode(nextMode);
    },
);

watch(
    () => props.readonly,
    async () => {
        const changeId = ++modeChangeId;
        destroyHosts();
        await nextTick();
        if (changeId === modeChangeId) {
            mountHosts();
        }
    },
);

onMounted(mountHosts);
onBeforeUnmount(destroyHosts);

defineExpose<MarkdownEditorExposed>({
    focus: () => (mode.value === 'markup' ? markupEditor?.focus() : visualEditor?.focus()),
    getMode: () => mode.value,
    getValue: () => value.value,
    setMode,
    setValue,
});
</script>

<template>
  <section class="markdown-editor" :data-mode="mode">
    <header class="markdown-editor__header">
      <div class="markdown-editor__modes" role="tablist" aria-label="Режим редактора">
        <button :aria-selected="mode === 'wysiwyg'" role="tab" type="button" @click="setMode('wysiwyg')">Visual</button>
        <button :aria-selected="mode === 'markup'" role="tab" type="button" @click="setMode('markup')">Markup</button>
        <button :aria-selected="mode === 'split'" role="tab" type="button" @click="setMode('split')">Split</button>
      </div>
      <slot name="header" />
    </header>

    <div v-if="mode !== 'markup' && !readonly" class="markdown-editor__toolbar" role="toolbar" aria-label="Форматирование Markdown">
      <button type="button" title="Отменить" @mousedown.prevent @click="execute(commands.undo)">↶</button>
      <button type="button" title="Повторить" @mousedown.prevent @click="execute(commands.redo)">↷</button>
      <select
        aria-label="Уровень заголовка"
        :class="{'markdown-editor__select--active': toolbarState.headingLevel !== undefined}"
        title="Уровень заголовка"
        :value="textStyle"
        @change="applyTextStyle"
      >
        <option value="paragraph">Текст</option>
        <option value="1">H1</option>
        <option value="2">H2</option>
        <option value="3">H3</option>
        <option value="4">H4</option>
        <option value="5">H5</option>
        <option value="6">H6</option>
      </select>
      <button :aria-pressed="toolbarState.bold" type="button" title="Жирный" @mousedown.prevent @click="execute(commands.bold)"><strong>B</strong></button>
      <button :aria-pressed="toolbarState.italic" type="button" title="Курсив" @mousedown.prevent @click="execute(commands.italic)"><em>I</em></button>
      <button :aria-pressed="toolbarState.underline" type="button" title="Подчёркивание" @mousedown.prevent @click="execute(commands.underline)"><u>U</u></button>
      <button :aria-pressed="toolbarState.strikethrough" type="button" title="Зачёркивание" @mousedown.prevent @click="execute(commands.strikethrough)"><s>S</s></button>
      <button :aria-pressed="toolbarState.mark" type="button" title="Выделить" @mousedown.prevent @click="execute(commands.mark)">▣</button>
      <button :aria-pressed="toolbarState.code" type="button" title="Inline code" @mousedown.prevent @click="execute(commands.code)">&lt;/&gt;</button>
      <button :aria-pressed="toolbarState.bulletList" type="button" title="Маркированный список" @mousedown.prevent @click="execute(commands.bulletList)">•≡</button>
      <button :aria-pressed="toolbarState.orderedList" type="button" title="Нумерованный список" @mousedown.prevent @click="execute(commands.orderedList)">1≡</button>
      <button :aria-pressed="toolbarState.quote" type="button" title="Цитата" @mousedown.prevent @click="execute(commands.quote)">❝</button>
      <button :aria-pressed="toolbarState.codeBlock" type="button" title="Code block" @mousedown.prevent @click="execute(commands.codeBlock)">{ }</button>
      <button type="button" title="Ссылка" @mousedown.prevent @click="linkEditorVisible = !linkEditorVisible">⌁</button>
      <button type="button" title="Горизонтальная линия" @mousedown.prevent @click="execute(commands.horizontalRule)">―</button>
      <button type="button" title="Таблица 3×3" @mousedown.prevent @click="execute(commands.insertTable())">▦</button>
      <form v-if="linkEditorVisible" class="markdown-editor__link-form" @submit.prevent="applyLink">
        <input v-model="linkUrl" aria-label="Адрес ссылки" type="url" />
        <button type="submit">Готово</button>
      </form>
      <slot name="toolbar" :commands="commands" :execute="execute" />
    </div>

    <div class="markdown-editor__hosts" :class="{'markdown-editor__hosts--split': mode === 'split'}">
      <div v-if="mode !== 'markup'" ref="visualTarget" class="markdown-editor__visual" />
      <div v-if="mode !== 'wysiwyg'" ref="markupTarget" class="markdown-editor__markup" />
    </div>
  </section>
</template>

<style scoped>
.markdown-editor {
    overflow: hidden;
    border: 1px solid #d8dbe0;
    color: #202125;
    background: #fff;
}

.markdown-editor__header,
.markdown-editor__toolbar,
.markdown-editor__modes {
    display: flex;
    align-items: center;
}

.markdown-editor__header {
    justify-content: space-between;
    min-height: 2.75rem;
    padding: 0.375rem 0.5rem;
    border-bottom: 1px solid #e5e7eb;
}

.markdown-editor__modes,
.markdown-editor__toolbar {
    gap: 0.25rem;
}

.markdown-editor__link-form {
    display: flex;
    flex: 1 0 14rem;
    gap: 0.25rem;
}

.markdown-editor__link-form input {
    flex: 1;
    min-width: 0;
    height: 2rem;
    padding: 0 0.5rem;
    border: 1px solid #c5cad4;
    border-radius: 0.25rem;
    color: inherit;
    background: #fff;
    font: inherit;
}

.markdown-editor button {
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.5rem;
    border: 0;
    border-radius: 0.25rem;
    color: inherit;
    background: transparent;
    font: inherit;
    cursor: pointer;
}

.markdown-editor select {
    height: 2rem;
    padding: 0 0.35rem;
    border: 0;
    border-radius: 0.25rem;
    color: inherit;
    background: transparent;
    font: inherit;
    cursor: pointer;
}

.markdown-editor button[aria-selected='true'],
.markdown-editor button[aria-pressed='true'],
.markdown-editor button:hover,
.markdown-editor button:focus-visible {
    outline: none;
    color: #1d3c93;
    background: #e9efff;
}

.markdown-editor select:hover,
.markdown-editor select.markdown-editor__select--active,
.markdown-editor select:focus-visible {
    outline: none;
    color: #1d3c93;
    background: #e9efff;
}

.markdown-editor__toolbar {
    position: sticky;
    z-index: 1;
    top: 0;
    padding: 0.5rem;
    border-bottom: 1px solid #e5e7eb;
}

.markdown-editor__hosts {
    min-width: 0;
}

.markdown-editor__hosts--split {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.markdown-editor__hosts--split > :last-child {
    border-left: 1px solid #e5e7eb;
}

.markdown-editor :deep(.ProseMirror),
.markdown-editor :deep(.cm-editor) {
    min-height: 20rem;
}

.markdown-editor :deep(.ProseMirror) {
    padding: 1rem;
    outline: none;
    line-height: 1.6;
}

.markdown-editor :deep(.cm-scroller) {
    min-height: 20rem;
}

@media (max-width: 720px) {
    .markdown-editor__hosts--split {
        grid-template-columns: 1fr;
    }

    .markdown-editor__hosts--split > :last-child {
        border-top: 1px solid #e5e7eb;
        border-left: 0;
    }
}
</style>
