## Markdown essentials

The `commonmark` toolbar preset provides controls for portable Markdown. A literal Markdown character is escaped with `\\` (`\\*not italic\\*`). A bare `https://example.com` remains text; use `<https://example.com>` for an autolink, or `[label](https://example.com "title")` for an explicit link with optional title. Images use `![alt](url "title")`; alt text is not optional for accessible documents.

Inline code is wrapped in backticks; use a longer delimiter when its content contains one. Fenced code uses backticks plus an optional language (` ```ts `). The bundled renderer styles code but deliberately does not syntax-highlight: add a sanitizer-aware highlighter yourself if needed.

````markdown
# Release notes

Escaped \*stars\*, **bold**, _italic_, `const x = 1`, <https://example.com>, and [guide](https://example.com 'Guide').
![Diagram](https://example.com/image.png 'Release diagram')

> Outer quote
>
> > Nested quote

- Parent
  1. Ordered child
     - mixed child
  2. Continue the parent after a blank line

  Continued paragraph in the list item.

Hard break  
or backslash\\
soft break is an ordinary newline.

---

---

---

```ts
const portable = true;
```
````

Use Tab/Shift+Tab in visual nested lists to indent/outdent; in markup mode keep continuation paragraphs indented relative to the item. Blank lines separate blocks. The complete document above is suitable for editor → markup → renderer round-trip; the `commonmark` preset only controls which toolbar buttons are shown. Formatting may be normalized, so compare semantics rather than whitespace.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownEditor } from 'hexagon-editor';
const value = ref('# Notes\n\nA [link](https://example.com "Title").');
</script>
<template>
  <MarkdownEditor
    v-model="value"
    toolbar-preset="commonmark"
  />
</template>
```
