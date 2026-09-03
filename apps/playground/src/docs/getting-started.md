## Install the package

Hexagon Editor requires Vue `^3.5.0`; Vue is its only peer dependency. Install the package with your package manager:

```bash
pnpm add hexagon-editor
```

For Vue with Vite, import the complete stylesheet once in `main.ts`. Library JavaScript entry points do not import CSS as a side effect, so this explicit import is required.

```ts
import { createApp } from 'vue';
import App from './App.vue';
import 'hexagon-editor/style.css';

createApp(App).mount('#app');
```

## Your first editor and preview

`v-model` is always a Markdown string, in every editing mode. Use the separate renderer entry point when you need a lightweight read-only preview.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownEditor } from 'hexagon-editor';
import { MarkdownRenderer } from 'hexagon-editor/renderer';

const markdown = ref('# Hello\n\nStart writing.');
</script>

<template>
  <MarkdownEditor
    v-model="markdown"
    locale="en"
    toolbar-preset="full"
  />
  <MarkdownRenderer :content="markdown" />
</template>
```

## Nuxt and renderer-only applications

Register styles through Nuxt configuration. Use `renderer.css` when the application never mounts the editor; it omits editor, CodeMirror, ProseMirror, and toolbar styles.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  css: ['hexagon-editor/style.css'],
});
```

The visual and markup editors require a browser DOM. `MarkdownRenderer` is SSR-compatible. Keep persisted values as Markdown, provide your own image storage, and do not enable trusted HTML for untrusted input without sanitizing it.
