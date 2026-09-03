<script setup lang="ts">
import { computed, getCurrentInstance, h, nextTick, onBeforeUnmount, onMounted, ref, render, watch } from 'vue';

import { renderMarkdownContent } from './markdown';
import type { MarkdownFeatures } from '../public-types';
import type { MarkdownDirectiveComponentProps, MarkdownDirectiveComponents } from '../directives';

defineOptions({ name: 'MarkdownRenderer' });

const props = defineProps<{
	content: string;
	directiveComponents?: MarkdownDirectiveComponents;
	features?: MarkdownFeatures;
}>();

const root = ref<HTMLElement>();
const appContext = getCurrentInstance()?.appContext;
const renderedContent = computed(() => renderMarkdownContent(props.content, props.features));
let renderVersion = 0;
let destroyed = false;
let directiveTargets: HTMLElement[] = [];

function unmountDirectiveComponents(): void {
	for (const target of directiveTargets) render(null, target);
	directiveTargets = [];
}

function renderDirectiveComponents(): void {
	unmountDirectiveComponents();
	if (props.directiveComponents === undefined) return;
	for (const target of root.value?.querySelectorAll<HTMLElement>('[data-directive]') ?? []) {
		const name = target.dataset.directive ?? '';
		const component = props.directiveComponents[name];
		if (component === undefined) continue;
		const content = target.textContent ?? '';
		// `render()` appends its subtree to an unmanaged container. Remove the
		// Markdown fallback text only after reading it for the component props.
		target.replaceChildren();
		const componentProps: MarkdownDirectiveComponentProps = {
			content,
			name,
			readonly: true,
			updateContent: () => undefined,
		};
		const vnode = h(component, componentProps);
		vnode.appContext = appContext ?? null;
		render(vnode, target);
		directiveTargets.push(target);
	}
}

async function renderMermaidDiagrams(): Promise<void> {
	const version = ++renderVersion;
	const diagrams = [...(root.value?.querySelectorAll<HTMLElement>('[data-mermaid]') ?? [])];
	if (diagrams.length === 0) return;
	if (props.features?.mermaid === undefined) return;
	let mermaid: Awaited<ReturnType<NonNullable<MarkdownFeatures['mermaid']>['load']>>;
	try {
		mermaid = await props.features.mermaid.load();
		mermaid.initialize({ securityLevel: 'strict', startOnLoad: false });
	} catch {
		return;
	}
	for (const element of diagrams) {
		if (destroyed || version !== renderVersion || !element.isConnected) return;
		const source = element.querySelector('pre')?.textContent ?? '';
		try {
			const { bindFunctions, svg } = await mermaid.render(
				`markdown-renderer-mermaid-${version}-${diagrams.indexOf(element)}`,
				source,
			);
			if (destroyed || version !== renderVersion || !element.isConnected) return;
			element.innerHTML = svg;
			element.removeAttribute('aria-busy');
			bindFunctions?.(element);
		} catch {
			element.removeAttribute('aria-busy');
			element.setAttribute('data-mermaid-error', '');
		}
	}
}

watch(
	() => [props.content, props.directiveComponents] as const,
	async () => {
		renderVersion += 1;
		await nextTick();
		renderDirectiveComponents();
		await renderMermaidDiagrams();
	},
);

onMounted(() => {
	renderDirectiveComponents();
	void renderMermaidDiagrams();
});

onBeforeUnmount(() => {
	destroyed = true;
	renderVersion += 1;
	unmountDirectiveComponents();
});
</script>

<template>
	<!-- The rendered content may contain trusted HTML from ::: html blocks. -->
	<!-- eslint-disable-next-line vue/no-v-html -->
	<div
		ref="root"
		class="markdown-renderer"
		v-html="renderedContent"
	/>
</template>

