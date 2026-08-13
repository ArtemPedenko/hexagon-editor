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

`MarkdownEditorLinkForm` and `MarkdownEditorImageForm` are exported for hosts that need to reuse the editor forms outside the built-in toolbar. They share the exported `MarkdownEditorForm` and `MarkdownEditorTextInput` primitives, support `en`/`ru`, validation, disabled/readonly states, and typed submit payloads. The image payload includes optional width and height. File uploads are deliberately not part of the package API.

The component ref exposes `focus()`, `hasFocus()`, `getValue()`, `setValue()`/`replace()`, `clear()`, `prepend()`, `append()`, `insert()`, `isEmpty()`, `moveCursor()`, `getMode()`, and `setMode()`.

## Composable and headless API

`useMarkdownEditor(options)` returns reactive `value` and `mode`, the `MarkdownEditor` instance, and `destroy()`.

The instance supports the same common value/cursor methods, `currentMode`, `setEditorMode()`/`changeEditorMode()`, readonly and toolbar visibility state, typed `on()`/`off()` events, and `destroy()`. The composable mirrors value, mode, readonly, and toolbar visibility as readonly Vue refs.

Headless integrations can compose the exported `ZeroPreset`, `CommonMarkPreset`, `DefaultPreset`, and scoped `FullPreset`. Matching `CommonMarkSpecsPreset` and `FullSpecsPreset` entry points are provided for compatibility with upstream's split preset API; the Vue port keeps schema, parser, serializer, and runtime registrations in the same extension modules.

## Stable entry points

The root entry exports the complete supported public API. Focused integrations may use the documented subpaths: `./core`, `./extensions`, `./specs`, `./presets`, `./toolbar`, `./forms`, `./configure`, and `./classname`. Other internal source paths are not part of the compatibility contract.

`configure({lang, renderers})` sets process-wide defaults and optional host renderers. `cn(block)` provides the upstream-compatible `g-md-` BEM classname convention without a React dependency.

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
