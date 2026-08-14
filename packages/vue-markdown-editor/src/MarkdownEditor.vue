<script setup lang="ts">
import {autoUpdate, computePosition, flip, offset, shift} from '@floating-ui/dom';
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue';

import MarkdownEditorModeTabs from './components/MarkdownEditorModeTabs.vue';
import MarkdownEditorSelectionActions from './components/MarkdownEditorSelectionActions.vue';
import MarkdownEditorToolbar from './components/MarkdownEditorToolbar.vue';
import MarkdownEditorImageForm from './forms/MarkdownEditorImageForm.vue';
import MarkdownEditorLinkForm from './forms/MarkdownEditorLinkForm.vue';
import {getMarkdownEditorMessages} from './i18n';
import type {MarkdownEditorMessageKey} from './i18n';
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
const textStyleLabel = computed(() => textStyle.value === 'paragraph' ? t('paragraph') : `H${textStyle.value}`);
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

function t(key: MarkdownEditorMessageKey): string {
    return getMarkdownEditorMessages(props.locale)[key];
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
                component: MarkdownEditorSelectionActions,
                props: {
                    boldLabel: t('selectionBold'),
                    italicLabel: t('selectionItalic'),
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
      <MarkdownEditorModeTabs :mode="mode" :set-mode="setMode" :translate="t" />
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
      <div v-if="headingMenuVisible" ref="headingMenu" class="markdown-editor__floating-menu" :data-theme="theme" role="menu" :aria-label="t('heading')">
        <button v-for="style in ['paragraph', '1', '2', '3', '4', '5', '6']" :key="style" :aria-checked="textStyle === style" role="menuitemradio" type="button" @click="applyTextStyle(style)">{{ style === 'paragraph' ? t('paragraph') : `H${style}` }}</button>
      </div>
      <div v-if="formulaMenuVisible" ref="formulaMenu" class="markdown-editor__floating-menu" :data-theme="theme" role="menu" :aria-label="t('formulaInsert')">
        <button role="menuitem" type="button" @mousedown.prevent @click="insertInlineMath">{{ t('formulaInline') }}</button>
        <button role="menuitem" type="button" @mousedown.prevent @click="insertMathBlock">{{ t('formulaBlock') }}</button>
      </div>
      <MarkdownEditorLinkForm
        v-if="linkEditorVisible"
        ref="linkForm"
        :has-current-link="toolbarState.linkHref !== undefined"
        :locale="locale"
        :theme="theme"
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
        :theme="theme"
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

<style scoped src="./styles/markdown-editor.css"></style>
