<script setup lang="ts">
import {ref} from 'vue';
import {
    MarkdownEditor,
    MarkdownEditorForm,
    MarkdownEditorImageForm,
    MarkdownEditorLinkForm,
    MarkdownEditorTextInput,
    createToolbarConfig,
    createToolbarGroup,
    createToolbarItem,
    useMarkdownEditor,
} from 'hexagon-editor';

const value = ref('## Typed documentation example');
const imageUrl = ref('https://example.com/image.png');
const imageName = ref('image.png');
const imageAlt = ref('Example image');
const imageTitle = ref('Title');
const imageWidth = ref('');
const imageHeight = ref('');
const linkUrl = ref('https://example.com');
const linkText = ref('Example link');
const linkBlank = ref(false);
const customText = ref('');
const toolbar = createToolbarConfig([
    createToolbarGroup('text', [createToolbarItem('bold', {
        action: {run: ({commands, execute}) => execute(commands.bold)},
    })]),
]);
const {editor} = useMarkdownEditor({initialValue: '# Headless example'});

function appendHeadless(): void {
    editor.insert('## Appended section');
}
</script>

<template>
  <MarkdownEditor v-model="value" :toolbar-config="toolbar">
    <template #header><strong>Typed fixture</strong></template>
    <template #toolbar="{commands, execute}"><button type="button" @click="execute(commands.italic)">Italic</button></template>
  </MarkdownEditor>
  <MarkdownEditorImageForm v-model:url="imageUrl" v-model:name="imageName" v-model:alt="imageAlt" v-model:title="imageTitle" v-model:width="imageWidth" v-model:height="imageHeight" />
  <MarkdownEditorLinkForm v-model:url="linkUrl" v-model:text="linkText" v-model:open-in-new-window="linkBlank" />
  <MarkdownEditorForm><MarkdownEditorTextInput v-model="customText" label="Custom field" /><template #footer><button>Save</button></template></MarkdownEditorForm>
  <button type="button" @click="appendHeadless">Append headless</button>
</template>
