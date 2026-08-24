## KaTeX, Mermaid, and HTML security

Optional engines are not dependencies. Pass math and Mermaid adapters to the editor and renderer; dynamic import gives Mermaid a separate chunk. The `html` adapter is used only by the visual editor: for YFM `:::html` blocks and, when supplied, trusted `::: html` directives. It is not used by `MarkdownRenderer`.

```ts
interface MermaidEngine {
  initialize(options?: {securityLevel?: 'strict'; startOnLoad?: boolean}): void
  render(id: string, source: string): Promise<{svg: string; bindFunctions?: (element: HTMLElement) => void}> | {svg: string; bindFunctions?: (element: HTMLElement) => void}
}
interface MarkdownFeatures {
  math?: {renderToString(latex: string, display: boolean): string}
  mermaid?: {load(): Promise<MermaidEngine>}
  html?: (source: string) => HTMLElement
}
```

```vue
<script setup lang="ts">
import {ref} from 'vue'
import katex from 'katex'
import {MarkdownEditor} from 'hexagon-editor'
import type {MarkdownFeatures} from 'hexagon-editor'
const value = ref('Inline $x$.\n\n$$x^2$$\n\n$$\na+b\n$$\n\n```mermaid\ngraph LR\n A --> B\n```')
const features: MarkdownFeatures = {
  math: {renderToString: (latex, display) => katex.renderToString(latex, {displayMode: display, throwOnError: true})},
  mermaid: {load: () => import('mermaid').then(({default: engine}) => engine)},
}
</script>
<template><MarkdownEditor v-model="value" :features="features" toolbar-preset="full" /></template>
```

Math render errors retain readable source. Mermaid lazy-load/render errors retain source and mark the target failed. On SSR do not instantiate browser engines: render source fallback server-side, then let the mounted client loader upgrade it. Mermaid is initialized strict; do not weaken this for untrusted input.

| Source | Behavior | Sanitization |
| --- | --- | --- |
| Raw block HTML | Shown as text | Not required |
| Known inline `<u>` / color span | Limited rendering | Parser checks it |
| `::: html` | Inserted as HTML | Mandatory upstream |
| `:::html` | YFM source block | Visual editor: `features.html` must return safe DOM. `MarkdownRenderer`: escaped source, regardless of this adapter |
| Mermaid | Strict mode | Never relax for untrusted input |