<style scoped>
:where(.markdown-renderer) {
	--markdown-renderer-code-background: #eef1f5;
	--markdown-renderer-link: #1d5fd1;
	--markdown-editor-color-gray: #a6a6a6;
	--markdown-editor-color-yellow: #f2d600;
	--markdown-editor-color-orange: #e87b00;
	--markdown-editor-color-red: #e65c5c;
	--markdown-editor-color-green: #62be79;
	--markdown-editor-color-blue: #7197e8;
	--markdown-editor-color-violet: #a774d7;
	--markdown-editor-background-color-gray: #e5e7eb;
	--markdown-editor-background-color-yellow: #fff3a3;
	--markdown-editor-background-color-orange: #ffd6a3;
	--markdown-editor-background-color-red: #ffc3c3;
	--markdown-editor-background-color-green: #c5ebcf;
	--markdown-editor-background-color-blue: #cbdcff;
	--markdown-editor-background-color-violet: #e0c8fa;
}

.markdown-renderer :deep(h1),
.markdown-renderer :deep(h2),
.markdown-renderer :deep(h3),
.markdown-renderer :deep(h4),
.markdown-renderer :deep(h5),
.markdown-renderer :deep(h6) {
	margin-block: 1.25em 0.5em;
	font-weight: 600;
	line-height: 1.25;
}

.markdown-renderer :deep(h1) {
	font-size: 2em;
}
.markdown-renderer :deep(h2) {
	font-size: 1.5em;
}
.markdown-renderer :deep(h3) {
	font-size: 1.25em;
}
.markdown-renderer :deep(h4) {
	font-size: 1.125em;
}
.markdown-renderer :deep(h5) {
	font-size: 1em;
}
.markdown-renderer :deep(h6) {
	font-size: 0.875em;
}

.markdown-renderer :deep(> :first-child) {
	margin-block-start: 0;
}

.markdown-renderer :deep(p) {
	margin-block: 0.75rem;
	line-height: 1.6;
}

.markdown-renderer :deep(ul),
.markdown-renderer :deep(ol) {
	margin-block: 0.75rem;
	padding-inline-start: 1.75rem;
}

.markdown-renderer :deep(ul) {
	list-style: disc outside;
}
.markdown-renderer :deep(ol) {
	list-style: decimal outside;
}
.markdown-renderer :deep(ul ul) {
	list-style-type: circle;
}
.markdown-renderer :deep(ul ul ul) {
	list-style-type: square;
}
.markdown-renderer :deep(li > p) {
	margin-block: 0;
}

.markdown-renderer :deep(blockquote) {
	margin: 1rem 0;
	padding-inline-start: 0.75rem;
	border-inline-start: 2px solid #5282ff;
}

.markdown-renderer :deep(blockquote > :first-child) {
	margin-block-start: 0;
}
.markdown-renderer :deep(blockquote > :last-child) {
	margin-block-end: 0;
}

.markdown-renderer :deep(a) {
	color: var(--markdown-renderer-link);
	text-decoration: underline;
	text-underline-offset: 0.15em;
}

.markdown-renderer :deep(code) {
	padding: 0.15em 0.35em;
	border-radius: 0.25rem;
	background: var(--markdown-renderer-code-background);
	font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	font-size: 0.875em;
}

.markdown-renderer :deep(pre code) {
	padding: 0;
	border-radius: 0;
	background: transparent;
	font-size: inherit;
}

.markdown-renderer :deep(pre) {
	overflow: auto;
	margin: 1rem 0;
	padding: 0.75rem;
	border-radius: 0.375rem;
	color: #e6edf3;
	background: #161b22;
	font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	line-height: 1.5;
}

.markdown-renderer :deep(hr) {
	margin-block: 1.5rem;
	border: 0;
	border-block-start: 1px solid #d8dbe0;
}

.markdown-renderer :deep(table) {
	width: 100%;
	margin: 1rem 0;
	border-collapse: collapse;
}

.markdown-renderer :deep(th),
.markdown-renderer :deep(td) {
	min-width: 5rem;
	padding: 0.45rem 0.6rem;
	border: 1px solid #d8dbe0;
	text-align: left;
}

.markdown-renderer :deep(th) {
	font-weight: 600;
}

.markdown-renderer :deep(img) {
	max-width: 100%;
	height: auto;
	vertical-align: middle;
}
</style>
