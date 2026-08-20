<script setup lang="ts">
	import { computed, ref } from 'vue';

	import { MarkdownEditor, VERSION } from 'hexagon-editor';
	import type {
		MarkdownEditorLocale,
		MarkdownEditorMode,
		MarkdownEditorTheme,
		MarkdownEditorToolbarConfig,
		MermaidEngine,
	} from 'hexagon-editor';
	import { MarkdownRenderer } from 'hexagon-editor/renderer';
	import katex from 'katex';
	import mermaid from 'mermaid';
	import type { MarkdownFeatures } from 'hexagon-editor';

	const mermaidEngine: MermaidEngine = {
		initialize: (options: {securityLevel?: 'strict'; startOnLoad?: boolean} = {}) => {
			mermaid.initialize({securityLevel: options.securityLevel, startOnLoad: options.startOnLoad});
		},
		render: mermaid.render,
	};

	const features: MarkdownFeatures = {
		math: {renderToString: (latex, display) => katex.renderToString(latex, {displayMode: display, throwOnError: true})},
		mermaid: {load: async () => mermaidEngine},
	};

	type PlaygroundExample = 'advanced' | 'image-upload';

	const IMAGE_UPLOAD_ENDPOINT = '/api/images';
	const editorMode = ref<MarkdownEditorMode>('wysiwyg');
	const locale = ref<MarkdownEditorLocale>('ru');
	const theme = ref<MarkdownEditorTheme>('dark');
	const example = ref<PlaygroundExample>('advanced');
	const imageUploadToolbar: MarkdownEditorToolbarConfig = {
		groups: [
			{id: 'history', items: ['undo', 'redo']},
			{id: 'text', items: ['heading', 'bold', 'italic', 'strike', 'code']},
			{id: 'blocks', items: ['bullet-list', 'ordered-list', 'quote']},
			{id: 'links', items: ['link', 'image']},
			{id: 'insert', items: ['horizontal-rule', 'table']},
		],
	};
	const toolbarConfig = computed(() => example.value === 'image-upload' ? imageUploadToolbar : undefined);
	const advancedMarkdownDemo = [
		'# Vue Markdown editor {#editor-demo .playground-title}',
		'',
		'##+ Расширенные возможности',
		'',
		'Этот раздел можно свернуть кнопкой в тулбаре.',
		'',
		'> Изменения затрагивают:',
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

	async function uploadImage(file: File): Promise<string> {
		const formData = new FormData();
		formData.append('image', file);
		const response = await fetch(IMAGE_UPLOAD_ENDPOINT, {body: formData, method: 'POST'});
		if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
		const result: unknown = await response.json();
		if (typeof result !== 'object' || result === null || !('url' in result) || typeof result.url !== 'string') {
			throw new Error('Upload API must return {url: string}');
		}
		return result.url;
	}
</script>

<template>
  <main class="playground">
    <header class="playground__header">
      <p class="playground__eyebrow">Gravity UI · Vue 3</p>
      <h1>Markdown editor</h1>
      <p class="playground__status">{{ editorMode }} · {{ example === 'advanced' ? 'расширенные Markdown-функции' : 'свой toolbar и API-загрузка' }} · {{ VERSION }}</p>
      <div class="playground__controls" aria-label="Настройки playground">
        <label>
          Пример
          <select v-model="example" aria-label="Пример редактора">
            <option value="advanced">Полный toolbar</option>
            <option value="image-upload">Загрузка изображений</option>
          </select>
        </label>
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
        toolbar-preset="full"
        :features="features"
        :toolbar-config="toolbarConfig"
        :upload-image="example === 'image-upload' ? uploadImage : undefined"
      />
      <aside class="playground__source-pane">
        <div class="playground__pane-title">Preview</div>
        <MarkdownRenderer class="playground__preview" :content="markdown" :features="features" />
      </aside>
    </section>
  </main>
</template>
