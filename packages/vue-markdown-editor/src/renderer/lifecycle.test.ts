import { createApp, defineComponent, h, nextTick, onBeforeUnmount, shallowRef } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { describe, expect, it, vi } from 'vitest';
import MarkdownRenderer from './MarkdownRenderer.vue';
import type { MarkdownFeatures } from '../public-types';

const content = '::: note\nBody\n:::\n\n$x$\n\n```mermaid\ngraph LR\nA --> B\n```';
const flush = async () => {
  await nextTick();
  await Promise.resolve();
  await nextTick();
};
function adapter(label: string) {
  const render = vi.fn(async (_id: string, _source: string) => ({ svg: `<svg>${label}</svg>` }));
  return { load: vi.fn(async () => ({ render, initialize: vi.fn() })), render };
}
describe('renderer adapter lifecycle', () => {
  it('restores Markdown on adapter addition, replacement, math changes and removal', async () => {
    const features = shallowRef<MarkdownFeatures>({});
    const unmount = vi.fn();
    const component = defineComponent({
      setup() {
        onBeforeUnmount(unmount);
        return () => h('article', 'Mounted');
      },
    });
    const directives = shallowRef({ note: { component, insert: { attrs: {}, content: '' } } });
    const target = document.createElement('div');
    const app = createApp(() =>
      h(MarkdownRenderer, { content, features: features.value, directives: directives.value }),
    );
    app.mount(target);
    expect(target.querySelector('[aria-busy]')).toBeNull();
    const first = adapter('first');
    features.value = { mermaid: first };
    await flush();
    expect(first.render.mock.calls[0]?.[1]).toBe('graph LR\nA --> B\n');
    expect(target.querySelector('svg')?.textContent).toBe('first');
    const second = adapter('second');
    features.value = { mermaid: second, math: { renderToString: () => '<b>math</b>' } };
    await flush();
    expect(second.render.mock.calls[0]?.[1]).toBe('graph LR\nA --> B\n');
    expect(target.querySelector('b')?.textContent).toBe('math');
    expect(target.querySelector('article')?.textContent).toBe('Mounted');
    expect(unmount).toHaveBeenCalledTimes(2);
    features.value = {};
    directives.value = {};
    await flush();
    expect(target.querySelector('svg')).toBeNull();
    expect(target.querySelector('[data-mermaid] pre')?.textContent).toContain('A --> B');
    expect(target.querySelector('[data-directive]')?.textContent).toBe('Body');
    expect(target.querySelector('[aria-busy]')).toBeNull();
    app.unmount();
  });
  it.each([
    ['resolve', 'update'],
    ['reject', 'update'],
    ['resolve', 'unmount'],
    ['reject', 'unmount'],
  ] as const)('ignores stale render %s after %s', async (outcome, action) => {
    let resolve!: (value: { svg: string }) => void;
    let reject!: (reason: Error) => void;
    const render = vi.fn(
      () =>
        new Promise<{ svg: string }>((yes, no) => {
          resolve = yes;
          reject = no;
        }),
    );
    const features = shallowRef<MarkdownFeatures>({ mermaid: { load: async () => ({ initialize: vi.fn(), render }) } });
    const target = document.createElement('div');
    const source = shallowRef(content);
    const app = createApp(() => h(MarkdownRenderer, { content: source.value, features: features.value }));
    app.mount(target);
    await flush();
    const old = target.querySelector('[data-mermaid]')!;
    if (action === 'update') {
      source.value = '# Updated';
      await flush();
    } else app.unmount();
    if (outcome === 'resolve') resolve({ svg: '<svg>stale</svg>' });
    else reject(new Error('stale'));
    await flush();
    expect(old.querySelector('svg')).toBeNull();
    expect(old.hasAttribute('data-mermaid-error')).toBe(false);
    if (action === 'update') {
      expect(target.querySelector('h1')?.textContent).toBe('Updated');
      app.unmount();
    }
  });
  it('ignores stale loads, clears busy after errors, and uses unique IDs without loading on SSR', async () => {
    let resolve!: (value: Awaited<ReturnType<NonNullable<MarkdownFeatures['mermaid']>['load']>>) => void;
    const features = shallowRef<MarkdownFeatures>({
      mermaid: {
        load: () =>
          new Promise((yes) => {
            resolve = yes;
          }),
      },
    });
    const target = document.createElement('div');
    const app = createApp(() => h(MarkdownRenderer, { content, features: features.value }));
    app.mount(target);
    features.value = {
      mermaid: {
        load: async () => {
          throw new Error('offline');
        },
      },
    };
    await flush();
    const initialize = vi.fn();
    resolve({ initialize, render: vi.fn() });
    await flush();
    expect(initialize).not.toHaveBeenCalled();
    expect(target.querySelector('[aria-busy]')).toBeNull();
    app.unmount();
    const shared = adapter('shared');
    const pair = createApp(() =>
      h('div', [
        h(MarkdownRenderer, { content, features: { mermaid: shared } }),
        h(MarkdownRenderer, { content, features: { mermaid: shared } }),
      ]),
    );
    pair.mount(target);
    await flush();
    expect(new Set(shared.render.mock.calls.map((call) => call[0])).size).toBe(2);
    pair.unmount();
    await renderToString(h(MarkdownRenderer, { content, features: { mermaid: shared } }));
    expect(shared.load).toHaveBeenCalledTimes(2);
  });
});
