<script setup lang="ts">
import {computed, getCurrentInstance, h, nextTick, onBeforeUnmount, onMounted, ref, render, watch} from 'vue';

import {renderMarkdownContent} from './markdown';
import {getMermaid, nextMermaidDiagramId} from './mermaid-runtime';
import type {MarkdownDirectiveComponentProps, MarkdownDirectiveComponents} from '../directives';

defineOptions({name: 'MarkdownRenderer'});

const props = defineProps<{
    content: string;
    directiveComponents?: MarkdownDirectiveComponents;
}>();

const root = ref<HTMLElement>();
const appContext = getCurrentInstance()?.appContext;
const renderedContent = computed(() => renderMarkdownContent(props.content));
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
    let mermaid: Awaited<ReturnType<typeof getMermaid>>;
    try {
        mermaid = await getMermaid();
    } catch {
        for (const element of diagrams) {
            element.removeAttribute('aria-busy');
            element.setAttribute('data-mermaid-error', '');
        }
        return;
    }
    for (const element of diagrams) {
        if (destroyed || version !== renderVersion || !element.isConnected) return;
        const source = element.querySelector('pre')?.textContent ?? '';
        try {
            const {bindFunctions, svg} = await mermaid.render(nextMermaidDiagramId(), source);
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
  <div ref="root" class="markdown-renderer" v-html="renderedContent" />
</template>
