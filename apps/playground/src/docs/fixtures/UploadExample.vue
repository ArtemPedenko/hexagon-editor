<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownEditor } from 'hexagon-editor';
const value = ref('');
async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/') || file.size > 5_000_000) throw new Error('Invalid image');
  const body = new FormData();
  body.append('image', file);
  const response = await fetch('/api/images', { method: 'POST', body });
  if (!response.ok) throw new Error('Upload failed');
  const data: unknown = await response.json();
  if (typeof data !== 'object' || data === null || !('url' in data) || typeof data.url !== 'string')
    throw new Error('Expected URL');
  return data.url;
}
</script>
<template>
  <MarkdownEditor
    v-model="value"
    :upload-image="uploadImage"
    toolbar-preset="full"
  />
</template>
