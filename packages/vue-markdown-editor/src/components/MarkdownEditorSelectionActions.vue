<script setup lang="ts">
defineProps<{
    boldLabel: string;
    italicLabel: string;
    onBold: () => void;
    onItalic: () => void;
}>();
</script>

<template>
  <div class="markdown-editor__selection-actions">
    <button :aria-label="boldLabel" type="button" @click="onBold" @mousedown.prevent>B</button>
    <button :aria-label="italicLabel" type="button" @click="onItalic" @mousedown.prevent>I</button>
  </div>
</template>
