import {createApp, h, nextTick, ref} from 'vue';
import {describe, expect, it, vi} from 'vitest';

import MarkdownEditorImageForm from './MarkdownEditorImageForm.vue';
import MarkdownEditorLinkForm from './MarkdownEditorLinkForm.vue';

describe('editor forms', () => {
    it('validates, trims and submits the link contract', async () => {
        const target = document.createElement('div');
        const url = ref('not a url');
        const apply = vi.fn();
        const invalid = vi.fn();
        const app = createApp(() => h(MarkdownEditorLinkForm, {
            locale: 'en', text: ' Docs ', title: ' Help ', url: url.value,
            onApply: apply, onInvalid: invalid, 'onUpdate:url': (value: string) => { url.value = value; },
        }));
        document.body.append(target); app.mount(target); await nextTick();

        target.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
        await nextTick();
        expect(invalid).toHaveBeenCalledWith('Enter a valid link address.');
        expect(target.querySelector('[aria-invalid="true"]')).not.toBeNull();
        url.value = ' https://example.com/docs '; await nextTick();
        target.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
        expect(apply).toHaveBeenCalledWith({text: 'Docs', title: 'Help', url: 'https://example.com/docs'});
        app.unmount();
    });

    it('submits image metadata and dimensions without file-upload API', async () => {
        const target = document.createElement('div');
        const apply = vi.fn();
        const app = createApp(() => h(MarkdownEditorImageForm, {
            alt: ' Diagram ', height: 240, name: ' Architecture ', title: ' System ',
            url: 'https://example.com/image.svg', width: 320, onApply: apply,
        }));
        document.body.append(target); app.mount(target); await nextTick();

        target.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
        expect(apply).toHaveBeenCalledWith({
            alt: 'Diagram', height: 240, name: 'Architecture', title: 'System',
            url: 'https://example.com/image.svg', width: 320,
        });
        expect(target.querySelector('input[type="file"]')).toBeNull();
        app.unmount();
    });

    it('applies disabled and readonly states to controls', async () => {
        const target = document.createElement('div');
        const app = createApp(() => h(MarkdownEditorLinkForm, {disabled: true, readOnlyText: true, text: 'fixed'}));
        document.body.append(target); app.mount(target); await nextTick();

        expect([...target.querySelectorAll('input')].every((input) => input.disabled)).toBe(true);
        expect(target.querySelector<HTMLInputElement>('[aria-label="Текст ссылки"]')?.readOnly).toBe(true);
        expect(target.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
        app.unmount();
    });
});
