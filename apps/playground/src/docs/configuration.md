## Configuration, i18n, and class names

`configure({lang})` stores process-global configuration and notifies subscribers. The current `MarkdownEditor` does **not** subscribe to it automatically: pass `locale` explicitly to each instance. Supported locales are `en` and `ru`; custom locale registration is not available. `VERSION` is exported for integration diagnostics.

```ts
configure(nextConfig: MarkdownEditorConfig): void
getConfig(): Readonly<MarkdownEditorConfig>
subscribeConfigure(subscriber: ConfigureSubscriber): () => void
```

```vue
<script setup lang="ts">
import {onBeforeUnmount, ref} from 'vue'
import {Lang, MarkdownEditor, VERSION, configure, getConfig, subscribeConfigure} from 'hexagon-editor'
configure({lang: Lang.En})
const value = ref('')
const globalLang = ref(getConfig().lang)
const unsubscribe = subscribeConfigure((config) => { globalLang.value = config.lang })
onBeforeUnmount(unsubscribe)
console.log(VERSION)
</script>
<template><p>Global: {{ globalLang }}</p><MarkdownEditor v-model="value" locale="en" /></template>
```

| Locale | Built-in messages |
| --- | --- |
| `en` | English |
| `ru` | Russian |

`cn(block)` creates `hx-md-` BEM names. Modifier values `true`, string and number emit a modifier; `false`, `null`, and `undefined` do not. Mixes may be strings or nested arrays.

```ts
import {cn} from 'hexagon-editor/classname'
const editor = cn('editor')
editor({readonly: true, mode: 'split', density: 2, hidden: false, missing: null, later: undefined}, ['surface', ['wide', null]])
// hx-md-editor hx-md-editor_readonly hx-md-editor_mode_split hx-md-editor_density_2 surface wide
editor('toolbar', {sticky: true}) // hx-md-editor__toolbar hx-md-editor__toolbar_sticky
```
