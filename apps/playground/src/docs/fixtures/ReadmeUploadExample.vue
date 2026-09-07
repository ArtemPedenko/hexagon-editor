<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownEditor } from 'hexagon-editor';

const value = ref('');
async function uploadImage(file: File): Promise<string> {
  const body = new FormData();
  body.append('image', file);
  const response = await fetch('/api/images', { method: 'POST', body });
  if (!response.ok) throw new Error('Image upload failed');

  const result: unknown = await response.json();
  if (typeof result !== 'object' || result === null || !('url' in result) || typeof result.url !== 'string') {
    throw new Error('The API must return {url: string}');
  }
  return result.url;
}
</script>

<template>
  <MarkdownEditor
    v-model="value"
    :upload-image="uploadImage"
    toolbar-preset="full"
  />
</template>
