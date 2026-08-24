## Renderer, SSR, and styling

For document presentation import `MarkdownRenderer` and `hexagon-editor/renderer.css`. It is renderer-only: no editor UI, ProseMirror/CodeMirror hosts, v-model or editing events. `MarkdownEditor readonly` retains editor chrome and hosts but disables editing/hides toolbar.

| Prop | Meaning |
| --- | --- |
| `content` | Required Markdown source to render. |
| `directiveComponents` | Optional mapping from directive names to Vue components. Components mount with the current Vue app context and receive readonly directive props. |
| `features` | Optional math and Mermaid adapters. The renderer ignores `features.html`: `:::html` remains escaped source. |

| Need | `MarkdownEditor readonly` | `MarkdownRenderer` |
| --- | ---: | ---: |
| Editor presentation / header | ✓ | — |
| Small read-only document renderer | — | ✓ |
| SSR HTML without editor DOM | — | ✓ |
| Directive Vue component mount/unmount | ✓ | ✓ |

```vue
<script setup lang="ts">
import {MarkdownRenderer} from 'hexagon-editor/renderer'
import 'hexagon-editor/renderer.css'
defineProps<{content: string}>()
</script>
<template><MarkdownRenderer :content="content" /></template>
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({css: ['hexagon-editor/renderer.css']})
// renderer-only Vite code should import from hexagon-editor/renderer, never the root editor component.
```

Server rendering produces Markdown HTML and Mermaid source fallback. During hydration directive targets mount with the Vue app context; changing content unmounts/replaces them. Mermaid loaders run only on the client and only where a diagram exists; load or render failure leaves source visible. Code blocks have no syntax highlighter—integrate one before display without making HTML trusted.

The editor uses `--markdown-background`, `--markdown-border`, `--markdown-muted-border`, `--markdown-text`, `--markdown-focus-background`, and `--markdown-focus-text`. Floating panels copy the relevant surface variables when they open; teleported forms have their own theme defaults, including `--markdown-error` and `--markdown-muted-text`. Renderer hooks include `--markdown-renderer-link` and `--markdown-renderer-code-background`.

```css
.article { color-scheme: light dark; }
.article .markdown-renderer { --markdown-renderer-link: #075bc7; --markdown-renderer-code-background: #eef4ff; }
@media (prefers-color-scheme: dark) { .article .markdown-renderer { --markdown-renderer-link: #9dc2ff; --markdown-renderer-code-background: #202a3a; } }
```

Keep overrides application-scoped. CSP must allow approved image/font/style sources; trusted `::: html` is unsanitized and is unsafe for untrusted authors.
