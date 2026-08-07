<script setup lang="ts">
import {computed, ref} from 'vue';

import {MarkdownEditor, renderMarkdownPreview, VERSION} from '@gravity-ui/vue-markdown-editor';
import type {MarkdownEditorMode} from '@gravity-ui/vue-markdown-editor';

const editorMode = ref<MarkdownEditorMode>('wysiwyg');
const advancedMarkdownDemo = [
    '# Vue Markdown editor {#editor-demo .playground-title}',
    '',
    '##+ Расширенные возможности',
    '',
    'Этот раздел можно свернуть кнопкой в тулбаре.',
    '',
    'Термин',
    ': Определение из definition list',
    '',
    '> [Документация Gravity UI](https://gravity-ui.com){data-quotelink=true}',
    '>',
    '> Цитата со ссылкой на источник.',
    '',
    '<div data-demo-html>Raw HTML block</div>',
    '',
    '::: html',
    '<div>HTML directive</div>',
    ':::',
    '',
    'Формула: $E = mc^2$',
    '',
    '$$',
    '\\sum_{i=1}^{n} i = \\frac{n(n + 1)}{2}',
    '$$',
    '',
    '```mermaid',
    'graph LR',
    '  Markdown --> Editor',
    '```',
    '',
    ':::html',
    '<section>YFM HTML block</section>',
    ':::',
].join('\n');
const markdown = ref(advancedMarkdownDemo);
const previewHtml = computed(() => renderMarkdownPreview(markdown.value));
</script>

<template>
  <main class="playground">
    <header class="playground__header">
      <p class="playground__eyebrow">
        Gravity UI · Vue 3
      </p>
      <h1>Markdown editor</h1>
      <p class="playground__status">
        {{ editorMode }} · расширенные Markdown-функции · {{ VERSION }}
      </p>
    </header>
    <section class="playground__workspace" aria-label="Редактор Markdown">
      <MarkdownEditor v-model="markdown" v-model:mode="editorMode" />
      <aside class="playground__source-pane">
        <div class="playground__pane-title">
          Preview
        </div>
        <!-- markdown-it is configured with html: false in renderMarkdownPreview. -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="playground__preview" v-html="previewHtml" />
      </aside>
    </section>
  </main>
</template>
