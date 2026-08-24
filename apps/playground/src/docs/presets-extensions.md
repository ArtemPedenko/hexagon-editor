## Presets, extensions, and specs

`ZeroPreset` supplies the base schema/keymap/input rules. `CommonMarkPreset` adds CommonMark nodes and marks; `DefaultPreset` adds strike and tables; `FullPreset` adds YFM/additional syntax and runtime behavior. `CommonMarkSpecsPreset` and `FullSpecsPreset` are compatibility aliases of the corresponding merged registrations: use them when an integration convention asks for a “specs” bundle, not to obtain a different schema.

| Option | Owner | Default | Meaning |
| --- | --- | --- | --- |
| `baseSchema` | zero | `{}` | Base-schema options |
| `h1Key`–`h6Key` | `heading` | unset | Keymap bindings, or `null` to disable |
| `linkKey` | `link` | unset | Link key binding |
| `boldKey`, `italicKey`, `codeKey`, `codeBlockKey` | marks/code | unset | Keymap bindings |
| `ulKey`, `olKey` | lists | unset | List key bindings |
| `preferredBreak` | breaks | `'hard'` | `'hard'` or `'soft'` break inserted by `Shift+Enter` |
| `history` | full | `{}` | ProseMirror history options |
| `placeholder` | full | `{}` | Placeholder options |
| `cursor` | full | `{}` | Drop/gap cursor options |
| `selectionContext` | full | `{}` | Selection context options |
| `editorModeKeymap` | full | `{}` | submit/cancel keymap options |
| `heading`, `image` | CommonMark | enabled | `false` disables, an extension replaces, object configures |

These are the public preset option families; all unspecified key fields are absent, not invented defaults. `heading.levels` and `link.openInNewWindow` are not options. Window targeting belongs to `setLink(..., true)` / the link form.

```ts
import {ExtensionsManager} from 'hexagon-editor/core'
import {Math} from 'hexagon-editor/extensions'
import {DefaultPreset} from 'hexagon-editor/presets'
const built = new ExtensionsManager((builder) => builder.use(DefaultPreset, {heading: {h2Key: 'Mod-Alt-2'}, link: {linkKey: 'Mod-k'}}).use(Math)).build()
const document = built.textParser.parse('## Formula\n\n$E=mc^2$')
const markdown = built.serializer.serialize(document)
const addMathInline = built.actions.action('addMathInline')
const toMathBlock = built.actions.action('toMathBlock')
void markdown; void addMathInline; void toMathBlock
```

## Custom extension round-trip

An extension must register compatible schema, parser and serializer entries in one build. This custom bundle uses the existing `Underline` extension, whose parser and serializer are paired.

```ts
import {ExtensionsManager} from 'hexagon-editor/core'
import {Underline} from 'hexagon-editor/extensions'
import {CommonMarkPreset} from 'hexagon-editor/presets'
const bundle = new ExtensionsManager((builder) => builder.use(CommonMarkPreset, {}).use(Underline)).build()
const roundTrip = bundle.serializer.serialize(bundle.textParser.parse('++kept++'))
// roundTrip === '++kept++'
```

Toolbar presets configure buttons; extension presets configure parser/schema/plugins. They are related but not interchangeable.

```vue
<script setup lang="ts">
import {ref} from 'vue'
import {MarkdownEditor} from 'hexagon-editor'
const value = ref('## Full preset\n\n++Underline++')
</script>
<template><MarkdownEditor v-model="value" toolbar-preset="full" /></template>
```
