## Modes and controlled state

`wysiwyg` is the visual ProseMirror surface, `markup` edits the Markdown source with CodeMirror, and `split` mounts both. Switching preserves the shared Markdown value. In split mode, edits synchronize between surfaces.

```vue
<script setup lang="ts">
import {ref} from 'vue'
import {MarkdownEditor} from 'hexagon-editor'
import type {MarkdownEditorExposed, MarkdownEditorMode} from 'hexagon-editor'

const editor = ref<MarkdownEditorExposed>()
const value = ref('## Draft\n\nEdit either side.')
const mode = ref<MarkdownEditorMode>('wysiwyg')

async function editSource() {
  await editor.value?.setMode('markup')
  editor.value?.moveCursor('end')
  editor.value?.focus()
}
</script>

<template>
  <button type="button" @click="editSource">Edit source</button>
  <MarkdownEditor ref="editor" v-model="value" v-model:mode="mode" />
</template>
```

## Component-ref methods

| Method | Behavior |
| --- | --- |
| `getValue()`, `setValue(value)`, `replace(value)` | Read or replace the Markdown |
| `prepend(markup)`, `append(markup)` | Join content with a blank line |
| `insert(markup)` | Insert at the active surface/cursor |
| `clear()`, `isEmpty()` | Clear or inspect the document |
| `getMode()`, `setMode(mode)` | Read or asynchronously switch mode |
| `focus()`, `hasFocus()` | Manage active-surface focus |
| `moveCursor(position)` | Move to `'start'`, `'end'`, or `{line: number}` |

```ts
import type {MarkdownEditorExposed} from 'hexagon-editor'

function addTemplate(editor: MarkdownEditorExposed) {
  editor.prepend('# Project')
  editor.append('## Next steps')
  editor.moveCursor({line: 3})
}
```

An object line position targets the markup surface in `markup` or `split`; the visual surface only uses start/end. Unsupported constructs can appear as editable atomic source blocks in visual mode. Unmounting destroys both DOM hosts and their local selection/history state; remounting creates fresh hosts from `modelValue`, which is useful for route-level reset behavior.
