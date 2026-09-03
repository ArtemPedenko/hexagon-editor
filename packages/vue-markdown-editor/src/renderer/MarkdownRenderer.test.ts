import { renderToString } from '@vue/server-renderer';
import { createApp, createSSRApp, defineComponent, h, nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';

import MarkdownRenderer from './MarkdownRenderer.vue';

describe('MarkdownRenderer', () => {
  it('renders on the server without accessing browser-only Mermaid APIs', async () => {
    const html = await renderToString(
      createSSRApp(() =>
        h(MarkdownRenderer, {
          content: '# Server\n\n```mermaid\ngraph LR\nA --> B\n```',
        }),
      ),
    );

    expect(html).toContain('class="markdown-renderer"');
    expect(html).toContain('<h1>Server</h1>');
    expect(html).toContain('data-mermaid');
  });

  it('updates rendered content reactively', async () => {
    const content = ref('# First');
    const target = document.createElement('div');
    const app = createApp(() => h(MarkdownRenderer, { content: content.value }));
    app.mount(target);

    expect(target.querySelector('h1')?.textContent).toBe('First');
    content.value = '## Second';
    await nextTick();
    expect(target.querySelector('h2')?.textContent).toBe('Second');

    app.unmount();
  });

  it('renders directive components without fallback text, preserves unknown directives, and updates content', async () => {
    const content = ref('::: opros\nQuestion\n:::\n\n::: unknown\nSource\n:::');
    const Opros = defineComponent({
      props: {
        content: { required: true, type: String },
        name: { required: true, type: String },
        readonly: Boolean,
      },
      setup: (props) => () => h('article', { 'data-opros': props.name }, `${props.content}:${props.readonly}`),
    });
    const target = document.createElement('div');
    const app = createApp(() =>
      h(MarkdownRenderer, {
        content: content.value,
        directives: { opros: { component: Opros, insert: { attrs: {}, content: '' } } },
      }),
    );
    app.mount(target);

    const registeredDirective = target.querySelector('[data-directive="opros"]');
    expect(target.querySelector('[data-opros="opros"]')?.textContent).toBe('Question:true');
    expect([...(registeredDirective?.childNodes ?? [])].some((node) => node.nodeType === Node.TEXT_NODE)).toBe(false);
    expect(target.querySelector('[data-directive="unknown"]')?.textContent).toBe('Source');

    content.value = '::: opros\nUpdated question\n:::';
    await nextTick();
    await nextTick();
    expect(target.querySelector('[data-opros="opros"]')?.textContent).toBe('Updated question:true');

    app.unmount();
  });
});
