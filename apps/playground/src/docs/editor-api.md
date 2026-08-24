## Editor component API

`MarkdownEditor` is a controlled Vue component: `v-model` owns Markdown and `v-model:mode` owns `'wysiwyg' | 'markup' | 'split'`. Defaults are `modelValue: ''`, `mode: 'wysiwyg'`, `locale: 'ru'`, `theme: 'auto'`, `placeholder: ''`, `readonly: false`, and `toolbarPreset: 'default'`.

| Prop | Reactivity | Notes |
| --- | --- | --- |
| `modelValue`, `mode` | without remount | External value is applied; a mode change replaces hosts |
| `locale` | without remount | Re-localizes rendered math |
| `readonly`, `features`, `mode` | recreate editor hosts | Local selection/history reset |
| `modelValue`, `locale`, `toolbarPreset`, `toolbarConfig`, `theme`, `uploadImage` | without remount | Values/toolbar/form presentation update reactively |
| `placeholder`, `directiveComponents` | next mount | Not watched after host creation; change `:key` to force it |

`toolbarConfig` replaces preset groups, but never the mode switch. The `toolbar` slot **adds to** built-in groups; it does not replace them. Its props are:

```ts
{commands: BasicEditorCommands; execute(command: Command): void}
```

The component emits `update:modelValue`/`change`, `update:mode`/`mode-change`, and parameterless `submit`/`cancel`. The latter originate from the visual host’s `Mod+Enter` and Escape keymap and are not a markup-mode promise. Any host remount discards its local selection and undo history.

```vue
<script setup lang="ts">
import {ref} from 'vue'
import {MarkdownEditor} from 'hexagon-editor'
const value = ref('# Article')
</script>
<template>
  <MarkdownEditor v-model="value" readonly toolbar-preset="full">
    <template #header><strong>Read-only draft</strong></template>
  </MarkdownEditor>
</template>
```

```vue
<script setup lang="ts">
import {ref} from 'vue'
import {MarkdownEditor} from 'hexagon-editor'
const value = ref('Select text')
</script>
<template>
  <MarkdownEditor v-model="value">
    <template #header><h2>Article editor</h2></template>
    <template #toolbar="{commands, execute}"><button type="button" @click="execute(commands.bold)">Extra bold</button></template>
  </MarkdownEditor>
</template>
```

For public document display use `MarkdownRenderer`; it has no editing events or editor hosts.

The copyable component/toolbar example is typechecked as [`DocumentedApiExamples.vue`](./fixtures/DocumentedApiExamples.vue).
