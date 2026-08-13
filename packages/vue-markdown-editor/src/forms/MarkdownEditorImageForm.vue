<script setup lang="ts">
import {ref} from 'vue';

defineOptions({name: 'MarkdownEditorImageForm'});

defineProps<{
    alt: string;
    title: string;
    url: string;
}>();

const emit = defineEmits<{
    apply: [];
    cancel: [];
    'update:alt': [value: string];
    'update:title': [value: string];
    'update:url': [value: string];
}>();

const element = ref<HTMLFormElement>();

defineExpose({element});
</script>

<template>
  <form ref="element" class="markdown-editor-form" @submit.prevent="emit('apply')">
    <input :value="url" aria-label="Адрес изображения" placeholder="https://example.com/image.jpg" required type="url" @input="emit('update:url', ($event.target as HTMLInputElement).value)">
    <input :value="alt" aria-label="Описание изображения" placeholder="Описание" @input="emit('update:alt', ($event.target as HTMLInputElement).value)">
    <input :value="title" aria-label="Заголовок изображения" placeholder="Заголовок" @input="emit('update:title', ($event.target as HTMLInputElement).value)">
    <button type="button" @click="emit('cancel')">Отмена</button>
    <button type="submit">Готово</button>
  </form>
</template>

<style scoped>
.markdown-editor-form { z-index: 10; display: grid; grid-template-columns: 1fr auto auto; gap: .25rem; width: min(22rem, calc(100vw - 1rem)); padding: .25rem; border: 1px solid var(--markdown-border); border-radius: .375rem; box-shadow: 0 .5rem 1.25rem rgb(0 0 0 / 18%); background: var(--markdown-background); }
.markdown-editor-form input { grid-column: 1 / -1; min-width: 0; height: 2rem; padding: 0 .5rem; border: 1px solid var(--markdown-border); border-radius: .25rem; color: inherit; background: var(--markdown-background); font: inherit; }
.markdown-editor-form button { min-width: 2rem; height: 2rem; padding: 0 .5rem; border: 0; border-radius: .25rem; color: var(--markdown-text); background: transparent; font: inherit; cursor: pointer; }
.markdown-editor-form button:hover, .markdown-editor-form button:focus-visible { outline: none; color: var(--markdown-focus-text); background: var(--markdown-focus-background); }
</style>
