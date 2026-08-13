<script setup lang="ts">
	import { computed, ref } from 'vue';

	import { MarkdownEditor, renderMarkdownPreview, VERSION } from '@gravity-ui/vue-markdown-editor';
	import type { MarkdownEditorLocale, MarkdownEditorMode, MarkdownEditorTheme } from '@gravity-ui/vue-markdown-editor';

	const editorMode = ref<MarkdownEditorMode>('wysiwyg');
	const locale = ref<MarkdownEditorLocale>('ru');
	const theme = ref<MarkdownEditorTheme>('dark');
	const advancedMarkdownDemo = [
		'# Vue Markdown editor {#editor-demo .playground-title}',
		'',
		'##+ Расширенные возможности',
		'',
		'Этот раздел можно свернуть кнопкой в тулбаре.',
		'',
		'Термин',
		': Определение из definition list',
		'',
		'> [Документация Gravity UI](https://gravity-ui.com){data-quotelink=true}',
		'>',
		'> Цитата со ссылкой на источник.',
		'',
		'<div data-demo-html>Raw HTML block</div>',
		'',
		'::: html',
		'<div>HTML directive</div>',
		':::',
		'',
		'Формула: $E = mc^2$',
		'',
		'$$',
		'\\sum_{i=1}^{n} i = \\frac{n(n + 1)}{2}',
		'$$',
		'',
		'```mermaid',
		'graph LR',
		'  Markdown --> Editor',
		'```',
		'',
		'```typescript',
		"const editor = 'Vue Markdown';",
		'console.log(editor);',
		'```',
		'',
		':::html',
		'<section>YFM HTML block</section>',
		':::',
	].join('\n');
	const markdown = ref(advancedMarkdownDemo);
	const previewHtml = computed(() => renderMarkdownPreview(markdown.value));

	function uploadImage(file: File): Promise<{ alt: string; url: string }> {
		if (!file.type.startsWith('image/')) {
			return Promise.reject(new Error('В playground можно загружать только изображения.'));
		}
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.addEventListener('error', () => reject(reader.error ?? new Error('Не удалось прочитать изображение.')));
			reader.addEventListener('load', () => resolve({ alt: file.name, url: String(reader.result) }));
			reader.readAsDataURL(file);
		});
	}
</script>

<template>
	<main class="playground">
		<header class="playground__header">
			<p class="playground__eyebrow">Gravity UI · Vue 3</p>
			<h1>Markdown editor</h1>
			<p class="playground__status">{{ editorMode }} · расширенные Markdown-функции · {{ VERSION }}</p>
			<div class="playground__controls" aria-label="Настройки playground">
				<label>
					Язык
					<select v-model="locale" aria-label="Язык редактора">
						<option value="ru">Русский</option>
						<option value="en">English</option>
					</select>
				</label>
				<label>
					Тема
					<select v-model="theme" aria-label="Тема редактора">
						<option value="auto">Auto</option>
						<option value="light">Light</option>
						<option value="dark">Dark</option>
					</select>
				</label>
			</div>
		</header>
		<section class="playground__workspace" aria-label="Редактор Markdown">
			<MarkdownEditor
				v-model="markdown"
				v-model:locale="locale"
				v-model:mode="editorMode"
				v-model:theme="theme"
				:upload-file="uploadImage"
			/>
			<aside class="playground__source-pane">
				<div class="playground__pane-title">Preview</div>
				<!-- markdown-it is configured with html: false in renderMarkdownPreview. -->
				<!-- eslint-disable-next-line vue/no-v-html -->
				<div class="playground__preview" v-html="previewHtml" />
			</aside>
		</section>
	</main>
</template>
