<script setup lang="ts">
import {ref} from 'vue';

defineProps<{
    alt: string;
    canUpload: boolean;
    title: string;
    url: string;
}>();

const emit = defineEmits<{
    apply: [];
    'open-upload': [];
    'update:alt': [value: string];
    'update:title': [value: string];
    'update:url': [value: string];
}>();

const element = ref<HTMLElement>();

defineExpose({element});
</script>

<template>
  <form ref="element" class="markdown-editor__link-form markdown-editor__image-form" @submit.prevent="emit('apply')">
    <input :value="url" aria-label="Адрес изображения" type="url" required @input="emit('update:url', ($event.target as HTMLInputElement).value)">
    <input :value="alt" aria-label="Описание изображения" placeholder="Описание" @input="emit('update:alt', ($event.target as HTMLInputElement).value)">
    <input :value="title" aria-label="Заголовок изображения" placeholder="Заголовок" @input="emit('update:title', ($event.target as HTMLInputElement).value)">
    <button v-if="canUpload" type="button" title="Загрузить изображение" @mousedown.prevent @click="emit('open-upload')">▧</button>
    <button type="submit">Готово</button>
  </form>
</template>

<style scoped>
.markdown-editor__image-form { display: grid; grid-template-columns: 1fr auto auto; }
.markdown-editor__image-form input { grid-column: 1 / -1; }
.markdown-editor__link-form input { flex: 1; min-width: 0; height: 2rem; padding: 0 .5rem; border: 1px solid var(--markdown-border); border-radius: .25rem; color: inherit; background: var(--markdown-background); font: inherit; }
.markdown-editor__link-form button { min-width: 2rem; height: 2rem; padding: 0 .5rem; border: 0; border-radius: .25rem; color: var(--markdown-text); background: transparent; font: inherit; cursor: pointer; }
.markdown-editor__link-form button:hover, .markdown-editor__link-form button:focus-visible { outline: none; color: var(--markdown-focus-text); background: var(--markdown-focus-background); }
</style>
