<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue';

import MarkdownEditorFloatingMenus from './components/MarkdownEditorFloatingMenus.vue';
import MarkdownEditorImageActions from './components/MarkdownEditorImageActions.vue';
import MarkdownEditorToolbar from './components/MarkdownEditorToolbar.vue';
import {useFloatingPanel} from './composables/useFloatingPanel';
import {joinMarkdown, useMarkdownEditorValue} from './composables/useMarkdownEditorValue';
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
const markupTarget = ref<HTMLElement>();
const visualTarget = ref<HTMLElement>();
const mode = ref<MarkdownEditorMode>(props.mode);
const imageUrl = ref('https://');
const imageAlt = ref('');
const imageTitle = ref('');
const imageForm = ref<InstanceType<typeof MarkdownEditorImageForm>>();
const linkUrl = ref('');
const linkText = ref('');
const linkOpenInNewWindow = ref(false);
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
const linkForm = ref<InstanceType<typeof MarkdownEditorLinkForm>>();
const floatingMenus = ref<InstanceType<typeof MarkdownEditorFloatingMenus>>();
const imageActions = ref<InstanceType<typeof MarkdownEditorImageActions>>();
const codePanel = useFloatingPanel(() => floatingMenus.value?.getElement('code'));
const formulaPanel = useFloatingPanel(() => floatingMenus.value?.getElement('formula'));
const headingPanel = useFloatingPanel(() => floatingMenus.value?.getElement('heading'));
const imagePanel = useFloatingPanel(() => imageForm.value?.element);
const imageActionsPanel = useFloatingPanel(() => imageActions.value?.element, {placement: 'top'});
const linkPanel = useFloatingPanel(() => linkForm.value?.element);
const listPanel = useFloatingPanel(() => floatingMenus.value?.getElement('list'));
const modePanel = useFloatingPanel(() => floatingMenus.value?.getElement('mode'));
let markupEditor: BasicMarkupEditor | undefined;
let modeChangeId = 0;
let suppressNextLinkAutoOpen = false;
let visualEditor: BasicWysiwygEditor | undefined;
const {setExternalValue, setValue, updateFromHost: updateValue, value} = useMarkdownEditorValue({
    getMarkupHost: () => markupEditor,
    getVisualHost: () => visualEditor,
    initialValue: props.modelValue,
    onChange: (nextValue) => {
        emit('update:modelValue', nextValue);
        emit('change', nextValue);
    },
});

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
    linkPanel.close();
}

function closeLinkEditor(): void {
    linkPanel.close();
}

function applyImage(): void {
    const src = imageUrl.value.trim();
    if (src.length === 0) return;
    execute(commands.insertImage(src, imageAlt.value.trim() || 'Image', imageTitle.value.trim() || undefined));
    imagePanel.close();
}

function closeImageEditor(): void {
    imagePanel.close();
}

function applyTextStyle(style: string): void {
    if (style === 'paragraph') {
        execute(commands.paragraph);
    } else {
        execute(commands.heading(Number(style)));
    }

    headingPanel.close();
}

async function showHeadingMenu(reference: HTMLElement): Promise<void> {
    await headingPanel.toggle(reference);
}

async function toggleCodeMenu(reference: HTMLElement): Promise<void> {
    await codePanel.toggle(reference);
}

function executeCodeCommand(command: Parameters<BasicWysiwygEditor['run']>[0]): void {
    execute(command);
    codePanel.close();
}

async function toggleLinkEditor(reference: HTMLElement): Promise<void> {
    if (linkPanel.visible.value) {
        linkPanel.close();
        return;
    }
    linkUrl.value = toolbarState.value.linkHref ?? '';
    linkText.value = toolbarState.value.linkText ?? window.getSelection()?.toString().trim() ?? '';
    linkOpenInNewWindow.value = toolbarState.value.linkOpenInNewWindow;
    await linkPanel.open(reference);
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
    const anchorNode = window.getSelection()?.anchorNode;
    const anchorElement = anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement;
    const link = reference ?? anchorElement?.closest<HTMLElement>('a');
    if (link === undefined || link === null) return;
    await linkPanel.open(link);
}

function handleEditorClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const image = target.closest<HTMLImageElement>('.ProseMirror img');
    if (image !== null) {
        event.preventDefault();
        visualEditor?.selectElement(image);
        void imageActionsPanel.open(image);
        return;
    }
    const link = target.closest<HTMLElement>('.ProseMirror a');
    if (link === null) return;
    event.preventDefault();
    visualEditor?.selectElement(link);
    void showLinkEditorAtCursor(link);
}

