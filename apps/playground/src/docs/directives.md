## Custom directives

A directive is `::: name {attrs}`, content, and a mandatory closing `:::`. Attributes are passed to each plugin's parser; unknown names remain readable source-like blocks. In visual editor a registered component is mounted as a node view; in renderer it mounts into its render target. `directives` is read on host creation, so replace it with a component remount (`:key`) to apply it after mount.

```vue
<script setup lang="ts">
import type { MarkdownDirectiveComponentProps } from 'hexagon-editor';

const props = defineProps<MarkdownDirectiveComponentProps>();
</script>
<template>
  <aside :data-directive="props.name">
    <textarea
      v-if="!props.readonly"
      :value="props.content"
      @input="props.updateContent(($event.target as HTMLTextAreaElement).value)"
    />
    <p v-else>{{ props.content }}</p>
  </aside>
</template>
```

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MarkdownEditor } from 'hexagon-editor';
import NoteDirective from './NoteDirective.vue';
import WarningDirective from './WarningDirective.vue';
const value = ref('::: note\nEditable note\n:::\n\n::: warning\nWarning\n:::');
const directives = {
  note: { component: NoteDirective, insert: { content: '', attrs: {} } },
  warning: { component: WarningDirective, insert: { content: '', attrs: {} } },
};
</script>
<template>
  <MarkdownEditor
    v-model="value"
    :directives="directives"
  />
</template>
```

`updateContent` writes the visual document’s content; renderer passes `readonly: true` and a no-op updater. Components run with the host Vue `appContext`, so installed plugins/provides are available. Component authors own sanitization if they use `v-html` or turn directive content into URLs/HTML.

```ts
// focused integration assertion: editor node view updates Markdown
component.props.updateContent('changed');
expect(editor.getValue()).toContain('changed');
```
