## Toolbar customization

`toolbarConfig` replaces preset groups, never the mode switch. The `toolbar` slot supplements built-in toolbar groups. Items appear in declared order.

| Preset | Ordered groups and items |
| --- | --- |
| `zero` | history: `undo`, `redo` |
| `commonmark` | history; text: `bold`, `italic`; blocks: `heading`, `bullet-list`, `ordered-list`, `link`, `quote`, `code`, `code-block`; hidden: `horizontal-rule` |
| `default` | commonmark, with `strike` in text |
| `minimal` | history; text: `heading`, `bold`, `italic`, `underline`, `strike`; blocks: `bullet-list`, `ordered-list`, `quote`, `fold-heading`; links: `link` |
| `full` | history; text: `heading`, `bold`, `italic`, `underline`, `strike`, `mark`, `code`; blocks: `bullet-list`, `ordered-list`, `quote`, `fold-heading`, `code-block`; links: `color`, `link`, `image`; insert: `formula`, `mermaid`, `html`, `horizontal-rule`, `table` |

`bullet-list` and `ordered-list` open one list menu; `code` and `code-block` share one code menu. `color` opens a palette of `gray`, `yellow`, `orange`, `red`, `green`, `blue`, and `violet`; it applies the chosen color to the current selection or to subsequently typed text. `code-language` is local to a selected code block and intentionally cannot appear in the main toolbar.

```vue
<script setup lang="ts">
import {ref} from 'vue'
import {MarkdownEditor, createToolbarConfig, createToolbarGroup, createToolbarItem} from 'hexagon-editor'
const value = ref('Select text')
const toolbar = createToolbarConfig([createToolbarGroup('text', [createToolbarItem('bold', {action: {
  run: ({commands, execute}) => execute(commands.bold), isActive: (state) => state.bold,
  isEnabled: (state) => !state.codeBlock,
}})])])
</script>
<template><MarkdownEditor v-model="value" :toolbar-config="toolbar" /></template>
```

`run(context)`, `isActive(state)`, `isEnabled(state)` and item `isAvailable(state)` are supported. In markup mode a supported built-in command is routed to markup; a custom visual command has no automatic markup equivalent.

| `BasicWysiwygSelectionState` fields |
| --- |
| `bold`, `italic`, `underline`, `strikethrough`, `mark`, `code`, `formula`, `mermaid`, `quote`, `image` |
| `headingLevel`, `headingFolded`, `bulletList`, `orderedList`, `listIndentEnabled`, `listOutdentEnabled` |
| `codeBlock`, `codeBlockLanguage`, `linkHref`, `linkText`, `linkOpenInNewWindow`, `imageObjectFit` |

| Built-in contextual rule | Result |
| --- | --- |
| `fold-heading` outside a heading | unavailable |
| `code-language` in main toolbar | unavailable; it is local to code blocks |
