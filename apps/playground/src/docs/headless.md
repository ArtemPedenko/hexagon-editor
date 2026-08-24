## Headless API

`createMarkdownEditor()` is framework-neutral; `useMarkdownEditor()` wraps it in readonly Vue refs and destroys on unmount. It mounts no DOM host.

| `MarkdownEditorOptions` | Default / role |
| --- | --- |
| `actions` | frozen action storage |
| `initialValue`, `initial` | source / fallback `{markup, mode, readonly, toolbarVisible}`; flat wins |
| `mode`, `preset` | `wysiwyg`, `full` |
| `readonly`, `toolbarVisible` | `false`, `true` |
| `locale`, `theme`, `preview`, `placeholder` | integration metadata/options |
| callbacks | `onChange`, `onModeChange`, focus/hasFocus/moveCursor, `beforeEditorModeChange` |

| Method | Result |
| --- | --- |
| `getValue`, `getMode`, `isEmpty` | current value/mode/state |
| `setValue`, `replace`, `clear`, `prepend`, `append` | update value and emit change |
| `insert(markup)` | framework-neutral instance appends at end |
| `setMode(mode)` | calls `changeEditorMode` with reason `manually` |
| `setEditorMode(mode, {emit})` | shorthand for a manual mode change; set `emit: false` to omit `changeEditorMode` while still emitting `modeChange` |
| `changeEditorMode({mode, reason, emit})` | supplies a reason and can suppress the detailed event |
| `setReadonly`, `changeToolbarVisibility`, `focus`, `moveCursor` | host/state integration |
| `action`, `on`, `off`, `destroy` | action/event/lifecycle |

The instance also exposes readonly `actions`, `currentMode`, `preset`, `readonly`, and `toolbarVisible` properties. They describe headless state; they do not mount or control a DOM host.

After `destroy()`, active `on`, set/change operations, `focus`, `hasFocus`, and `moveCursor` throw. Value/mode/state getters and `action` remain readable; repeated `destroy()` is safe. Events: `change: string`, `modeChange: mode`, `changeEditorMode: {mode,reason,emit}`, `changeReadonly: {readonly}`, `changeToolbarVisibility: {visible}`, `destroy: undefined`.

```vue
<script setup lang="ts">
import {onBeforeUnmount} from 'vue'
import {useMarkdownEditor} from 'hexagon-editor'
const storage = {save: {run: () => console.log('save')}}
const {editor, value, destroy} = useMarkdownEditor({actions: storage, initialValue: '# Draft', onFocus: () => document.querySelector<HTMLButtonElement>('#focus-adapter')?.focus(), beforeEditorModeChange: ({mode, reason}) => !(mode === 'split' && reason === 'settings')})
const changed = (next: string) => console.log(next)
editor.on('change', changed)
function unsubscribe() { editor.off('change', changed) }
onBeforeUnmount(unsubscribe)
</script>
<template><pre>{{ value }}</pre><button id="focus-adapter" @click="editor.insert('## End')">Insert</button><button @click="destroy">Early destroy</button></template>
```

The minimal headless insertion fixture is typechecked in [`DocumentedApiExamples.vue`](./fixtures/DocumentedApiExamples.vue).
