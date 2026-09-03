## Keyboard, focus, and touch behavior

The mode control is a button which opens a `menu` of `menuitemradio` choices; it is not a tablist. Do not promise Arrow/Home/End navigation: only the controls rendered by the browser are guaranteed. Opening a link, image, heading, code, list, formula, or mode form moves focus into its form; Escape closes every floating panel.

In visual mode `Mod+Enter` emits `submit` and Escape emits `cancel`. Those callbacks are visual-editor keymap behavior; markup mode does not provide that submit/cancel contract. Tab and Shift+Tab indent/outdent nested list items when the list command applies. Tables expose their local actions through selection/right-click and long-press interactions; images resize through pointer/touch handles.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownEditor } from 'hexagon-editor';
const value = ref('');
</script>
<template>
  <section aria-labelledby="notes">
    <h2 id="notes">Notes</h2>
    <MarkdownEditor
      v-model="value"
      locale="en"
    />
  </section>
</template>
```

## Responsive limits

On narrow screens toolbar groups wrap; they do not become a horizontal scrolling toolbar. Split mode stacks vertically. Floating forms fit the viewport, but custom controls and surrounding layout remain the application’s responsibility. Give custom icon controls an accessible name, preserve focus outlines, and test keyboard menu navigation rather than assuming roving-focus shortcuts.
