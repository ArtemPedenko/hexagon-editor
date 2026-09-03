import { createApp, h, nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import MarkdownEditorImageForm from './MarkdownEditorImageForm.vue';
import MarkdownEditorLinkForm from './MarkdownEditorLinkForm.vue';

describe('editor forms', () => {
  it('validates, trims and submits the link contract', async () => {
    const target = document.createElement('div');
    const url = ref('not a url');
    const apply = vi.fn();
    const invalid = vi.fn();
    const app = createApp(() =>
      h(MarkdownEditorLinkForm, {
        locale: 'en',
        openInNewWindow: true,
        text: ' Docs ',
        url: url.value,
        onApply: apply,
        onInvalid: invalid,
        'onUpdate:url': (value: string) => {
          url.value = value;
        },
      }),
    );
    document.body.append(target);
    app.mount(target);
    await nextTick();

    target.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await nextTick();
    expect(invalid).toHaveBeenCalledWith('Enter a valid link address.');
    expect(target.querySelector('[aria-invalid="true"]')).not.toBeNull();
    url.value = ' https://example.com/docs ';
    await nextTick();
    target.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    expect(apply).toHaveBeenCalledWith({
      openInNewWindow: true,
      text: 'Docs',
      url: 'https://example.com/docs',
    });
    app.unmount();
  });

  it('submits image metadata and dimensions without file-upload API', async () => {
    const target = document.createElement('div');
    const apply = vi.fn();
    const app = createApp(() =>
      h(MarkdownEditorImageForm, {
        alt: ' Diagram ',
        height: 240,
        name: ' Architecture ',
        title: ' System ',
        url: 'https://example.com/image.svg',
        width: 320,
        onApply: apply,
      }),
    );
    document.body.append(target);
    app.mount(target);
    await nextTick();

    target.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    expect(apply).toHaveBeenCalledWith({
      alt: 'Diagram',
      height: 240,
      name: 'Architecture',
      title: 'System',
      url: 'https://example.com/image.svg',
      width: 320,
    });
    expect(target.querySelector('input[type="file"]')).toBeNull();
    app.unmount();
  });

  it('uploads an image and fills its URL and alt text', async () => {
    const target = document.createElement('div');
    const url = ref('');
    const alt = ref('');
    const uploadImage = vi.fn(async (file: File) => `https://cdn.example.com/${file.name}`);
    const app = createApp(() =>
      h(MarkdownEditorImageForm, {
        alt: alt.value,
        uploadImage,
        url: url.value,
        'onUpdate:alt': (value: string) => {
          alt.value = value;
        },
        'onUpdate:url': (value: string) => {
          url.value = value;
        },
      }),
    );
    document.body.append(target);
    app.mount(target);
    await nextTick();

    const input = target.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(['image'], 'diagram.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [file],
    });
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(url.value).toBe('https://cdn.example.com/diagram.png'));

    expect(uploadImage).toHaveBeenCalledWith(file);
    expect(alt.value).toBe('diagram.png');
    expect(target.querySelector<HTMLInputElement>('[aria-label="Адрес изображения"]')?.value).toBe(url.value);
    app.unmount();
  });

  it('applies disabled and readonly states to controls', async () => {
    const target = document.createElement('div');
    const app = createApp(() =>
      h(MarkdownEditorLinkForm, {
        disabled: true,
        readOnlyText: true,
        text: 'fixed',
      }),
    );
    document.body.append(target);
    app.mount(target);
    await nextTick();

    expect([...target.querySelectorAll('input')].every((input) => input.disabled)).toBe(true);
    expect(target.querySelector<HTMLInputElement>('[aria-label="Текст ссылки"]')?.readOnly).toBe(true);
    expect(target.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    app.unmount();
  });

  it('uses shared English messages and passes the theme to a standalone form', async () => {
    const target = document.createElement('div');
    const app = createApp(() => h(MarkdownEditorImageForm, { locale: 'en', theme: 'dark' }));
    document.body.append(target);
    app.mount(target);
    await nextTick();

    expect(target.querySelector('[data-theme="dark"]')).not.toBeNull();
    expect(target.querySelector('[aria-label="Image address"]')).not.toBeNull();
    expect(target.querySelector('button[type="submit"]')?.textContent).toBe('Submit');
    app.unmount();
  });
});
