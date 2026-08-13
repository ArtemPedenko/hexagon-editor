# @gravity-ui/vue-markdown-editor

Vue 3 editor for Markdown and YFM with visual, markup and split modes.

## Install

```bash
pnpm add @gravity-ui/vue-markdown-editor
```

Import the component and its styles in the application entry point:

```ts
import '@gravity-ui/vue-markdown-editor/style.css';
```

## Component API

```vue
<script setup lang="ts">
import {ref} from 'vue';
import {MarkdownEditor} from '@gravity-ui/vue-markdown-editor';

const value = ref('# Document');
const mode = ref<'wysiwyg' | 'markup' | 'split'>('wysiwyg');
</script>

<template>
  <MarkdownEditor
    v-model="value"
    v-model:mode="mode"
    locale="ru"
    theme="auto"
  />
</template>
```

Props: `modelValue`, `mode`, `locale` (`ru` or `en`), `theme` (`light`, `dark`, or `auto`), `placeholder`, `readonly`, `toolbarPreset`, and `toolbarConfig`. Built-in toolbar presets are `zero`, `commonmark`, `default`, `full`, and the compatibility preset `minimal`. `toolbarConfig` overrides the preset with ordered toolbar groups and supports action bindings plus contextual `isAvailable`, `isActive`, and `isEnabled` predicates. The exported preset configs and `createToolbarItem`/`createToolbarGroup`/`createToolbarConfig` factories can be reused to build integrations.

Events: `update:modelValue`, `change`, `update:mode`, and `mode-change`.

`MarkdownEditorLinkForm` and `MarkdownEditorImageForm` are exported for hosts that need to reuse the editor forms outside the built-in toolbar. File uploads are deliberately not part of the package API.

The component ref exposes `focus()`, `getValue()`, `setValue()`, `getMode()`, and `setMode()`.

## Composable and headless API

`useMarkdownEditor(options)` returns reactive `value` and `mode`, the `MarkdownEditor` instance, and `destroy()`.

The instance supports `getValue()`, `setValue()`, `getMode()`, `setMode()`, `focus()`, `on()`, `off()`, and `destroy()`.

Headless integrations can compose the exported `ZeroPreset`, `CommonMarkPreset`, `DefaultPreset`, and scoped `FullPreset`. Matching `CommonMarkSpecsPreset` and `FullSpecsPreset` entry points are provided for compatibility with upstream's split preset API; the Vue port keeps schema, parser, serializer, and runtime registrations in the same extension modules.

## Supported Markdown

The editor supports CommonMark blocks and marks, tables, definition lists, heading attributes and folding headings (`##+`), quote links, raw HTML, directives, Math/LaTeX (`$…$` and `$$…$$`), Mermaid fences, and YFM HTML blocks (`:::html`).

KaTeX renders math by default. Mermaid and YFM HTML can use host-provided renderers:

```ts
import {configureAdvancedMarkdownRenderers} from '@gravity-ui/vue-markdown-editor';

configureAdvancedMarkdownRenderers({
  mermaid: (source) => renderMermaidIntoElement(source),
  html: (source) => renderSanitizedHtml(source),
});
```

If a renderer is not supplied, the source remains visible as a safe fallback.

## Accessibility and responsive behavior

The mode selector is a keyboard-accessible tablist: use `ArrowLeft`, `ArrowRight`, `Home`, and `End`. Toolbar controls have accessible labels. On narrow viewports, the toolbar scrolls horizontally and split mode becomes vertical.

## Playground

Run `pnpm dev` and open the displayed local URL. The playground includes a complete extension sample, visual/markup/split controls, and live locale/theme switches.
