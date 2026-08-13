<script setup lang="ts">
import {ref} from 'vue';

defineOptions({name: 'MarkdownEditorForm'});

withDefaults(defineProps<{
    disabled?: boolean;
}>(), {disabled: false});

const emit = defineEmits<{submit: []}>();
const element = ref<HTMLFormElement>();
defineExpose({element});
</script>

<template>
  <form ref="element" class="markdown-editor-form" :aria-disabled="disabled || undefined" novalidate @submit.prevent="emit('submit')">
    <div class="markdown-editor-form__layout"><slot /></div>
    <footer class="markdown-editor-form__footer"><slot name="footer" /></footer>
  </form>
</template>

<style>
.markdown-editor-form { z-index: 10; width: min(24rem, calc(100vw - 1rem)); padding: .5rem; border: 1px solid var(--markdown-border); border-radius: .5rem; box-shadow: 0 .5rem 1.25rem rgb(0 0 0 / 18%); color: var(--markdown-text); background: var(--markdown-background); }
.markdown-editor-form__layout { display: grid; gap: .5rem; }
.markdown-editor-form__row { display: grid; gap: .2rem; min-width: 0; }
.markdown-editor-form__label { font-size: .75rem; color: var(--markdown-muted-text, var(--markdown-text)); }
.markdown-editor-form__input { box-sizing: border-box; min-width: 0; width: 100%; height: 2rem; padding: 0 .5rem; border: 1px solid var(--markdown-border); border-radius: .25rem; color: inherit; background: var(--markdown-background); font: inherit; }
.markdown-editor-form__input:focus-visible { outline: 2px solid var(--markdown-focus-text); outline-offset: 1px; }
.markdown-editor-form__input--error { border-color: var(--markdown-error, #d4380d); }
.markdown-editor-form__input:disabled { cursor: not-allowed; opacity: .55; }
.markdown-editor-form__input:read-only { background: var(--markdown-focus-background); }
.markdown-editor-form__help { font-size: .7rem; color: var(--markdown-muted-text, var(--markdown-text)); }
.markdown-editor-form__help--error { color: var(--markdown-error, #d4380d); }
.markdown-editor-form__footer { display: flex; justify-content: flex-end; gap: .25rem; margin-top: .5rem; }
.markdown-editor-form__footer button { min-width: 2rem; height: 2rem; padding: 0 .5rem; border: 0; border-radius: .25rem; color: var(--markdown-text); background: transparent; font: inherit; cursor: pointer; }
.markdown-editor-form__footer button:hover, .markdown-editor-form__footer button:focus-visible { outline: none; color: var(--markdown-focus-text); background: var(--markdown-focus-background); }
.markdown-editor-form__footer button:disabled { cursor: not-allowed; opacity: .55; }
</style>
