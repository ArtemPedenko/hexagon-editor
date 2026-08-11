<script setup lang="ts">
import {ref} from 'vue';

defineProps<{
    hasCurrentLink: boolean;
    text: string;
    title: string;
    url: string;
}>();

const emit = defineEmits<{
    apply: [];
    remove: [];
    'update:text': [value: string];
    'update:title': [value: string];
    'update:url': [value: string];
}>();

const element = ref<HTMLElement>();

defineExpose({element});
</script>

<template>
  <form ref="element" class="markdown-editor__link-form markdown-editor__link-form--extended" @submit.prevent="emit('apply')">
    <input :value="url" aria-label="Адрес ссылки" placeholder="https://example.com" type="url" @input="emit('update:url', ($event.target as HTMLInputElement).value)">
    <input :value="text" aria-label="Текст ссылки" placeholder="Текст ссылки" @input="emit('update:text', ($event.target as HTMLInputElement).value)">
    <input :value="title" aria-label="Заголовок ссылки" placeholder="Заголовок" @input="emit('update:title', ($event.target as HTMLInputElement).value)">
    <button v-if="hasCurrentLink" type="button" title="Удалить ссылку" @mousedown.prevent @click="emit('remove')">Удалить</button>
    <button type="submit">Готово</button>
  </form>
</template>

<style scoped>
.markdown-editor__link-form { display: flex; gap: .25rem; z-index: 10; width: min(22rem, calc(100vw - 1rem)); padding: .25rem; border: 1px solid var(--markdown-border); border-radius: .375rem; box-shadow: 0 .5rem 1.25rem rgb(0 0 0 / 18%); background: var(--markdown-background); }
.markdown-editor__link-form--extended { display: grid; grid-template-columns: 1fr auto auto; }
.markdown-editor__link-form--extended input { grid-column: 1 / -1; }
.markdown-editor__link-form input { flex: 1; min-width: 0; height: 2rem; padding: 0 .5rem; border: 1px solid var(--markdown-border); border-radius: .25rem; color: inherit; background: var(--markdown-background); font: inherit; }
.markdown-editor__link-form button { min-width: 2rem; height: 2rem; padding: 0 .5rem; border: 0; border-radius: .25rem; color: var(--markdown-text); background: transparent; font: inherit; cursor: pointer; }
.markdown-editor__link-form button:hover, .markdown-editor__link-form button:focus-visible { outline: none; color: var(--markdown-focus-text); background: var(--markdown-focus-background); }
</style>
