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

	it('renders registered directive components and preserves unknown directives', () => {
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
				content: '::: opros\nQuestion\n:::\n\n::: unknown\nSource\n:::',
				directiveComponents: { opros: Opros },
			}),
		);
		app.mount(target);

		expect(target.querySelector('[data-opros="opros"]')?.textContent).toBe('Question:true');
		expect(target.querySelector('[data-directive="unknown"]')?.textContent).toBe('Source');

		app.unmount();
	});
});
