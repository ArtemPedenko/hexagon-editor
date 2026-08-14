<script setup lang="ts">
import {autoUpdate, computePosition, flip, offset, shift} from '@floating-ui/dom';
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue';

import MarkdownEditorSelectionActions from './components/MarkdownEditorSelectionActions.vue';
import MarkdownEditorToolbar from './components/MarkdownEditorToolbar.vue';
import ToolbarIcon from './components/MarkdownEditorToolbarIcon.vue';
import MarkdownEditorImageForm from './forms/MarkdownEditorImageForm.vue';
import MarkdownEditorLinkForm from './forms/MarkdownEditorLinkForm.vue';
import {getMarkdownEditorMessages} from './i18n';
import type {MarkdownEditorMessageKey} from './i18n';
import {
    createBasicEditorCommands,
    mountBasicMarkupEditor,
    mountBasicWysiwygEditor,
} from './core';
import {localizeRenderedMath} from './core/basic-editor-renderers';
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
const codeMenuVisible = ref(false);
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
const listMenuVisible = ref(false);
const linkUrl = ref('');
const linkText = ref('');
const linkOpenInNewWindow = ref(false);
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
    linkOpenInNewWindow: false,
    linkText: undefined,
    listIndentEnabled: false,
    listOutdentEnabled: false,
    italic: false,
    mark: false,
    mermaid: false,
    orderedList: false,
    quote: false,
    strikethrough: false,
    underline: false,
});
const textStyle = computed(() => toolbarState.value.headingLevel?.toString() ?? 'paragraph');
const textStyleLabel = computed(() => textStyle.value === 'paragraph' ? 'H' : `H${textStyle.value}`);
const mathBlock = '$$\nE = mc^2\n$$';
const formulaMenu = ref<HTMLElement>();
const codeMenu = ref<HTMLElement>();
const headingMenu = ref<HTMLElement>();
const headingMenuVisible = ref(false);
const listMenu = ref<HTMLElement>();
const modeMenu = ref<HTMLElement>();
const modeMenuVisible = ref(false);
const editorModes: MarkdownEditorMode[] = ['wysiwyg', 'markup', 'split'];
let stopImageFloating: (() => void) | undefined;
const linkForm = ref<InstanceType<typeof MarkdownEditorLinkForm>>();
let stopFormulaFloating: (() => void) | undefined;
let stopCodeFloating: (() => void) | undefined;
let stopHeadingFloating: (() => void) | undefined;
let stopLinkFloating: (() => void) | undefined;
let stopListFloating: (() => void) | undefined;
let stopModeFloating: (() => void) | undefined;
let markupEditor: BasicMarkupEditor | undefined;
let modeChangeId = 0;
let syncing = false;
let suppressNextLinkAutoOpen = false;
let visualEditor: BasicWysiwygEditor | undefined;

function t(key: MarkdownEditorMessageKey): string {
    return getMarkdownEditorMessages(props.locale)[key];
}

