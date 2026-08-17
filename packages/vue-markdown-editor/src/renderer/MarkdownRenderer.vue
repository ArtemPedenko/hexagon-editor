<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue';

import {renderMarkdownContent} from './markdown';
import {getMermaid, nextMermaidDiagramId} from './mermaid-runtime';

defineOptions({name: 'MarkdownRenderer'});

const props = defineProps<{
    content: string;
}>();

const root = ref<HTMLElement>();
const renderedContent = computed(() => renderMarkdownContent(props.content));
let renderVersion = 0;
let destroyed = false;

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
    () => props.content,
    async () => {
        renderVersion += 1;
        await nextTick();
        await renderMermaidDiagrams();
    },
);

onMounted(() => {
    void renderMermaidDiagrams();
});

onBeforeUnmount(() => {
    destroyed = true;
    renderVersion += 1;
});
</script>

<template>
  <!-- The rendered content may contain trusted HTML from ::: html blocks. -->
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div ref="root" class="markdown-renderer" v-html="renderedContent" />
</template>
