// @vitest-environment jsdom

import {EditorView} from '@codemirror/view';
import {TextSelection} from 'prosemirror-state';
import {EditorView as ProseMirrorEditorView} from 'prosemirror-view';
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

    it('changes a heading back to ordinary text from the heading picker', async () => {
        const target = document.createElement('div');
        const app = createApp(() => h(MarkdownEditor, {modelValue: '## Heading'}));

        document.body.append(target);
        app.mount(target);
        await nextTick();

        const picker = target.querySelector<HTMLSelectElement>('[aria-label="Уровень заголовка"]') as HTMLSelectElement;
        picker.value = 'paragraph';
        picker.dispatchEvent(new Event('change', {bubbles: true}));
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

        const picker = target.querySelector<HTMLSelectElement>('[aria-label="Уровень заголовка"]') as HTMLSelectElement;
        const boldButton = target.querySelector<HTMLButtonElement>('[title="Жирный"]') as HTMLButtonElement;
        const visualElement = target.querySelector<HTMLElement>('.ProseMirror') as HTMLElement;
        const visualView = ProseMirrorEditorView.findFromDOM(visualElement) as ProseMirrorEditorView;

        expect(picker.value).toBe('1');
        expect(boldButton.getAttribute('aria-pressed')).toBe('false');

        const boldTextPosition = visualView.state.doc.child(0).nodeSize + 1;
        visualView.dispatch(visualView.state.tr.setSelection(TextSelection.create(visualView.state.doc, boldTextPosition)));
        await nextTick();

        expect(picker.value).toBe('paragraph');
        expect(boldButton.getAttribute('aria-pressed')).toBe('true');

        app.unmount();
    });
});
