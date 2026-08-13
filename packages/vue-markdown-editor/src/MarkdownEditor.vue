<script setup lang="ts">
import {autoUpdate, computePosition, flip, offset, shift} from '@floating-ui/dom';
import {computed, h, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import type {FunctionalComponent} from 'vue';

import MarkdownEditorToolbar from './components/MarkdownEditorToolbar.vue';
import MarkdownEditorImageForm from './forms/MarkdownEditorImageForm.vue';
import MarkdownEditorLinkForm from './forms/MarkdownEditorLinkForm.vue';
import {
    createBasicEditorCommands,
    mountBasicMarkupEditor,
    mountBasicWysiwygEditor,
} from './core';
import type {BasicMarkupEditor, BasicWysiwygEditor, BasicWysiwygSelectionState} from './core';
import type {
    MarkdownEditorMode,
    MarkdownEditorCursorPosition,
    MarkdownEditorLocale,
    MarkdownEditorToolbarPreset,
    MarkdownEditorTheme,
} from './public-types';
import type {MarkdownEditorToolbarConfig} from './toolbar';

export interface MarkdownEditorExposed {
    append(markup: string): void;
    clear(): void;
    focus(): void;
    getMode(): MarkdownEditorMode;
    getValue(): string;
    hasFocus(): boolean;
    insert(markup: string): void;
    isEmpty(): boolean;
    moveCursor(position: MarkdownEditorCursorPosition): void;
    prepend(markup: string): void;
    replace(markup: string): void;
    setMode(mode: MarkdownEditorMode): Promise<void>;
    setValue(value: string): void;
}

interface SelectionPanelProps {
    onBold: () => void;
    onItalic: () => void;
    visible: boolean;
}

const messages = {
    en: {bold: 'Bold', code: 'Inline code', formula: 'Formula', heading: 'Heading level', html: 'HTML', italic: 'Italic', link: 'Link', markup: 'Markup', mode: 'Editor mode', redo: 'Redo', split: 'Split', undo: 'Undo', visual: 'Visual'},
    ru: {bold: 'Жирный', code: 'Встроенный код', formula: 'Формула', heading: 'Уровень заголовка', html: 'HTML', italic: 'Курсив', link: 'Ссылка', markup: 'Разметка', mode: 'Режим редактора', redo: 'Повторить', split: 'Разделить', undo: 'Отменить', visual: 'Визуальный'},
} as const;
type TranslationKey = keyof typeof messages.en;

const selectionPanel: FunctionalComponent<SelectionPanelProps> = (panelProps) => panelProps.visible
    ? h('div', {class: 'markdown-editor__selection-actions'}, [
        h('button', {
            'aria-label': 'Жирный для выделения',
            onClick: panelProps.onBold,
            onMousedown: (event: MouseEvent) => event.preventDefault(),
            type: 'button',
        }, 'B'),
        h('button', {
            'aria-label': 'Курсив для выделения',
            onClick: panelProps.onItalic,
            onMousedown: (event: MouseEvent) => event.preventDefault(),
            type: 'button',
        }, 'I'),
    ])
    : null;

defineOptions({name: 'MarkdownEditor'});

const props = withDefaults(
    defineProps<{
        modelValue?: string;
        mode?: MarkdownEditorMode;
        locale?: MarkdownEditorLocale;
        placeholder?: string;
        readonly?: boolean;
        toolbarPreset?: MarkdownEditorToolbarPreset;
        /** Overrides the preset with an ordered set of toolbar groups and items. */
        toolbarConfig?: MarkdownEditorToolbarConfig;
        theme?: MarkdownEditorTheme;
    }>(),
    {
        modelValue: '',
        mode: 'wysiwyg',
        locale: 'ru',
        placeholder: '',
        readonly: false,
        toolbarConfig: undefined,
        toolbarPreset: 'default',
        theme: 'auto',
    },
);

const emit = defineEmits<{
    cancel: [];
    change: [value: string];
    'mode-change': [mode: MarkdownEditorMode];
    'update:modelValue': [value: string];
    'update:mode': [mode: MarkdownEditorMode];
    submit: [];
}>();

const commands = createBasicEditorCommands();
const markupTarget = ref<HTMLElement>();
const modeTablist = ref<HTMLElement>();
const value = ref(props.modelValue);
const visualTarget = ref<HTMLElement>();
const mode = ref<MarkdownEditorMode>(props.mode);
const imageEditorVisible = ref(false);
const imageUrl = ref('https://');
const imageAlt = ref('');
const imageTitle = ref('');
const imageForm = ref<InstanceType<typeof MarkdownEditorImageForm>>();
const linkEditorVisible = ref(false);
const linkUrl = ref('');
const linkText = ref('');
const linkTitle = ref('');
const formulaMenuVisible = ref(false);
const toolbarState = ref<BasicWysiwygSelectionState>({
    bold: false,
    bulletList: false,
    code: false,
    codeBlock: false,
    codeBlockLanguage: undefined,
    formula: false,
    headingFolded: false,
    headingLevel: undefined,
    image: false,
    imageObjectFit: undefined,
    linkHref: undefined,
    linkText: undefined,
    linkTitle: undefined,
    italic: false,
    mark: false,
    orderedList: false,
    quote: false,
    strikethrough: false,
    underline: false,
});
const textStyle = computed(() => toolbarState.value.headingLevel?.toString() ?? 'paragraph');
const textStyleLabel = computed(() => textStyle.value === 'paragraph' ? 'Текст' : `H${textStyle.value}`);
const htmlDirective = '::: html\n\n<div>Add HTML code here</div>\n\n:::';
const mathBlock = '$$\nE = mc^2\n$$';
const formulaMenu = ref<HTMLElement>();
const headingMenu = ref<HTMLElement>();
const headingMenuVisible = ref(false);
let stopImageFloating: (() => void) | undefined;
const linkForm = ref<InstanceType<typeof MarkdownEditorLinkForm>>();
let stopFormulaFloating: (() => void) | undefined;
let stopHeadingFloating: (() => void) | undefined;
let stopLinkFloating: (() => void) | undefined;
let markupEditor: BasicMarkupEditor | undefined;
let modeChangeId = 0;
let syncing = false;
let visualEditor: BasicWysiwygEditor | undefined;

function t(key: TranslationKey): string {
    return messages[props.locale][key];
}

async function handleModeNavigation(event: KeyboardEvent): Promise<void> {
    const modes: MarkdownEditorMode[] = ['wysiwyg', 'markup', 'split'];
    const currentIndex = modes.indexOf(mode.value);
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? modes.length - 1 : event.key === 'ArrowRight' ? (currentIndex + 1) % modes.length : event.key === 'ArrowLeft' ? (currentIndex - 1 + modes.length) % modes.length : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    const nextMode = modes[nextIndex]!;
    await setMode(nextMode);
    modeTablist.value?.querySelector<HTMLElement>(`[data-editor-mode="${nextMode}"]`)?.focus();
}

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
        codeBlockLanguage: undefined,
        formula: false,
        headingFolded: false,
        headingLevel: undefined,
        image: false,
        imageObjectFit: undefined,
        linkHref: undefined,
        linkText: undefined,
        linkTitle: undefined,
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

function joinMarkdown(left: string, right: string): string {
    if (left.length === 0) return right;
    if (right.length === 0) return left;
    return `${left}\n\n${right}`;
}

function moveCursor(position: MarkdownEditorCursorPosition): void {
    if (mode.value === 'markup') {
        markupEditor?.moveCursor(position);
    } else if (mode.value === 'split' && typeof position === 'object') {
        markupEditor?.moveCursor(position);
    } else {
        visualEditor?.moveCursor(typeof position === 'object' ? 'start' : position);
    }
}

function insert(markup: string): void {
    if (mode.value === 'markup' || (mode.value === 'split' && markupEditor?.hasFocus())) {
        markupEditor?.insert(markup);
    } else {
        visualEditor?.insert(markup);
    }
}

function applyLink(): void {
    if (linkUrl.value.trim().length === 0) {
        return;
    }

    execute(commands.setLink(linkUrl.value.trim(), linkTitle.value.trim() || undefined, linkText.value.trim() || undefined));
    linkEditorVisible.value = false;
}

function closeLinkEditor(): void {
    linkEditorVisible.value = false;
    stopLinkFloating?.();
    stopLinkFloating = undefined;
}

function applyImage(): void {
    const src = imageUrl.value.trim();
    if (src.length === 0) return;
    execute(commands.insertImage(src, imageAlt.value.trim() || 'Image', imageTitle.value.trim() || undefined));
    imageEditorVisible.value = false;
    stopImageFloating?.();
    stopImageFloating = undefined;
}

function closeImageEditor(): void {
    imageEditorVisible.value = false;
    stopImageFloating?.();
    stopImageFloating = undefined;
}

function applyTextStyle(style: string): void {
    if (style === 'paragraph') {
        execute(commands.paragraph);
    } else {
        execute(commands.heading(Number(style)));
    }

    headingMenuVisible.value = false;
}

function startFloating(reference: HTMLElement | undefined, floating: HTMLElement | undefined, onCleanup: (cleanup: (() => void) | undefined) => void): void {
    if (reference === undefined || floating === undefined) return;
    const editor = reference.closest<HTMLElement>('.markdown-editor');
    if (editor !== null) {
        const editorStyles = getComputedStyle(editor);
        for (const name of ['--markdown-background', '--markdown-border', '--markdown-focus-background', '--markdown-focus-text', '--markdown-text']) {
            floating.style.setProperty(name, editorStyles.getPropertyValue(name));
        }
    }
    const update = async (): Promise<void> => {
        const {x, y} = await computePosition(reference, floating, {
            middleware: [offset(6), flip({padding: 8}), shift({padding: 8})],
            placement: 'bottom-start',
            strategy: 'fixed',
        });
        Object.assign(floating.style, {left: `${x}px`, position: 'fixed', top: `${y}px`});
    };
    onCleanup(autoUpdate(reference, floating, update));
}

async function showHeadingMenu(reference: HTMLElement): Promise<void> {
    headingMenuVisible.value = !headingMenuVisible.value;
    stopHeadingFloating?.();
    stopHeadingFloating = undefined;
    if (!headingMenuVisible.value) return;
    await nextTick();
    startFloating(reference, headingMenu.value, (cleanup) => { stopHeadingFloating = cleanup; });
}

async function toggleLinkEditor(reference: HTMLElement): Promise<void> {
    linkEditorVisible.value = !linkEditorVisible.value;
    stopLinkFloating?.();
    stopLinkFloating = undefined;
    if (!linkEditorVisible.value) return;
    linkUrl.value = toolbarState.value.linkHref ?? '';
    linkText.value = toolbarState.value.linkText ?? '';
    linkTitle.value = toolbarState.value.linkTitle ?? '';
    await nextTick();
    startFloating(reference, linkForm.value?.element, (cleanup) => { stopLinkFloating = cleanup; });
}

async function toggleImageEditor(reference: HTMLElement): Promise<void> {
    imageEditorVisible.value = !imageEditorVisible.value;
    stopImageFloating?.();
    stopImageFloating = undefined;
    if (!imageEditorVisible.value) return;
    await nextTick();
    startFloating(reference, imageForm.value?.element, (cleanup) => { stopImageFloating = cleanup; });
}

async function insertHtmlDirective(): Promise<void> {
    setValue(value.value.length === 0 ? htmlDirective : `${value.value}\n\n${htmlDirective}`);
    await setMode('markup');
    markupEditor?.focus();
}

async function insertMathBlock(): Promise<void> {
    formulaMenuVisible.value = false;
    if (toolbarState.value.formula) {
        return;
    }

    if (visualEditor?.run(commands.insertMathBlock) === true) {
        return;
    }

    setValue(value.value.length === 0 ? mathBlock : `${value.value}\n\n${mathBlock}`);
    await setMode('markup');
    markupEditor?.focus();
}

function insertInlineMath(): void {
    formulaMenuVisible.value = false;
    visualEditor?.run(commands.insertInlineMath);
}

async function toggleFormulaMenu(reference: HTMLElement): Promise<void> {
    if (!toolbarState.value.formula) {
        formulaMenuVisible.value = !formulaMenuVisible.value;
        stopFormulaFloating?.();
        stopFormulaFloating = undefined;
        if (formulaMenuVisible.value) {
            await nextTick();
            startFloating(reference, formulaMenu.value, (cleanup) => { stopFormulaFloating = cleanup; });
        }
    }
}

function closeFloatingPanels(event: PointerEvent): void {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (!headingMenu.value?.contains(target)) {
        headingMenuVisible.value = false;
        stopHeadingFloating?.();
        stopHeadingFloating = undefined;
    }
    if (!formulaMenu.value?.contains(target)) {
        formulaMenuVisible.value = false;
        stopFormulaFloating?.();
        stopFormulaFloating = undefined;
    }
    if (!linkForm.value?.element?.contains(target)) {
        linkEditorVisible.value = false;
        stopLinkFloating?.();
        stopLinkFloating = undefined;
    }
    if (!imageForm.value?.element?.contains(target)) {
        imageEditorVisible.value = false;
        stopImageFloating?.();
        stopImageFloating = undefined;
    }
}

function closePanelsOnEscape(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    headingMenuVisible.value = false;
    formulaMenuVisible.value = false;
    imageEditorVisible.value = false;
    linkEditorVisible.value = false;
    stopHeadingFloating?.();
    stopFormulaFloating?.();
    stopImageFloating?.();
    stopLinkFloating?.();
    stopHeadingFloating = undefined;
    stopFormulaFloating = undefined;
    stopImageFloating = undefined;
    stopLinkFloating = undefined;
}

function mountHosts(): void {
    if (mode.value !== 'markup' && visualTarget.value !== undefined) {
        visualEditor = mountBasicWysiwygEditor({
            editable: !props.readonly,
            initialValue: value.value,
            onCancel: () => {
                emit('cancel');
                return true;
            },
            onChange: (nextValue) => updateValue(nextValue, 'visual'),
            onSelectionChange: (nextSelection) => {
                toolbarState.value = nextSelection;
            },
            onSubmit: () => {
                emit('submit');
                return true;
            },
            placeholder: props.placeholder,
            selectionContext: {
                className: 'markdown-editor__selection-panel',
                component: selectionPanel,
                props: {
                    onBold: () => execute(commands.bold),
                    onItalic: () => execute(commands.italic),
                },
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

onMounted(() => {
    mountHosts();
    document.addEventListener('pointerdown', closeFloatingPanels);
    document.addEventListener('keydown', closePanelsOnEscape);
});
onBeforeUnmount(() => {
    destroyHosts();
    document.removeEventListener('pointerdown', closeFloatingPanels);
    document.removeEventListener('keydown', closePanelsOnEscape);
    stopHeadingFloating?.();
    stopFormulaFloating?.();
    stopImageFloating?.();
    stopLinkFloating?.();
});

defineExpose<MarkdownEditorExposed>({
    append: (markup) => setValue(joinMarkdown(value.value, markup)),
    clear: () => setValue(''),
    focus: () => (mode.value === 'markup' ? markupEditor?.focus() : visualEditor?.focus()),
    getMode: () => mode.value,
    getValue: () => value.value,
    hasFocus: () => mode.value === 'markup' ? (markupEditor?.hasFocus() ?? false) : (visualEditor?.hasFocus() ?? false),
    insert,
    isEmpty: () => value.value.length === 0,
    moveCursor,
    prepend: (markup) => setValue(joinMarkdown(markup, value.value)),
    replace: setValue,
    setMode,
    setValue,
});
</script>

<template>
  <section class="markdown-editor" :data-mode="mode" :data-theme="theme">
    <header class="markdown-editor__header">
      <div ref="modeTablist" class="markdown-editor__modes" role="tablist" :aria-label="t('mode')" @keydown="handleModeNavigation">
        <button data-editor-mode="wysiwyg" :aria-selected="mode === 'wysiwyg'" role="tab" type="button" @click="setMode('wysiwyg')">{{ t('visual') }}</button>
        <button data-editor-mode="markup" :aria-selected="mode === 'markup'" role="tab" type="button" @click="setMode('markup')">{{ t('markup') }}</button>
        <button data-editor-mode="split" :aria-selected="mode === 'split'" role="tab" type="button" @click="setMode('split')">{{ t('split') }}</button>
      </div>
      <slot name="header" />
    </header>

    <MarkdownEditorToolbar
      v-if="mode !== 'markup' && !readonly"
      :commands="commands"
      :formula-menu-visible="formulaMenuVisible"
      :heading-menu-visible="headingMenuVisible"
      :image-editor-visible="imageEditorVisible"
      :link-editor-visible="linkEditorVisible"
      :state="toolbarState"
      :text-style-label="textStyleLabel"
      :toolbar-preset="toolbarPreset"
      :toolbar-config="toolbarConfig"
      :translate="t"
      @execute="execute"
      @insert-html="insertHtmlDirective"
      @toggle-formula-menu="toggleFormulaMenu"
      @toggle-heading-menu="showHeadingMenu"
      @toggle-image-editor="toggleImageEditor"
      @toggle-link-editor="toggleLinkEditor"
    >
      <template #default="slotProps"><slot name="toolbar" v-bind="slotProps" /></template>
    </MarkdownEditorToolbar>

    <Teleport to="body">
      <div v-if="headingMenuVisible" ref="headingMenu" class="markdown-editor__floating-menu" role="menu" :aria-label="t('heading')">
        <button v-for="style in ['paragraph', '1', '2', '3', '4', '5', '6']" :key="style" :aria-checked="textStyle === style" role="menuitemradio" type="button" @click="applyTextStyle(style)">{{ style === 'paragraph' ? 'Текст' : `H${style}` }}</button>
      </div>
      <div v-if="formulaMenuVisible" ref="formulaMenu" class="markdown-editor__floating-menu" role="menu" aria-label="Вставить формулу">
        <button role="menuitem" type="button" @mousedown.prevent @click="insertInlineMath">Формула в тексте</button>
        <button role="menuitem" type="button" @mousedown.prevent @click="insertMathBlock">Блок с формулой</button>
      </div>
      <MarkdownEditorLinkForm
        v-if="linkEditorVisible"
        ref="linkForm"
        :has-current-link="toolbarState.linkHref !== undefined"
        :locale="locale"
        :text="linkText"
        :title="linkTitle"
        :url="linkUrl"
        @apply="applyLink"
        @cancel="closeLinkEditor"
        @remove="execute(commands.removeLink)"
        @update:text="linkText = $event"
        @update:title="linkTitle = $event"
        @update:url="linkUrl = $event"
      />
      <MarkdownEditorImageForm
        v-if="imageEditorVisible"
        ref="imageForm"
        :alt="imageAlt"
        :locale="locale"
        :title="imageTitle"
        :url="imageUrl"
        @apply="applyImage"
        @cancel="closeImageEditor"
        @update:alt="imageAlt = $event"
        @update:title="imageTitle = $event"
        @update:url="imageUrl = $event"
      />
    </Teleport>

    <div class="markdown-editor__hosts" :class="{'markdown-editor__hosts--split': mode === 'split'}">
      <div v-if="mode !== 'markup'" ref="visualTarget" class="markdown-editor__visual" />
      <div v-if="mode !== 'wysiwyg'" ref="markupTarget" class="markdown-editor__markup" />
    </div>
  </section>
</template>

<style scoped>
.markdown-editor {
    --markdown-background: #fff;
    --markdown-border: #d8dbe0;
    --markdown-muted-border: #e5e7eb;
    --markdown-text: #202125;
    --markdown-focus-background: #e9efff;
    --markdown-focus-text: #1d3c93;
    overflow: hidden;
    border: 1px solid var(--markdown-border);
    color: var(--markdown-text);
    background: var(--markdown-background);
}

.markdown-editor[data-theme='dark'] {
    --markdown-background: #1e2024;
    --markdown-border: #464b55;
    --markdown-muted-border: #363a42;
    --markdown-text: #f1f3f5;
    --markdown-focus-background: #2d416e;
    --markdown-focus-text: #d7e2ff;
}

@media (prefers-color-scheme: dark) {
    .markdown-editor[data-theme='auto'] { --markdown-background: #1e2024; --markdown-border: #464b55; --markdown-muted-border: #363a42; --markdown-text: #f1f3f5; --markdown-focus-background: #2d416e; --markdown-focus-text: #d7e2ff; }
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
    border-bottom: 1px solid var(--markdown-muted-border);
}

.markdown-editor__modes,
.markdown-editor__toolbar {
    gap: 0.25rem;
}

.markdown-editor__toolbar-group {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.markdown-editor__toolbar-group + .markdown-editor__toolbar-group {
    margin-inline-start: 0.125rem;
    padding-inline-start: 0.375rem;
    border-inline-start: 1px solid var(--markdown-muted-border);
}

.markdown-editor__floating-menu {
    z-index: 10;
    display: grid;
    width: max-content;
    max-width: calc(100vw - 1rem);
    min-width: 11rem;
    padding: 0.25rem;
    border: 1px solid var(--markdown-border);
    border-radius: 0.375rem;
    box-shadow: 0 0.5rem 1.25rem rgb(0 0 0 / 18%);
    background: var(--markdown-background);
}

.markdown-editor__floating-menu button {
    justify-content: flex-start;
    width: 100%;
    padding-inline: 0.5rem;
    white-space: nowrap;
}

.markdown-editor__link-form {
    display: flex;
    gap: 0.25rem;
    z-index: 10;
    width: min(22rem, calc(100vw - 1rem));
    padding: 0.25rem;
    border: 1px solid var(--markdown-border);
    border-radius: 0.375rem;
    box-shadow: 0 0.5rem 1.25rem rgb(0 0 0 / 18%);
    background: var(--markdown-background);
}

.markdown-editor__link-form--extended {
    display: grid;
    grid-template-columns: 1fr auto auto;
}

.markdown-editor__link-form--extended input {
    grid-column: 1 / -1;
}

.markdown-editor__image-form {
    display: grid;
    grid-template-columns: 1fr auto auto;
}

.markdown-editor__image-form input {
    grid-column: 1 / -1;
}

.markdown-editor__color {
    display: inline-flex;
    width: 2rem;
    height: 2rem;
    padding: 0.25rem;
    border-radius: 0.25rem;
}

.markdown-editor__color:focus-within,
.markdown-editor__color:hover {
    background: var(--markdown-focus-background);
}

.markdown-editor__color input {
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
}

.markdown-editor__code-language {
    display: inline-flex;
    height: 2rem;
    padding: 0 0.25rem;
    border-radius: 0.25rem;
    background: var(--markdown-focus-background);
}

.markdown-editor__code-language select {
    max-width: 8rem;
    border: 0;
    color: inherit;
    background: transparent;
    font: inherit;
}

.markdown-editor__link-form input {
    flex: 1;
    min-width: 0;
    height: 2rem;
    padding: 0 0.5rem;
    border: 1px solid var(--markdown-border);
    border-radius: 0.25rem;
    color: inherit;
    background: var(--markdown-background);
    font: inherit;
}

.markdown-editor__link-form button {
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.5rem;
    border: 0;
    border-radius: 0.25rem;
    color: var(--markdown-text);
    background: transparent;
    font: inherit;
    cursor: pointer;
}

.markdown-editor__link-form button:hover,
.markdown-editor__link-form button:focus-visible {
    outline: none;
    color: var(--markdown-focus-text);
    background: var(--markdown-focus-background);
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

.markdown-editor button[aria-selected='true'],
.markdown-editor button[aria-pressed='true'],
.markdown-editor button:hover,
.markdown-editor button:focus-visible {
    outline: none;
    color: var(--markdown-focus-text);
    background: var(--markdown-focus-background);
}

.markdown-editor__toolbar {
    position: sticky;
    z-index: 1;
    top: 0;
    gap: 0.125rem;
    min-height: 2.5rem;
    padding: 0.25rem 0.375rem;
    border-bottom: 1px solid var(--markdown-muted-border);
    background: color-mix(in srgb, var(--markdown-background) 96%, var(--markdown-text));
    flex-wrap: wrap;
}

.markdown-editor__hosts {
    min-width: 0;
    min-height: 20rem;
    overflow: auto;
    resize: vertical;
}

.markdown-editor__hosts--split {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.markdown-editor__hosts--split > :last-child {
    border-left: 1px solid var(--markdown-muted-border);
}

.markdown-editor__visual {
    position: relative;
}

.markdown-editor :deep(.ProseMirror),
.markdown-editor :deep(.cm-editor) {
    min-height: 20rem;
}

.markdown-editor :deep(.ProseMirror) {
    padding: 1rem;
    outline: none;
    line-height: 1.6;
    cursor: text;
}

.markdown-editor :deep(.ProseMirror blockquote) {
    margin: 1rem 0;
    padding-inline-start: 0.75rem;
    border-inline-start: 2px solid #5282ff;
}

.markdown-editor :deep(.ProseMirror blockquote > :first-child) {
    margin-block-start: 0;
}

.markdown-editor :deep(.ProseMirror blockquote > :last-child) {
    margin-block-end: 0;
}

.markdown-editor :deep(.ProseMirror pre) {
    position: relative;
    overflow: auto;
    padding: 1.75rem 0.75rem 0.75rem;
    border-radius: 0.375rem;
    color: #e6edf3;
    background: #161b22;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    line-height: 1.5;
}

.markdown-editor :deep(.ProseMirror a[data-link-tooltip]) {
    position: relative;
}

.markdown-editor :deep(.ProseMirror a[data-link-tooltip]:hover::after),
.markdown-editor :deep(.ProseMirror a[data-link-tooltip]:focus::after) {
    position: absolute;
    z-index: 3;
    bottom: calc(100% + 0.35rem);
    left: 0;
    width: max-content;
    max-width: min(24rem, 80vw);
    padding: 0.25rem 0.4rem;
    overflow: hidden;
    border-radius: 0.25rem;
    color: var(--markdown-background);
    background: var(--markdown-text);
    content: attr(data-link-tooltip);
    font: 0.75rem/1.3 ui-monospace, SFMono-Regular, Menlo, monospace;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.markdown-editor :deep(.ProseMirror pre[data-language]:not([data-language=''])::before) {
    position: absolute;
    top: 0.35rem;
    right: 0.6rem;
    color: #8b949e;
    content: attr(data-language);
    font: 0.72rem/1 ui-monospace, SFMono-Regular, Menlo, monospace;
    text-transform: uppercase;
}

.markdown-editor :deep(.markdown-editor__code-line-number) {
    display: inline-block;
    width: 2.25rem;
    margin-right: 0.75rem;
    user-select: none;
    color: #6e7681;
    text-align: right;
}

.markdown-editor :deep(.markdown-editor__code-token--comment) { color: #8b949e; }
.markdown-editor :deep(.markdown-editor__code-token--keyword) { color: #ff7b72; }
.markdown-editor :deep(.markdown-editor__code-token--number) { color: #79c0ff; }
.markdown-editor :deep(.markdown-editor__code-token--string) { color: #a5d6ff; }
.markdown-editor :deep(.markdown-editor__code-token--tag) { color: #7ee787; }

.markdown-editor :deep(.ProseMirror table) {
    width: 100%;
    margin: 1rem 0;
    border-collapse: collapse;
}

.markdown-editor :deep(.ProseMirror th),
.markdown-editor :deep(.ProseMirror td) {
    position: relative;
    min-width: 5rem;
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--markdown-border);
    text-align: left;
}

.markdown-editor :deep(.markdown-editor__atomic-source-original) {
    display: none;
}

.markdown-editor :deep([data-math-inline]),
.markdown-editor :deep([data-math-block]) {
    position: relative;
}

.markdown-editor :deep(.markdown-editor__math-hint) {
    position: absolute;
    z-index: 1;
    top: calc(100% + 0.2rem);
    left: 0;
    display: none;
    padding: 0.2rem 0.35rem;
    border-radius: 0.25rem;
    color: var(--markdown-text);
    background: var(--markdown-background);
    box-shadow: 0 0.25rem 0.75rem rgb(0 0 0 / 20%);
    font-size: 0.7rem;
    white-space: nowrap;
}

.markdown-editor :deep([data-math-inline]:hover .markdown-editor__math-hint),
.markdown-editor :deep([data-math-block]:hover .markdown-editor__math-hint) {
    display: block;
}

.markdown-editor :deep([data-math-error]) {
    color: #c95050;
}

.markdown-editor :deep(.markdown-editor__math-error) {
    margin: 0;
    font: inherit;
}

.markdown-editor :deep(.markdown-editor__image-resize-handle) {
    position: fixed;
    z-index: 1;
    width: 1.35rem;
    height: 1.35rem;
    margin: 0;
    padding: 0;
    border: 2px solid var(--markdown-background);
    border-radius: 50%;
    color: var(--markdown-background);
    background: var(--markdown-accent);
    box-shadow: 0 0.1rem 0.35rem rgb(0 0 0 / 35%);
    cursor: nwse-resize;
    font-size: 0.8rem;
    line-height: 1;
    vertical-align: bottom;
}

.markdown-editor :deep(img.pm-node-selected) {
    outline: 2px solid var(--markdown-accent);
    outline-offset: 2px;
}

.markdown-editor :deep(.markdown-editor__atomic-source) {
    display: inline-block;
    width: fit-content;
    min-width: 0;
    max-width: 100%;
    margin: 0;
    border: 1px solid #6ba9ff;
    border-radius: 0.25rem;
    background: var(--markdown-background);
    box-shadow: 0 0 0 1px rgb(107 169 255 / 20%);
}

.markdown-editor :deep(.markdown-editor__atomic-source .cm-editor) {
    height: auto;
    min-height: 0;
    max-height: 14rem;
    overflow: auto;
    background: transparent;
}

.markdown-editor :deep(.markdown-editor__atomic-source .cm-scroller) {
    height: auto;
    min-height: 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.markdown-editor :deep(.markdown-editor__atomic-source .cm-content) {
    min-height: 0;
    padding: 0.4rem 0.5rem;
}

.markdown-editor :deep(.markdown-editor__atomic-source .cm-gutters) {
    display: none;
}

:global(.markdown-editor__table-popover) {
    position: absolute;
    z-index: 4;
    top: calc(100% + 0.4rem);
    left: 0;
    display: grid;
    gap: 0.1875rem;
    min-width: 11rem;
    padding: 0.4375rem;
    border: 1px solid color-mix(in srgb, var(--markdown-border) 82%, var(--markdown-text));
    border-radius: 0.5rem;
    background: var(--markdown-background);
    box-shadow: 0 0.75rem 1.5rem rgb(0 0 0 / 30%);
}

:global(.markdown-editor__table-popover-action) {
    width: 100%;
    min-height: 2rem;
    min-width: 0;
    padding: 0.4rem 0.55rem;
    border: 0;
    border-radius: 0.25rem;
    color: var(--markdown-text);
    background: transparent;
    font: inherit;
    font-size: 0.75rem;
    line-height: 1.2;
    text-align: left;
}

:global(.markdown-editor__table-popover-action:hover),
:global(.markdown-editor__table-popover-action:focus-visible) {
    outline: none;
    background: color-mix(in srgb, var(--markdown-background) 84%, var(--markdown-text));
}

:global(.markdown-editor__table-popover-action--danger) {
    margin-top: 0.1875rem;
    color: #c95050;
}

:global(.markdown-editor__table-popover-action--danger + .markdown-editor__table-popover-action--danger) {
    margin-top: 0;
}

:global(.markdown-editor__table-popover-action--danger:hover),
:global(.markdown-editor__table-popover-action--danger:focus-visible) {
    color: #fff;
    background: #a63232;
}

:global(.markdown-editor__table-popover-action:disabled) {
    cursor: not-allowed;
    opacity: 0.45;
}

.markdown-editor :deep(.ProseMirror th) {
    background: color-mix(in srgb, var(--markdown-background) 88%, var(--markdown-text));
}

.markdown-editor :deep(.markdown-editor__folded-content) {
    display: none;
}

.markdown-editor :deep(.markdown-editor__folding-content) {
    position: relative;
}

.markdown-editor :deep(.markdown-editor__folding-heading) {
    position: relative;
    padding-left: 1.4rem;
}

.markdown-editor :deep(.markdown-editor__folding-heading)::before {
    position: absolute;
    top: 0.2em;
    left: 0;
    width: 1rem;
    height: 1rem;
    color: var(--markdown-focus-text);
    content: '⌄';
    cursor: pointer;
    font-size: 0.9em;
    line-height: 1rem;
    text-align: center;
}

.markdown-editor :deep(.markdown-editor__folding-heading--folded)::before {
    content: '›';
}

.markdown-editor :deep(.ProseMirror[data-placeholder]:has(> p:only-child > .ProseMirror-trailingBreak))::before {
    position: absolute;
    color: #8b919e;
    content: attr(data-placeholder);
    pointer-events: none;
}

:global(.markdown-editor__selection-panel) {
    z-index: 3;
    display: inline-flex;
    gap: 0.25rem;
    padding: 0.25rem;
    border: 1px solid #c5cad4;
    border-radius: 0.375rem;
    background: #fff;
    box-shadow: 0 0.5rem 1.5rem rgb(32 33 37 / 16%);
}

:global(.markdown-editor__selection-actions button) {
    min-width: 2rem;
    height: 2rem;
    border: 0;
    border-radius: 0.25rem;
    color: #202125;
    background: transparent;
    cursor: pointer;
}

:global(.markdown-editor__selection-actions button:hover),
:global(.markdown-editor__selection-actions button:focus-visible) {
    outline: none;
    color: #1d3c93;
    background: #e9efff;
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

@media (max-width: 480px) {
    .markdown-editor__header { align-items: flex-start; }
    .markdown-editor__modes, .markdown-editor__toolbar { overflow-x: auto; flex-wrap: nowrap; }
    .markdown-editor__toolbar { padding-inline: 0.25rem; }
}
</style>
