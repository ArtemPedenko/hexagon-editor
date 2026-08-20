# hexagon-editor

Vue 3 editor for Markdown and YFM with visual, markup and split modes.

## Install

```bash
pnpm add hexagon-editor
```

Component styles are included automatically when importing the editor or renderer. The
`hexagon-editor/style.css` export is available only for integrations that need to load
the complete stylesheet explicitly.

## Read-only rendering

Sites that only display documents can import the standalone renderer without bundling the editor, ProseMirror, CodeMirror, toolbar, or editor styles:

```vue
<script setup lang="ts">
import {MarkdownRenderer} from 'hexagon-editor/renderer';

defineProps<{content: string}>();
</script>

<template>
  <MarkdownRenderer :content="content" />
</template>
```

`MarkdownRenderer` supports server rendering. Mermaid source is emitted as a stable fallback during SSR and is replaced with an SVG after hydration. The Mermaid runtime is loaded lazily only when a document contains a diagram.

Math and Mermaid engines are optional and are not included in the base installation. Install only what the application uses:

```bash
pnpm add katex
pnpm add mermaid
```

Pass local adapters through `features`; Mermaid can be loaded lazily, and KaTeX styles must be imported by the application:

```ts
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type {MarkdownFeatures} from 'hexagon-editor';

const features: MarkdownFeatures = {
  math: {renderToString: (latex, display) => katex.renderToString(latex, {displayMode: display, throwOnError: true})},
  mermaid: {load: () => import('mermaid').then(({default: mermaid}) => mermaid)},
};
```

Without a corresponding feature, formulas and Mermaid remain safe editable Markdown fallbacks. `features.html` accepts a local trusted HTML renderer for editor HTML blocks.

The renderer includes basic typography for headings, links, and inline code. Override its `.markdown-renderer` root, semantic descendants, or the `--markdown-renderer-link` and `--markdown-renderer-code-background` custom properties to match the consuming site. KaTeX output requires host-provided styles if the site wants the standard KaTeX appearance.

Raw Markdown HTML and the contents of `:::html ... :::` are displayed as source text. Only the spaced `::: html ... :::` directive is rendered as HTML. Pass trusted content to that directive; the renderer does not sanitize it.

## Component API

```vue
<script setup lang="ts">
import {ref} from 'vue';
import {MarkdownEditor} from 'hexagon-editor';

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

The root entry exports the complete supported public API. Focused integrations may use the documented subpaths: `./core`, `./extensions`, `./specs`, `./presets`, `./renderer`, `./toolbar`, `./forms`, `./configure`, and `./classname`. Other internal source paths are not part of the compatibility contract.

`configure({lang})` sets process-wide defaults. `cn(block)` provides the `hx-md-` BEM classname convention without a React dependency.

## Supported Markdown

The editor supports CommonMark blocks and marks, tables, definition lists, heading attributes and folding headings (`##+`), quote links, raw HTML, directives, Math/LaTeX (`$…$` and `$$…$$`), Mermaid fences, and YFM HTML blocks (`:::html`).

KaTeX and Mermaid render only when their local `features` adapters are supplied.

Invalid Mermaid source remains visible as an editable fallback. YFM HTML source remains visible unless the host supplies a renderer.

## Accessibility and responsive behavior

The mode selector is a keyboard-accessible tablist: use `ArrowLeft`, `ArrowRight`, `Home`, and `End`. Toolbar controls have accessible labels. On narrow viewports, the toolbar scrolls horizontally and split mode becomes vertical.

## Playground

Run `pnpm dev` and open the displayed local URL. The playground includes a complete extension sample, visual/markup/split controls, and live locale/theme switches.
