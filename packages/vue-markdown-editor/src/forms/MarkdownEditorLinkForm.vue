<script setup lang="ts">
import {ref} from 'vue';

defineOptions({name: 'MarkdownEditorLinkForm'});

defineProps<{
    hasCurrentLink?: boolean;
    text: string;
    title: string;
    url: string;
}>();

const emit = defineEmits<{
    apply: [];
    cancel: [];
    remove: [];
    'update:text': [value: string];
    'update:title': [value: string];
    'update:url': [value: string];
}>();

const element = ref<HTMLFormElement>();

defineExpose({element});
</script>

<template>
  <form ref="element" class="markdown-editor-form" @submit.prevent="emit('apply')">
    <input :value="url" aria-label="Адрес ссылки" placeholder="https://example.com" required type="url" @input="emit('update:url', ($event.target as HTMLInputElement).value)">
    <input :value="text" aria-label="Текст ссылки" placeholder="Текст ссылки" @input="emit('update:text', ($event.target as HTMLInputElement).value)">
    <input :value="title" aria-label="Заголовок ссылки" placeholder="Заголовок" @input="emit('update:title', ($event.target as HTMLInputElement).value)">
    <button v-if="hasCurrentLink" type="button" @click="emit('remove')">Удалить</button>
    <button type="button" @click="emit('cancel')">Отмена</button>
    <button type="submit">Готово</button>
  </form>
</template>

<style scoped>
.markdown-editor-form { z-index: 10; display: grid; grid-template-columns: 1fr auto auto auto; gap: .25rem; width: min(22rem, calc(100vw - 1rem)); padding: .25rem; border: 1px solid var(--markdown-border); border-radius: .375rem; box-shadow: 0 .5rem 1.25rem rgb(0 0 0 / 18%); background: var(--markdown-background); }
.markdown-editor-form input { grid-column: 1 / -1; min-width: 0; height: 2rem; padding: 0 .5rem; border: 1px solid var(--markdown-border); border-radius: .25rem; color: inherit; background: var(--markdown-background); font: inherit; }
.markdown-editor-form button { min-width: 2rem; height: 2rem; padding: 0 .5rem; border: 0; border-radius: .25rem; color: var(--markdown-text); background: transparent; font: inherit; cursor: pointer; }
.markdown-editor-form button:hover, .markdown-editor-form button:focus-visible { outline: none; color: var(--markdown-focus-text); background: var(--markdown-focus-background); }
</style>
