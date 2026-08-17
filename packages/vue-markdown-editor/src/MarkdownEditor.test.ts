// @vitest-environment jsdom
/* eslint-disable vue/one-component-per-file -- Tests define isolated inline components. */

import {EditorView} from '@codemirror/view';
import {createApp, defineComponent, h, nextTick, ref} from 'vue';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import MarkdownEditor from './MarkdownEditor.vue';
import type {MarkdownEditorExposed} from './MarkdownEditor.vue';
import type {MarkdownEditorMode} from './public-types';

describe('MarkdownEditor', () => {
    it('exposes the common editor value API through the component ref', async () => {
        const target = document.createElement('div');
        const editor = ref<MarkdownEditorExposed>();
        const app = createApp(() => h(MarkdownEditor, {modelValue: 'middle', ref: editor}));

        document.body.append(target);
        app.mount(target);
        await nextTick();

        editor.value?.prepend('first');
        editor.value?.append('last');
        expect(editor.value?.getValue()).toBe('first\n\nmiddle\n\nlast');
        expect(editor.value?.isEmpty()).toBe(false);
        editor.value?.clear();
        expect(editor.value?.isEmpty()).toBe(true);
        editor.value?.replace('replacement');
        expect(editor.value?.getValue()).toBe('replacement');

        app.unmount();
    });

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

    it('emits cancel and submit from visual editor shortcuts', async () => {
        const cancel = vi.fn();
        const submit = vi.fn();
        const target = document.createElement('div');
        const app = createApp(() => h(MarkdownEditor, {onCancel: cancel, onSubmit: submit}));

        document.body.append(target);
        app.mount(target);
        await nextTick();

        const content = target.querySelector<HTMLElement>('.ProseMirror');
        content?.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, key: 'Escape'}));
        content?.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, ctrlKey: true, key: 'Enter'}));

        expect(cancel).toHaveBeenCalledOnce();
        expect(submit).toHaveBeenCalledOnce();
        app.unmount();
    });

    it('localizes labels, applies the selected theme, and switches modes from the toolbar', async () => {
        const target = document.createElement('div');
        const app = createApp(() => h(MarkdownEditor, {locale: 'en', theme: 'dark', toolbarPreset: 'full'}));

        document.body.append(target);
        app.mount(target);
        await nextTick();

        const modeButton = target.querySelector<HTMLButtonElement>('[data-toolbar-item="mode"]') as HTMLButtonElement;
        expect(modeButton.getAttribute('aria-label')).toBe('Editor mode');
        expect(modeButton.getAttribute('aria-expanded')).toBe('false');
        expect(target.querySelector('[title="Formula"]')).not.toBeNull();
        expect(target.querySelector('[title="Bulleted list"]')).not.toBeNull();
        expect(target.querySelector('[data-markdown-editor-toolbar]')?.getAttribute('aria-label')).toBe('Markdown formatting');
        modeButton.click();
        await nextTick();

        const modeMenu = document.body.querySelector<HTMLElement>('[role="menu"][aria-label="Editor mode"]') as HTMLElement;
        expect(modeMenu.getAttribute('data-theme')).toBe('dark');
        expect(modeMenu.querySelector('[role="menuitemradio"][aria-checked="true"]')?.textContent).toBe('Visual');
        modeMenu.querySelector<HTMLButtonElement>('[role="menuitemradio"]:nth-child(2)')?.click();
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
        Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')).find((button) => button.textContent?.includes('Текст'))?.click();
        await nextTick();

        expect(target.querySelector('.ProseMirror h2')).toBeNull();
        expect(target.querySelector('.ProseMirror p')?.textContent).toBe('Heading');

        app.unmount();
    });

    it('applies toolbar commands to the markup editor', async () => {
        const modelValue = ref('selected text');
        const target = document.createElement('div');
        const app = createApp({
            setup: () => () => h(MarkdownEditor, {
                mode: 'split',
                modelValue: modelValue.value,
                'onUpdate:modelValue': (nextValue: string) => {
                    modelValue.value = nextValue;
                },
            }),
        });

        document.body.append(target);
        app.mount(target);
        await nextTick();

        const markupElement = target.querySelector<HTMLElement>('.cm-editor') as HTMLElement;
        const markupView = EditorView.findFromDOM(markupElement);
        markupView?.focus();
        markupView?.dispatch({selection: {anchor: 0, head: modelValue.value.length}});
        target.querySelector<HTMLButtonElement>('[data-toolbar-item="bold"]')?.click();
        await nextTick();

        expect(modelValue.value).toBe('**selected text**');

        markupView?.dispatch({selection: {anchor: 0, head: modelValue.value.length}});
        target.querySelector<HTMLButtonElement>('[data-toolbar-item="list"]')?.click();
        await nextTick();
        Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'))
            .find((button) => button.textContent?.includes('Маркированный'))
            ?.click();
        await nextTick();

        expect(modelValue.value).toBe('* **selected text**');
		expect(markupView?.state.selection.main.empty).toBe(false);

        app.unmount();
    });

	it('keeps a collapsed markup cursor collapsed when inserting an ordered list marker', async () => {
		const target = document.createElement('div');
		const app = createApp(() => h(MarkdownEditor, {mode: 'markup', modelValue: 'item'}));

		document.body.append(target);
		app.mount(target);
		await nextTick();

		const markupElement = target.querySelector<HTMLElement>('.cm-editor') as HTMLElement;
		const markupView = EditorView.findFromDOM(markupElement);
		markupView?.dispatch({selection: {anchor: 4}});
		target.querySelector<HTMLButtonElement>('[data-toolbar-item="list"]')?.click();
		await nextTick();
		Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'))
			.find((button) => button.textContent?.includes('Нумерованный'))
			?.click();
		await nextTick();

		expect(markupView?.state.doc.toString()).toBe('1. item');
		expect(markupView?.state.selection.main.empty).toBe(true);
		expect(markupView?.state.selection.main.head).toBe(7);

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

        expect(picker.textContent).toContain('H');
        expect(boldButton.getAttribute('aria-pressed')).toBe('true');

        app.unmount();
    });

    it('highlights only the nearest list type in the list popover', async () => {
        const target = document.createElement('div');
        const app = createApp(() => h(MarkdownEditor, {modelValue: '- Outer\n  1. Nested'}));

        document.body.append(target);
        app.mount(target);
        await nextTick();

        const nestedText = Array.from(target.querySelectorAll('li')).find((item) => item.textContent === 'Nested')?.querySelector('p')?.firstChild;
        expect(nestedText).toBeInstanceOf(Text);
        target.querySelector<HTMLElement>('.ProseMirror')?.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStart(nestedText as Text, 1);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));
        await nextTick();

        target.querySelector<HTMLButtonElement>('[data-toolbar-item="list"]')?.click();
        await nextTick();
        const items = document.body.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]');
        const bullet = Array.from(items).find((item) => item.textContent?.includes('Маркированный'));
        const ordered = Array.from(items).find((item) => item.textContent?.includes('Нумерованный'));
        expect(bullet?.getAttribute('aria-checked')).toBe('false');
        expect(ordered?.getAttribute('aria-checked')).toBe('true');
        expect(Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')).find((item) => item.textContent?.includes('Увеличить отступ'))?.disabled).toBe(true);
        expect(Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')).find((item) => item.textContent?.includes('Уменьшить отступ'))?.disabled).toBe(false);

        app.unmount();
    });

    it('prefills the link form with the selected text', async () => {
        const target = document.createElement('div');
        const app = createApp(() => h(MarkdownEditor, {modelValue: 'Ordinary selected text'}));

        document.body.append(target);
        app.mount(target);
        await nextTick();

        const text = target.querySelector('.ProseMirror p')?.firstChild;
        expect(text).toBeInstanceOf(Text);
        target.querySelector<HTMLElement>('.ProseMirror')?.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStart(text as Text, 9);
        range.setEnd(text as Text, 17);
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));
        await nextTick();

        target.querySelector<HTMLButtonElement>('[title="Ссылка"]')?.click();
        await nextTick();
        expect(document.body.querySelector<HTMLInputElement>('[aria-label="Текст ссылки"]')?.value).toBe('selected');

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

    it('renders custom toolbar groups in the configured order and availability', async () => {
        const target = document.createElement('div');
        const app = createApp(() => h(MarkdownEditor, {
            toolbarConfig: {
                groups: [
                    {id: 'custom-first', items: ['italic', 'bold']},
                    {id: 'custom-second', items: [{id: 'table', isAvailable: () => false}, 'link']},
                ],
            },
        }));

        document.body.append(target);
        app.mount(target);
        await nextTick();

        expect(Array.from(target.querySelectorAll('[data-toolbar-group]')).map((group) => group.getAttribute('data-toolbar-group'))).toEqual(['custom-first', 'custom-second']);
        expect(Array.from(target.querySelectorAll('[data-toolbar-item]')).map((button) => button.getAttribute('data-toolbar-item'))).toEqual(['italic', 'bold', 'link', 'mode']);

        app.unmount();
    });

    it('binds toolbar items to custom actions and their enabled state', async () => {
        const target = document.createElement('div');
        const run = vi.fn();
        const app = createApp(() => h(MarkdownEditor, {
            toolbarConfig: {groups: [{id: 'actions', items: [
                {id: 'bold', action: {isActive: () => true, run}},
                {id: 'italic', action: {isEnabled: () => false, run: vi.fn()}},
            ]}]},
        }));

        document.body.append(target);
        app.mount(target);
        await nextTick();

        const bold = target.querySelector<HTMLButtonElement>('[data-toolbar-item="bold"]')!;
        const italic = target.querySelector<HTMLButtonElement>('[data-toolbar-item="italic"]')!;
        expect(bold.getAttribute('aria-pressed')).toBe('true');
        expect(italic.disabled).toBe(true);
        bold.click();
        expect(run).toHaveBeenCalledOnce();

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

    it('shows raw HTML and unspaced HTML directives as source text', async () => {
        const target = document.createElement('div');
        const app = createApp(() => h(MarkdownEditor, {
            modelValue: '<section data-raw-html-element>Raw HTML</section>\n\n:::html\n<section data-yfm-html-element>YFM HTML</section>\n:::',
        }));

        document.body.append(target);
        app.mount(target);
        await nextTick();

        expect(target.querySelector('.ProseMirror p')?.textContent).toBe('<section data-raw-html-element>Raw HTML</section>');
        expect(target.querySelector('[data-yfm-html]')?.textContent).toBe(':::html\n<section data-yfm-html-element>YFM HTML</section>\n:::');
        expect(target.querySelector('[data-raw-html-element]')).toBeNull();
        expect(target.querySelector('[data-raw-html]')).toBeNull();
        expect(target.querySelector('[data-yfm-html-element]')).toBeNull();
        expect(target.querySelector('[data-yfm-html]')?.classList.contains('ProseMirror-selectednode')).toBe(false);

        app.unmount();
    });

    it('folds the content under a folding heading from the toolbar', async () => {
        const target = document.createElement('div');
        const app = createApp(() => h(MarkdownEditor, {modelValue: '##+ Section\n\nHidden content', toolbarPreset: 'full'}));

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

    it('inserts an HTML directive after the current block and opens its local editor', async () => {
        const target = document.createElement('div');
        const editor = ref<MarkdownEditorExposed>();
        const app = createApp(() => h(MarkdownEditor, {modelValue: 'Text', ref: editor, toolbarPreset: 'full'}));

        document.body.append(target);
        app.mount(target);
        await nextTick();

        target.querySelector<HTMLButtonElement>('[title="HTML"]')?.click();
        await nextTick();
        await nextTick();

        expect(editor.value?.getMode()).toBe('wysiwyg');
        expect(editor.value?.getValue()).toContain('::: html\n<div>Add HTML code here</div>\n:::');
        expect(target.querySelector('.markdown-editor__atomic-source')?.textContent).toContain('<div>Add HTML code here</div>');

        app.unmount();
    });

    it('inserts a LaTeX block without leaving WYSIWYG mode', async () => {
        const target = document.createElement('div');
        const editor = ref<MarkdownEditorExposed>();
        const app = createApp(() => h(MarkdownEditor, {modelValue: 'Text', ref: editor, toolbarPreset: 'full'}));

        document.body.append(target);
        app.mount(target);
        await nextTick();

        target.querySelector<HTMLButtonElement>('[title="Формула"]')?.click();
        await nextTick();
        document.querySelector<HTMLButtonElement>('[role="menuitem"]:last-child')?.click();
        await nextTick();

        expect(editor.value?.getMode()).toBe('wysiwyg');
        expect(editor.value?.getValue()).toContain('$$\nE = mc^2\n$$');
        expect(target.querySelector('.markdown-editor__atomic-source')?.textContent).toContain('E = mc^2');

        app.unmount();
    });

    it('renders and updates a registered directive component in visual mode', async () => {
        const Opros = defineComponent({
            props: {
                content: {required: true, type: String},
                name: {required: true, type: String},
                readonly: Boolean,
                updateContent: {required: true, type: Function},
            },
            setup: (props) => () => h('button', {
                'data-opros-editor': props.name,
                disabled: props.readonly,
                onClick: () => props.updateContent('Changed'),
            }, props.content),
        });
        const modelValue = ref('::: opros\nQuestion\n:::');
        const target = document.createElement('div');
        const app = createApp(() => h(MarkdownEditor, {
            directiveComponents: {opros: Opros},
            modelValue: modelValue.value,
            'onUpdate:modelValue': (value: string) => { modelValue.value = value; },
        }));

        document.body.append(target);
        app.mount(target);
        await nextTick();

        const component = target.querySelector<HTMLButtonElement>('[data-opros-editor="opros"]');
        expect(component?.textContent).toBe('Question');
        expect(component?.disabled).toBe(false);
        component?.click();
        await nextTick();

        expect(modelValue.value).toContain('::: opros\nChanged\n:::');
        expect(target.querySelector('[data-opros-editor="opros"]')?.textContent).toBe('Changed');

        app.unmount();
    });
});
