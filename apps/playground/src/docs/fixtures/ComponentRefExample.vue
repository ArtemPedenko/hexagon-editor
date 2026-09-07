<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownEditor } from 'hexagon-editor';
import type { MarkdownEditorExposed } from 'hexagon-editor';

const value = ref('');
const editor = ref<MarkdownEditorExposed>();

async function insertTemplate() {
  editor.value?.append('## Новый раздел');
  await editor.value?.setMode('markup');
  editor.value?.moveCursor('end');
  editor.value?.focus();
}
</script>

<template>
  <button @click="insertTemplate">Добавить раздел</button>
  <MarkdownEditor
    ref="editor"
    v-model="value"
  />
</template>