function headingMenuLabel(style: string): string {
    if (style === 'paragraph') return t('paragraph');
    return props.locale === 'ru' ? `Заголовок ${style}` : `Heading ${style}`;
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
        linkOpenInNewWindow: false,
        linkText: undefined,
        listIndentEnabled: false,
        listOutdentEnabled: false,
        italic: false,
        mark: false,
        mermaid: false,
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

    suppressNextLinkAutoOpen = true;
    const text = linkText.value.trim() || linkUrl.value.trim();
    execute(commands.setLink(linkUrl.value.trim(), text, text, linkOpenInNewWindow.value));
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

async function toggleCodeMenu(reference: HTMLElement): Promise<void> {
    codeMenuVisible.value = !codeMenuVisible.value;
    stopCodeFloating?.();
    stopCodeFloating = undefined;
    if (!codeMenuVisible.value) return;
    await nextTick();
    startFloating(reference, codeMenu.value, (cleanup) => { stopCodeFloating = cleanup; });
}

function executeCodeCommand(command: Parameters<BasicWysiwygEditor['run']>[0]): void {
    execute(command);
    codeMenuVisible.value = false;
    stopCodeFloating?.();
    stopCodeFloating = undefined;
}

async function toggleLinkEditor(reference: HTMLElement): Promise<void> {
    linkEditorVisible.value = !linkEditorVisible.value;
    stopLinkFloating?.();
    stopLinkFloating = undefined;
    if (!linkEditorVisible.value) return;
    linkUrl.value = toolbarState.value.linkHref ?? '';
    linkText.value = toolbarState.value.linkText ?? window.getSelection()?.toString().trim() ?? '';
    linkOpenInNewWindow.value = toolbarState.value.linkOpenInNewWindow;
    await nextTick();
    startFloating(reference, linkForm.value?.element, (cleanup) => { stopLinkFloating = cleanup; });
}

async function showLinkEditorAtCursor(reference?: HTMLElement): Promise<void> {
    const href = toolbarState.value.linkHref;
    if (href === undefined && reference === undefined) {
        closeLinkEditor();
        return;
    }

    linkUrl.value = reference?.getAttribute('href') ?? href ?? '';
    linkText.value = reference?.textContent ?? toolbarState.value.linkText ?? '';
    linkOpenInNewWindow.value = reference?.getAttribute('target') === '_blank' || toolbarState.value.linkOpenInNewWindow;
    linkEditorVisible.value = true;
    await nextTick();
    const anchorNode = window.getSelection()?.anchorNode;
    const anchorElement = anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement;
    const link = reference ?? anchorElement?.closest<HTMLElement>('a');
    if (link === undefined || link === null) return;
    stopLinkFloating?.();
    startFloating(link, linkForm.value?.element, (cleanup) => { stopLinkFloating = cleanup; });
}

function handleEditorClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest<HTMLElement>('.ProseMirror a');
    if (link === null) return;
    event.preventDefault();
    visualEditor?.selectElement(link);
    void showLinkEditorAtCursor(link);
}

async function toggleListMenu(reference: HTMLElement): Promise<void> {
    listMenuVisible.value = !listMenuVisible.value;
    stopListFloating?.();
    stopListFloating = undefined;
    if (!listMenuVisible.value) return;
    await nextTick();
    startFloating(reference, listMenu.value, (cleanup) => { stopListFloating = cleanup; });
}

function executeListCommand(command: Parameters<BasicWysiwygEditor['run']>[0]): void {
    execute(command);
    listMenuVisible.value = false;
    stopListFloating?.();
    stopListFloating = undefined;
}

async function toggleImageEditor(reference: HTMLElement): Promise<void> {
    imageEditorVisible.value = !imageEditorVisible.value;
    stopImageFloating?.();
    stopImageFloating = undefined;
    if (!imageEditorVisible.value) return;
    await nextTick();
    startFloating(reference, imageForm.value?.element, (cleanup) => { stopImageFloating = cleanup; });
}

async function toggleModeMenu(reference: HTMLElement): Promise<void> {
    modeMenuVisible.value = !modeMenuVisible.value;
    stopModeFloating?.();
    stopModeFloating = undefined;
    if (!modeMenuVisible.value) return;
    await nextTick();
    startFloating(reference, modeMenu.value, (cleanup) => { stopModeFloating = cleanup; });
}

async function selectEditorMode(nextMode: MarkdownEditorMode): Promise<void> {
    modeMenuVisible.value = false;
    stopModeFloating?.();
    stopModeFloating = undefined;
    await setMode(nextMode);
}

