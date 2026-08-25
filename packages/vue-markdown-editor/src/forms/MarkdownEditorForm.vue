<script setup lang="ts">
import { ref } from 'vue';
import type { MarkdownEditorTheme } from '../public-types';

defineOptions({ name: 'MarkdownEditorForm' });

withDefaults(
	defineProps<{
		disabled?: boolean;
		theme?: MarkdownEditorTheme;
	}>(),
	{ disabled: false, theme: 'auto' },
);

const emit = defineEmits<{ submit: [] }>();
const element = ref<HTMLFormElement>();
defineExpose({ element });
</script>

<template>
	<form
		ref="element"
		class="markdown-editor-form"
		:aria-disabled="disabled || undefined"
		:data-theme="theme"
		novalidate
		@submit.prevent="emit('submit')"
	>
		<div class="markdown-editor-form__layout"><slot /></div>
		<footer class="markdown-editor-form__footer"><slot name="footer" /></footer>
	</form>
</template>

<style>
.markdown-editor-form {
	--markdown-background: #fff;
	--markdown-border: #d8dbe0;
	--markdown-error: #c9341c;
	--markdown-focus-background: #e9efff;
	--markdown-focus-text: #1d3c93;
	--markdown-muted-text: #667085;
	--markdown-text: #202125;
	z-index: 10;
	box-sizing: border-box;
	width: min(24rem, calc(100vw - 1rem));
	padding: 0.75rem;
	border: 1px solid var(--markdown-border);
	border-radius: 0.5rem;
	box-shadow: 0 0.5rem 1.25rem rgb(0 0 0 / 18%);
	color: var(--markdown-text);
	background: var(--markdown-background);
}
.markdown-editor-form[data-theme='dark'] {
	--markdown-background: #1e2024;
	--markdown-border: #464b55;
	--markdown-error: #ff8f7a;
	--markdown-focus-background: #2d416e;
	--markdown-focus-text: #d7e2ff;
	--markdown-muted-text: #aab0bb;
	--markdown-text: #f1f3f5;
}
@media (prefers-color-scheme: dark) {
	.markdown-editor-form[data-theme='auto'] {
		--markdown-background: #1e2024;
		--markdown-border: #464b55;
		--markdown-error: #ff8f7a;
		--markdown-focus-background: #2d416e;
		--markdown-focus-text: #d7e2ff;
		--markdown-muted-text: #aab0bb;
		--markdown-text: #f1f3f5;
	}
}
.markdown-editor-form__layout {
	display: grid;
	gap: 0.5rem;
}
.markdown-editor-form__row {
	display: grid;
	gap: 0.2rem;
	min-width: 0;
}
.markdown-editor-form__label {
	font-size: 0.75rem;
	color: var(--markdown-muted-text, var(--markdown-text));
}
.markdown-editor-form__input {
	box-sizing: border-box;
	min-width: 0;
	width: 100%;
	height: 2rem;
	padding: 0 0.5rem;
	border: 1px solid var(--markdown-border);
	border-radius: 0.25rem;
	color: inherit;
	background: var(--markdown-background);
	font: inherit;
}
.markdown-editor-form__input:focus-visible {
	outline: 2px solid var(--markdown-focus-text);
	outline-offset: 1px;
}
.markdown-editor-form__input--error {
	border-color: var(--markdown-error);
}
.markdown-editor-form__input:disabled {
	cursor: not-allowed;
	opacity: 0.55;
}
.markdown-editor-form__input:read-only {
	background: var(--markdown-focus-background);
}
.markdown-editor-form__help {
	font-size: 0.7rem;
	color: var(--markdown-muted-text, var(--markdown-text));
}
.markdown-editor-form__help--error {
	color: var(--markdown-error);
}
.markdown-editor-form__footer {
	display: flex;
	justify-content: flex-end;
	gap: 0.25rem;
	margin-top: 0.5rem;
}
.markdown-editor-form__footer button {
	min-width: 2rem;
	height: 2rem;
	padding: 0 0.5rem;
	border: 0;
	border-radius: 0.25rem;
	color: var(--markdown-text);
	background: transparent;
	font: inherit;
	cursor: pointer;
}
.markdown-editor-form__footer button:hover {
	color: var(--markdown-focus-text);
	background: var(--markdown-focus-background);
}
.markdown-editor-form__footer button:focus-visible {
	outline: 2px solid var(--markdown-focus-text);
	outline-offset: 1px;
}
.markdown-editor-form__footer button:disabled {
	cursor: not-allowed;
	opacity: 0.55;
}
@media (max-width: 480px) {
	.markdown-editor-form {
		width: calc(100vw - 0.5rem);
		padding: 0.625rem;
	}
	.markdown-editor-form__footer {
		flex-wrap: wrap;
	}
}
</style>
