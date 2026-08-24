## Images, uploads, and forms

The built-in editor image form applies only URL, alt and title to its insertion command. Its standalone form also collects name, width and height, but those fields do not make the built-in insertion richer. Select an image in visual mode for resize handles, full width and `object-fit` (`contain`, `cover`, `fill`, `none`, `scale-down`). The serialized attribute form is:

```markdown
![Alt](https://example.com/image.png "Title"){width=100% object-fit=contain}
```

Widths can be numeric pixels or `100%`; height is numeric; object-fit must be one of the five values above. `data:image/` URLs are accepted. A CSP must permit the selected image scheme in `img-src` (and remote host); do not enable `data:` unless your threat model allows it.

```vue
<script setup lang="ts">
import {ref} from 'vue'
import {MarkdownEditor} from 'hexagon-editor'
const value = ref('')
async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/') || file.size > 5_000_000) throw new Error('Invalid image')
  const response = await fetch('/api/images', {method: 'POST', body: new FormData()})
  if (!response.ok) throw new Error('Upload failed')
  const data: unknown = await response.json()
  if (typeof data !== 'object' || data === null || !('url' in data) || typeof data.url !== 'string') throw new Error('Expected URL')
  return data.url
}
</script>
<template><MarkdownEditor v-model="value" :upload-image="uploadImage" toolbar-preset="full" /></template>
```

The standalone image form calls `uploadImage(file)`, sets URL (and empty alt to filename), then emits `invalid` on rejected result/error; applying also validates HTTP(S) or `data:image/`. Repeat type, size, authorization and content validation on the server.

## Standalone forms

They collect state only: none automatically changes an editor.

The full controlled form binding is also typechecked in [`DocumentedApiExamples.vue`](./fixtures/DocumentedApiExamples.vue).

| Component | Props / defaults | Events | Exposed |
| --- | --- | --- | --- |
| `MarkdownEditorImageForm` | `url`, `name`, `alt`, `title`, `width`, `height`, `uploadImage`, `autofocus`, `disabled`; `locale:'ru'`, `theme:'auto'` | `apply`, `cancel`, `invalid`, all six updates | `element` |
| `MarkdownEditorLinkForm` | `url`, `text`, `openInNewWindow`, `hasCurrentLink`, `readOnlyText`, `autofocus`, `disabled`; locale/theme defaults | `apply`, `remove`, `cancel`, `invalid`, three updates | `element` |
| `MarkdownEditorForm` | `disabled:false`, `theme:'auto'` | `submit` | `element` |
| `MarkdownEditorTextInput` | controlled `modelValue`; `type:'text'` (`text`/`url`/`number`), `ariaLabel`, `autofocus`, `disabled`, `error`, `help`, `label`, `min`, `placeholder`, `readonly`, `required` | `update:modelValue` | `focus()`, `input` |

```vue
<script setup lang="ts">
import {ref} from 'vue'
import {MarkdownEditorForm, MarkdownEditorImageForm, MarkdownEditorLinkForm, MarkdownEditorTextInput} from 'hexagon-editor/forms'
const url = ref('https://example.com/image.png'), name = ref('image.png'), alt = ref('Alt'), title = ref('Title'), width = ref(''), height = ref('')
const linkUrl = ref('https://example.com'), text = ref('Read'), blank = ref(true)
const input = ref<InstanceType<typeof MarkdownEditorTextInput>>()
function saveImage() { /* consume emitted params */ }
</script>
<template>
  <MarkdownEditorImageForm v-model:url="url" v-model:name="name" v-model:alt="alt" v-model:title="title" v-model:width="width" v-model:height="height" @apply="saveImage" />
  <MarkdownEditorLinkForm v-model:url="linkUrl" v-model:text="text" v-model:open-in-new-window="blank" has-current-link @apply="console.log" @remove="console.log('remove')" />
  <MarkdownEditorForm @submit="console.log('custom submit')"><MarkdownEditorTextInput ref="input" v-model="text" autofocus label="Label" /><template #footer><button>Save</button></template></MarkdownEditorForm>
  <button type="button" @click="input?.focus()">Focus custom input</button>
</template>
```
