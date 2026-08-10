// @vitest-environment jsdom

import {EditorView} from '@codemirror/view';
import {createApp, h, nextTick, ref} from 'vue';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import MarkdownEditor from './MarkdownEditor.vue';
import type {MarkdownEditorExposed} from './MarkdownEditor.vue';
import type {MarkdownEditorMode} from './public-types';

describe('MarkdownEditor', () => {
    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', class {
            disconnect(): void {}
            observe(): void {}
            unobserve(): void {}
        });
        Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
        Range.prototype.getBoundingClientRect = () => new DOMRect();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        document.body.replaceChildren();
    });

    it('keeps v-model, both split hosts, and mode changes in sync', async () => {
        const changes = vi.fn();
        const editor = ref<MarkdownEditorExposed>();
        const mode = ref<MarkdownEditorMode>('split');
        const modelValue = ref('# Initial');
        const target = document.createElement('div');
        const app = createApp({
            setup: () => () => h(MarkdownEditor, {
                ref: editor,
                mode: mode.value,
                modelValue: modelValue.value,
                'onUpdate:mode': (nextMode: MarkdownEditorMode) => {
                    mode.value = nextMode;
                },
                'onUpdate:modelValue': (nextValue: string) => {
                    changes(nextValue);
                    modelValue.value = nextValue;
                },
            }),
        });

        document.body.append(target);
        app.mount(target);
        await nextTick();

        expect(target.querySelector('.ProseMirror')).not.toBeNull();
        const markupElement = target.querySelector<HTMLElement>('.cm-editor');
        expect(markupElement).not.toBeNull();
        const markupView = EditorView.findFromDOM(markupElement as HTMLElement);
        markupView?.dispatch({changes: {from: 0, to: markupView.state.doc.length, insert: '# Updated'}});
        await nextTick();

        expect(modelValue.value).toBe('# Updated');
        expect(changes).toHaveBeenCalledExactlyOnceWith('# Updated');
        expect(editor.value?.getValue()).toBe('# Updated');

        await editor.value?.setMode('markup');
        await nextTick();

        expect(mode.value).toBe('markup');
        expect(target.querySelector('.ProseMirror')).toBeNull();
        expect(target.querySelector('.cm-editor')).not.toBeNull();

        app.unmount();
        expect(target.childElementCount).toBe(0);
    });

    it('mounts both hosts as non-editable when readonly', async () => {
        const target = document.createElement('div');
        const app = createApp(() => h(MarkdownEditor, {mode: 'split', readonly: true}));

        document.body.append(target);
        app.mount(target);
        await nextTick();

        expect(target.querySelector('.ProseMirror')?.getAttribute('contenteditable')).toBe('false');
        expect(target.querySelector('.cm-content')?.getAttribute('contenteditable')).toBe('false');

        app.unmount();
    });

    it('opens CodeMirror search from the public editor API', async () => {
        const editor = ref<MarkdownEditorExposed>();
        const target = document.createElement('div');
        const app = createApp(() => h(MarkdownEditor, {ref: editor}));

        document.body.append(target);
        app.mount(target);
        await nextTick();
        await editor.value?.openSearch();
        await nextTick();

        expect(target.querySelector('.markdown-editor')?.getAttribute('data-mode')).toBe('markup');
        expect(target.querySelector('.cm-search')).not.toBeNull();
        app.unmount();
    });

    it('localizes labels, applies the selected theme, and supports arrow-key mode navigation', async () => {
        const target = document.createElement('div');
        const app = createApp(() => h(MarkdownEditor, {locale: 'en', theme: 'dark'}));

        document.body.append(target);
        app.mount(target);
        await nextTick();

        const tablist = target.querySelector<HTMLElement>('[role="tablist"]') as HTMLElement;
        expect(tablist.getAttribute('aria-label')).toBe('Editor mode');
        expect(target.querySelector('[title="Formula"]')).not.toBeNull();
        tablist.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, key: 'ArrowRight'}));
        await nextTick();

        expect(target.querySelector('.markdown-editor')?.getAttribute('data-theme')).toBe('dark');
        expect(target.querySelector('.markdown-editor')?.getAttribute('data-mode')).toBe('markup');

        app.unmount();
    });

    it('changes a heading back to ordinary text from the heading picker', async () => {
        const target = document.createElement('div');
        const app = createApp(() => h(MarkdownEditor, {modelValue: '## Heading'}));

        document.body.append(target);
        app.mount(target);
        await nextTick();

        const picker = target.querySelector<HTMLButtonElement>('[aria-label="Уровень заголовка"]') as HTMLButtonElement;
        picker.click();
        await nextTick();
        Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')).find((button) => button.textContent === 'Текст')?.click();
        await nextTick();

        expect(target.querySelector('.ProseMirror h2')).toBeNull();
        expect(target.querySelector('.ProseMirror p')?.textContent).toBe('Heading');

        app.unmount();
    });

    it('reflects the cursor formatting in the toolbar', async () => {
        const target = document.createElement('div');
        const app = createApp(() => h(MarkdownEditor, {modelValue: '# Heading\n\n**Bold**'}));

        document.body.append(target);
        app.mount(target);
        await nextTick();

        const picker = target.querySelector<HTMLButtonElement>('[aria-label="Уровень заголовка"]') as HTMLButtonElement;
        const boldButton = target.querySelector<HTMLButtonElement>('[title="Жирный"]') as HTMLButtonElement;
        const visualElement = target.querySelector<HTMLElement>('.ProseMirror') as HTMLElement;
        expect(picker.textContent).toContain('H1');
        expect(boldButton.getAttribute('aria-pressed')).toBe('false');

        const boldText = visualElement.querySelector('strong')?.firstChild;
        expect(boldText).toBeInstanceOf(Text);
        visualElement.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStart(boldText as Text, 0);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));
        await nextTick();

        expect(picker.textContent).toContain('Текст');
        expect(boldButton.getAttribute('aria-pressed')).toBe('true');

        app.unmount();
    });

    it('supports a minimal toolbar preset and an empty-editor placeholder', async () => {
        const target = document.createElement('div');
        const app = createApp(() => h(MarkdownEditor, {
            placeholder: 'Начните писать',
            toolbarPreset: 'minimal',
        }));

        document.body.append(target);
        app.mount(target);
        await nextTick();

        expect(target.querySelector('.ProseMirror')?.getAttribute('data-placeholder')).toBe('Начните писать');
        expect(target.querySelector('[title="Изображение"]')).toBeNull();
        expect(target.querySelector('[title="Жирный"]')).not.toBeNull();

        app.unmount();
    });

    it('shows the text of an HTML directive in the visual editor', async () => {
        const target = document.createElement('div');
        const app = createApp(() => h(MarkdownEditor, {modelValue: '::: html\n\n<div>Add HTML code here</div>\n\n:::'}));

        document.body.append(target);
        app.mount(target);
        await nextTick();

        expect(target.querySelector('[data-directive-html] div')?.textContent).toBe('Add HTML code here');

        app.unmount();
    });

    it('folds the content under a folding heading from the toolbar', async () => {
        const target = document.createElement('div');
        const app = createApp(() => h(MarkdownEditor, {modelValue: '##+ Section\n\nHidden content'}));

        document.body.append(target);
        app.mount(target);
        await nextTick();

        const headingText = target.querySelector('.ProseMirror h2')?.firstChild;
        const visualElement = target.querySelector<HTMLElement>('.ProseMirror') as HTMLElement;
        expect(headingText).toBeInstanceOf(Text);
        visualElement.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStart(headingText as Text, 0);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));
        await nextTick();

        const foldingButton = target.querySelector<HTMLButtonElement>('[title="Свернуть раздел"]');
        expect(foldingButton).not.toBeNull();
        foldingButton?.click();
        await nextTick();

        expect(target.querySelector('.markdown-editor__folded-content')?.textContent).toBe('Hidden content');
        expect(foldingButton?.getAttribute('aria-pressed')).toBe('true');

        app.unmount();
    });

    it('inserts an HTML directive and switches to markup mode', async () => {
        const target = document.createElement('div');
        const editor = ref<MarkdownEditorExposed>();
        const app = createApp(() => h(MarkdownEditor, {modelValue: 'Text', ref: editor}));

        document.body.append(target);
        app.mount(target);
        await nextTick();

        target.querySelector<HTMLButtonElement>('[title="HTML"]')?.click();
        await nextTick();
        await nextTick();

        expect(editor.value?.getMode()).toBe('markup');
        expect(editor.value?.getValue()).toContain('::: html\n\n<div>Add HTML code here</div>\n\n:::');

        app.unmount();
    });

    it('inserts a LaTeX block and switches to markup mode', async () => {
        const target = document.createElement('div');
        const editor = ref<MarkdownEditorExposed>();
        const app = createApp(() => h(MarkdownEditor, {modelValue: 'Text', ref: editor}));

        document.body.append(target);
        app.mount(target);
        await nextTick();

        target.querySelector<HTMLButtonElement>('[title="Формула"]')?.click();
        await nextTick();
        document.querySelector<HTMLButtonElement>('[role="menuitem"]:last-child')?.click();
        await nextTick();

        expect(editor.value?.getMode()).toBe('markup');
        expect(editor.value?.getValue()).toContain('$$\nE = mc^2\n$$');

        app.unmount();
    });
});
