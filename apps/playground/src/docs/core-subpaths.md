## Core and public subpaths

Stable entries are `/core`, `/extensions`, `/specs`, `/presets`, `/toolbar`, `/forms`, `/renderer`, `/configure`, `/classname`, and `/i18n`. Do not import `src/**`; low-level APIs are stable only at these entry points.

| API | Purpose / minimum use | Lifecycle and compatibility |
| --- | --- | --- |
| `MarkdownCodec` / `basicMarkdownCodec` | `new MarkdownCodec().serialize(codec.parse(markdown))` | Default schema only; no teardown |
| `renderMarkdownPreview` | `renderMarkdownPreview(markdown)` | safe local CommonMark HTML preview; no teardown |
| `mountBasicWysiwygEditor` | `mountBasicWysiwygEditor({target, initialValue})` | call `destroy()`; use its matching schema/build |
| `mountBasicMarkupEditor` | `mountBasicMarkupEditor({target, initialValue})` | call `destroy()` |
| `createBasicEditorCommands` | commands passed to visual host `run()` | commands require compatible visual schema |
| `createBasicMarkupCommands` | markup commands passed to markup host | no visual selection state |
| `ActionsManager` | named `get/set` action storage | application-owned; no DOM lifecycle |
| `EventEmitter` / `SafeEventEmitter` | typed subscribe/emit; Safe isolates listeners | unsubscribe or clear at teardown |
| `ExtensionBuilder` / `ExtensionsManager` | register then `.build()` schema/parser/serializer/plugins/actions | all parts must come from one build |
| parser/serializer registries | token and serializer registrations | names must match schema node/mark names |
| schema modifiers | alter constructed schema | do before creating state |
| Vue node views | `createVueNodeView(Component)` | receives app context; destroy view with host |
| widget decorations / context panels | `createVueWidgetDecoration`, `createVueContextPanelPlugin` | plugin/view teardown follows editor host |

```ts
import {MarkdownCodec, createBasicEditorCommands, createBasicMarkupCommands, mountBasicMarkupEditor, mountBasicWysiwygEditor} from 'hexagon-editor/core'
const codec = new MarkdownCodec()
const markdown = codec.serialize(codec.parse('# Stored'))
const visual = mountBasicWysiwygEditor({target: visualElement, initialValue: markdown})
const markup = mountBasicMarkupEditor({target: markupElement, initialValue: markdown})
visual.run(createBasicEditorCommands().bold)
markup.run(createBasicMarkupCommands().bold)
visual.destroy(); markup.destroy()
```

These are integration APIs, not a promise that every internal command helper remains separately stable. Group helpers by the host/schema they serve and test schema compatibility plus teardown.

```vue
<script setup lang="ts">
import {ref} from 'vue'
import {MarkdownEditor} from 'hexagon-editor'
const value = ref('## Public subpaths')
</script>
<template><MarkdownEditor v-model="value" /></template>
```
