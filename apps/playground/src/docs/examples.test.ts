import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import ts from 'typescript';
import { renderMarkdownContent } from '../../../../packages/vue-markdown-editor/src/renderer/markdown';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const readme = read('../../../../packages/vue-markdown-editor/README.md');
const images = read('./images.md');
const vueBlocks = (source: string) => [...source.matchAll(/```vue\n([\s\S]*?)\n```/g)].map((match) => match[1]!);

describe('executable documentation examples', () => {
  it.each([
    ['ComponentRefExample.vue', readme, 'const editor = ref<MarkdownEditorExposed>()'],
    ['ReadmeUploadExample.vue', readme, 'async function uploadImage'],
    ['UploadExample.vue', images, 'async function uploadImage'],
  ])('keeps typechecked fixture %s identical to the documentation', (file, source, marker) => {
    expect(read('./fixtures/' + file).trim()).toBe(vueBlocks(source).find((block) => block.includes(marker)));
  });

  it.each([readme, images])('sends the actual image in the documented multipart request', async (source) => {
    const block = vueBlocks(source).find((value) => value.includes('async function uploadImage'))!;
    const script = block.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)![1]!;
    const fn = script.slice(script.indexOf('async function uploadImage'));
    const compiled = ts.transpile(fn, { target: ts.ScriptTarget.ES2022 });
    const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ url: 'https://example.com/image.png' }) }));
    const upload = new Function('fetch', compiled + '; return uploadImage;')(fetch) as (file: File) => Promise<string>;
    const file = new File(['image'], 'test.png', { type: 'image/png' });
    expect(await upload(file)).toBe('https://example.com/image.png');
    const init = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect((init[1].body as FormData).get('image')).toBe(file);
  });

  it.each([readme, read('./extended-markdown.md')])('renders the documented water formula as subscript', (source) => {
    const example = [...source.matchAll(/```markdown\n([\s\S]*?)\n```/g)].find((match) => match[1]!.includes('H~2~O'));
    expect(example).toBeDefined();
    expect(renderMarkdownContent(example![1]!)).toContain('H<sub>2</sub>O');
  });
});