async function toggleListMenu(reference: HTMLElement): Promise<void> {
    await listPanel.toggle(reference);
}

function executeListCommand(command: Parameters<BasicWysiwygEditor['run']>[0]): void {
    execute(command);
    listPanel.close();
}

async function toggleImageEditor(reference: HTMLElement): Promise<void> {
    await imagePanel.toggle(reference);
}

async function executeImageDisplay(command: Parameters<BasicWysiwygEditor['run']>[0]): Promise<void> {
    execute(command);
    await nextTick();
    const image = visualTarget.value?.querySelector<HTMLImageElement>('.ProseMirror img.ProseMirror-selectednode');
    if (image !== undefined && image !== null) await imageActionsPanel.open(image);
}

async function toggleModeMenu(reference: HTMLElement): Promise<void> {
    await modePanel.toggle(reference);
}

async function selectEditorMode(nextMode: MarkdownEditorMode): Promise<void> {
    modePanel.close();
    await setMode(nextMode);
}

function insertHtmlDirective(): void {
    visualEditor?.run(commands.insertHtml);
}

async function insertMathBlock(): Promise<void> {
    formulaPanel.close();
    if (toolbarState.value.formula) {
        return;
    }
    visualEditor?.run(commands.insertMathBlock);
}

function insertInlineMath(): void {
    formulaPanel.close();
    visualEditor?.run(commands.insertInlineMath);
}

async function toggleFormulaMenu(reference: HTMLElement): Promise<void> {
    if (!toolbarState.value.formula) {
        await formulaPanel.toggle(reference);
    }
}

function closeFloatingPanels(event: PointerEvent): void {
    const target = event.target;
    if (!(target instanceof Node)) return;
    for (const panel of [headingPanel, codePanel, formulaPanel, linkPanel, listPanel, imagePanel, imageActionsPanel, modePanel]) {
        if (!panel.contains(target)) panel.close();
    }
}

function closePanelsOnEscape(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    for (const panel of [headingPanel, codePanel, formulaPanel, linkPanel, listPanel, imagePanel, imageActionsPanel, modePanel]) panel.close();
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

        setExternalValue(nextValue);
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
      :code-menu-visible="codePanel.visible.value"
      :formula-menu-visible="formulaPanel.visible.value"
      :heading-menu-visible="headingPanel.visible.value"
      :image-editor-visible="imagePanel.visible.value"
      :link-editor-visible="linkPanel.visible.value"
      :list-menu-visible="listPanel.visible.value"
      :mode="mode"
      :mode-menu-visible="modePanel.visible.value"
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
      <MarkdownEditorFloatingMenus
        ref="floatingMenus"
        :code-visible="codePanel.visible.value"
        :formula-visible="formulaPanel.visible.value"
        :heading-visible="headingPanel.visible.value"
        :list-visible="listPanel.visible.value"
        :mode="mode"
        :mode-visible="modePanel.visible.value"
        :state="toolbarState"
        :text-style="textStyle"
        :theme="theme"
        :translate="t"
        @bullet-list="executeListCommand(commands.bulletList)"
        @code-block="executeCodeCommand(commands.codeBlock)"
        @indent-list="executeListCommand(commands.sinkListItem)"
        @inline-code="executeCodeCommand(commands.code)"
        @inline-formula="insertInlineMath"
        @math-block="insertMathBlock"
        @ordered-list="executeListCommand(commands.orderedList)"
        @outdent-list="executeListCommand(commands.liftListItem)"
        @select-mode="selectEditorMode"
        @select-text-style="applyTextStyle"
      />
      <MarkdownEditorLinkForm
        v-if="linkPanel.visible.value"
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
        v-if="imagePanel.visible.value"
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
      <MarkdownEditorImageActions
        v-if="imageActionsPanel.visible.value"
        ref="imageActions"
        :object-fit="toolbarState.imageObjectFit"
        :theme="theme"
        :translate="t"
        @full-width="executeImageDisplay(commands.setImageDisplay('100%', 'contain', null))"
        @object-fit="executeImageDisplay(commands.setImageDisplay(undefined, $event))"
      />
    </Teleport>

    <div class="markdown-editor__hosts" :class="{'markdown-editor__hosts--split': mode === 'split'}">
      <div v-if="mode !== 'markup'" ref="visualTarget" class="markdown-editor__visual" />
      <div v-if="mode !== 'wysiwyg'" ref="markupTarget" class="markdown-editor__markup" />
    </div>
  </section>
</template>

<style scoped src="./styles/markdown-editor.css"></style>
