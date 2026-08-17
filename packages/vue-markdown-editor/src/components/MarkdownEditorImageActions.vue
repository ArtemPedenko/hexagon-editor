<script setup lang="ts">
import {ref} from 'vue';

import type {ImageObjectFit} from '../extensions/markdown/image';
import type {MarkdownEditorMessageKey} from '../i18n';
import type {MarkdownEditorTheme} from '../public-types';

defineProps<{
    objectFit?: string;
    theme: MarkdownEditorTheme;
    translate: (key: MarkdownEditorMessageKey) => string;
}>();

const emit = defineEmits<{
    'full-width': [];
    'object-fit': [value: ImageObjectFit];
}>();

const element = ref<HTMLElement>();
defineExpose({element});
</script>

<template>
  <div ref="element" class="markdown-editor__image-actions" :data-theme="theme" role="toolbar" :aria-label="translate('image')">
    <button type="button" :aria-label="translate('imageWidthFull')" :title="translate('imageWidthFull')" @mousedown.prevent @click="emit('full-width')">↔</button>
    <select :value="objectFit ?? 'contain'" :aria-label="translate('imageFit')" @change="emit('object-fit', ($event.target as HTMLSelectElement).value as ImageObjectFit)">
      <option value="contain">Contain</option>
      <option value="cover">Cover</option>
      <option value="fill">Fill</option>
      <option value="none">None</option>
      <option value="scale-down">Scale down</option>
    </select>
  </div>
</template>

<style scoped>
.markdown-editor__image-actions {
    --markdown-background: #fff;
    --markdown-border: #d8dbe0;
    --markdown-focus-background: #e9efff;
    --markdown-focus-text: #1d3c93;
    --markdown-text: #202125;
    z-index: 10;
    display: flex;
    gap: .25rem;
    padding: .25rem;
    border: 1px solid var(--markdown-border);
    border-radius: .5rem;
    box-shadow: 0 .5rem 1.25rem rgb(0 0 0 / 22%);
    color: var(--markdown-text);
    background: var(--markdown-background);
}

.markdown-editor__image-actions[data-theme='dark'] { --markdown-background: #303236; --markdown-border: #45484e; --markdown-focus-background: #526da8; --markdown-focus-text: #fff; --markdown-text: #f1f3f5; }
@media (prefers-color-scheme: dark) { .markdown-editor__image-actions[data-theme='auto'] { --markdown-background: #303236; --markdown-border: #45484e; --markdown-focus-background: #526da8; --markdown-focus-text: #fff; --markdown-text: #f1f3f5; } }

.markdown-editor__image-actions button,
.markdown-editor__image-actions select {
    box-sizing: border-box;
    height: 2rem;
    border: 0;
    border-radius: .375rem;
    color: inherit;
    background: transparent;
    font: inherit;
}

.markdown-editor__image-actions button { min-width: 2rem; padding: 0 .5rem; cursor: pointer; }
.markdown-editor__image-actions select { min-width: 7rem; padding: 0 .5rem; cursor: pointer; }
.markdown-editor__image-actions button:hover,
.markdown-editor__image-actions select:hover { color: var(--markdown-focus-text); background: var(--markdown-focus-background); }
.markdown-editor__image-actions button:focus-visible,
.markdown-editor__image-actions select:focus-visible { outline: 2px solid var(--markdown-focus-text); outline-offset: 1px; }
</style>