function insertHtmlDirective(): void {
    visualEditor?.run(commands.insertHtml);
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
    if (!codeMenu.value?.contains(target)) {
        codeMenuVisible.value = false;
        stopCodeFloating?.();
        stopCodeFloating = undefined;
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
    if (!listMenu.value?.contains(target)) {
        listMenuVisible.value = false;
        stopListFloating?.();
        stopListFloating = undefined;
    }
    if (!imageForm.value?.element?.contains(target)) {
        imageEditorVisible.value = false;
        stopImageFloating?.();
        stopImageFloating = undefined;
    }
    if (!modeMenu.value?.contains(target)) {
        modeMenuVisible.value = false;
        stopModeFloating?.();
        stopModeFloating = undefined;
    }
}

function closePanelsOnEscape(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    headingMenuVisible.value = false;
    codeMenuVisible.value = false;
    formulaMenuVisible.value = false;
    imageEditorVisible.value = false;
    linkEditorVisible.value = false;
    listMenuVisible.value = false;
    modeMenuVisible.value = false;
    stopHeadingFloating?.();
    stopCodeFloating?.();
    stopFormulaFloating?.();
    stopImageFloating?.();
    stopLinkFloating?.();
    stopListFloating?.();
    stopModeFloating?.();
    stopHeadingFloating = undefined;
    stopCodeFloating = undefined;
    stopFormulaFloating = undefined;
    stopImageFloating = undefined;
    stopLinkFloating = undefined;
    stopListFloating = undefined;
    stopModeFloating = undefined;
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
            onChange: (nextValue) => {
                updateValue(nextValue, 'visual');
                if (visualTarget.value !== undefined) localizeRenderedMath(visualTarget.value, props.locale);
            },
            onSelectionChange: (nextSelection) => {
                toolbarState.value = nextSelection;
                if (suppressNextLinkAutoOpen) {
                    suppressNextLinkAutoOpen = false;
                } else {
                    void showLinkEditorAtCursor();
                }
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
        localizeRenderedMath(visualTarget.value, props.locale);
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
    () => props.locale,
    (locale) => {
        if (visualTarget.value !== undefined) localizeRenderedMath(visualTarget.value, locale);
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
    stopCodeFloating?.();
    stopFormulaFloating?.();
    stopImageFloating?.();
    stopLinkFloating?.();
    stopListFloating?.();
    stopModeFloating?.();
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
  <section class="markdown-editor" :data-locale="locale" :data-mode="mode" :data-theme="theme" @click="handleEditorClick">
    <header v-if="$slots.header" class="markdown-editor__header">
      <slot name="header" />
    </header>

    <MarkdownEditorToolbar
      v-if="!readonly"
      :commands="commands"
      :code-menu-visible="codeMenuVisible"
      :formula-menu-visible="formulaMenuVisible"
      :heading-menu-visible="headingMenuVisible"
      :image-editor-visible="imageEditorVisible"
      :link-editor-visible="linkEditorVisible"
      :list-menu-visible="listMenuVisible"
      :mode="mode"
      :mode-menu-visible="modeMenuVisible"
      :state="toolbarState"
      :text-style-label="textStyleLabel"
      :toolbar-preset="toolbarPreset"
      :toolbar-config="toolbarConfig"
      :translate="t"
      @execute="execute"
      @insert-html="insertHtmlDirective"
      @toggle-formula-menu="toggleFormulaMenu"
      @toggle-code-menu="toggleCodeMenu"
      @toggle-heading-menu="showHeadingMenu"
      @toggle-image-editor="toggleImageEditor"
      @toggle-link-editor="toggleLinkEditor"
      @toggle-list-menu="toggleListMenu"
      @toggle-mode-menu="toggleModeMenu"
    >
      <template #default="slotProps"><slot name="toolbar" v-bind="slotProps" /></template>
    </MarkdownEditorToolbar>

    <Teleport to="body">
      <div v-if="codeMenuVisible" ref="codeMenu" class="markdown-editor__floating-menu" :data-theme="theme" role="menu" :aria-label="t('code')">
        <button :aria-checked="toolbarState.code" role="menuitemradio" type="button" @mousedown.prevent @click="executeCodeCommand(commands.code)"><ToolbarIcon name="code" /><span>{{ t('code') }}</span></button>
        <button :aria-checked="toolbarState.codeBlock" role="menuitemradio" type="button" @mousedown.prevent @click="executeCodeCommand(commands.codeBlock)"><span class="markdown-editor__floating-menu-icon">{ }</span><span>{{ t('codeBlock') }}</span></button>
      </div>
      <div v-if="headingMenuVisible" ref="headingMenu" class="markdown-editor__floating-menu" :data-theme="theme" role="menu" :aria-label="t('heading')">
        <button v-for="style in ['paragraph', '1', '2', '3', '4', '5', '6']" :key="style" :aria-checked="textStyle === style" role="menuitemradio" type="button" @click="applyTextStyle(style)">
          <span class="markdown-editor__floating-menu-icon">{{ style === 'paragraph' ? 'T' : `H${style}` }}</span>
          <span>{{ headingMenuLabel(style) }}</span>
        </button>
      </div>
      <div v-if="formulaMenuVisible" ref="formulaMenu" class="markdown-editor__floating-menu" :data-theme="theme" role="menu" :aria-label="t('formulaInsert')">
        <button role="menuitem" type="button" @mousedown.prevent @click="insertInlineMath"><span class="markdown-editor__floating-menu-icon">ƒ</span><span>{{ t('formulaInline') }}</span></button>
        <button role="menuitem" type="button" @mousedown.prevent @click="insertMathBlock"><span class="markdown-editor__floating-menu-icon">∑</span><span>{{ t('formulaBlock') }}</span></button>
      </div>
      <div v-if="listMenuVisible" ref="listMenu" class="markdown-editor__floating-menu markdown-editor__floating-menu--list" :data-theme="theme" role="menu" :aria-label="t('bulletList')">
        <button :aria-checked="toolbarState.bulletList" role="menuitemradio" type="button" @mousedown.prevent @click="executeListCommand(commands.bulletList)"><ToolbarIcon name="bulletList" /><span>{{ t('bulletList') }}</span></button>
        <button :aria-checked="toolbarState.orderedList" role="menuitemradio" type="button" @mousedown.prevent @click="executeListCommand(commands.orderedList)"><ToolbarIcon name="orderedList" /><span>{{ t('orderedList') }}</span></button>
        <button :disabled="!toolbarState.listIndentEnabled" role="menuitem" type="button" @mousedown.prevent @click="executeListCommand(commands.sinkListItem)"><span class="markdown-editor__floating-menu-icon">→</span><span>{{ t('listIndent') }}</span><kbd>Tab</kbd></button>
        <button :disabled="!toolbarState.listOutdentEnabled" role="menuitem" type="button" @mousedown.prevent @click="executeListCommand(commands.liftListItem)"><span class="markdown-editor__floating-menu-icon">←</span><span>{{ t('listOutdent') }}</span><kbd>⇧ Tab</kbd></button>
      </div>
      <div v-if="modeMenuVisible" ref="modeMenu" class="markdown-editor__floating-menu" :data-theme="theme" role="menu" :aria-label="t('mode')">
        <button v-for="editorMode in editorModes" :key="editorMode" :aria-checked="mode === editorMode" role="menuitemradio" type="button" @click="selectEditorMode(editorMode)">
          <span>{{ t(editorMode === 'wysiwyg' ? 'visual' : editorMode) }}</span>
        </button>
      </div>
      <MarkdownEditorLinkForm
        v-if="linkEditorVisible"
        ref="linkForm"
        :has-current-link="toolbarState.linkHref !== undefined"
        :locale="locale"
        :open-in-new-window="linkOpenInNewWindow"
        :theme="theme"
        :text="linkText"
        :url="linkUrl"
        @apply="applyLink"
        @cancel="closeLinkEditor"
        @remove="execute(commands.removeLink)"
        @update:text="linkText = $event"
        @update:url="linkUrl = $event"
        @update:open-in-new-window="linkOpenInNewWindow = $event"
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
