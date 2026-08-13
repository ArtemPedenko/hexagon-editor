<script setup lang="ts">
import {computed, ref} from 'vue';
import type {MarkdownEditorLocale, MarkdownEditorTheme} from '../public-types';
import {getMarkdownEditorMessages} from '../i18n';

import MarkdownEditorForm from './MarkdownEditorForm.vue';
import MarkdownEditorTextInput from './MarkdownEditorTextInput.vue';

defineOptions({name: 'MarkdownEditorLinkForm'});

export interface MarkdownEditorLinkSubmitParams {text: string; title: string; url: string}

const props = withDefaults(defineProps<{
    autofocus?: boolean;
    disabled?: boolean;
    hasCurrentLink?: boolean;
    locale?: MarkdownEditorLocale;
    readOnlyText?: boolean;
    text?: string;
    title?: string;
    theme?: MarkdownEditorTheme;
    url?: string;
}>(), {
    autofocus: false,
    disabled: false,
    hasCurrentLink: false,
    locale: 'ru',
    readOnlyText: false,
    text: '',
    title: '',
    theme: 'auto',
    url: '',
});

const emit = defineEmits<{
    apply: [params: MarkdownEditorLinkSubmitParams];
    cancel: [];
    invalid: [message: string];
    remove: [];
    'update:text': [value: string];
    'update:title': [value: string];
    'update:url': [value: string];
}>();

const form = ref<InstanceType<typeof MarkdownEditorForm>>();
const copy = computed(() => getMarkdownEditorMessages(props.locale));
const urlError = ref('');

function submit(): void {
    const url = props.url.trim();
    if (!isValidUrl(url)) {
        urlError.value = copy.value.linkUrlError;
        emit('invalid', urlError.value);
        return;
    }
    urlError.value = '';
    emit('apply', {text: props.text.trim(), title: props.title.trim(), url});
}

function isValidUrl(value: string): boolean {
    try { return value.length > 0 && new URL(value).protocol.match(/^https?:$/) !== null; } catch { return false; }
}

defineExpose({element: computed(() => form.value?.element)});
</script>

<template>
  <MarkdownEditorForm ref="form" :disabled="disabled" :theme="theme" @submit="submit">
    <MarkdownEditorTextInput :model-value="url" :aria-label="copy.linkUrl" :autofocus="autofocus" :disabled="disabled" :error="urlError" :label="copy.linkUrl" placeholder="https://example.com" required type="url" @update:model-value="urlError = ''; emit('update:url', $event)" />
    <MarkdownEditorTextInput :model-value="text" :aria-label="copy.linkText" :disabled="disabled" :help="copy.linkTextHelp" :label="copy.linkText" :readonly="readOnlyText" @update:model-value="emit('update:text', $event)" />
    <MarkdownEditorTextInput :model-value="title" :aria-label="copy.linkTitle" :disabled="disabled" :label="copy.linkTitle" @update:model-value="emit('update:title', $event)" />
    <template #footer>
      <button v-if="hasCurrentLink" :disabled="disabled" type="button" @click="emit('remove')">{{ copy.linkRemove }}</button>
      <button type="button" @click="emit('cancel')">{{ copy.cancel }}</button>
      <button :disabled="disabled || !url.trim()" type="submit">{{ copy.apply }}</button>
    </template>
  </MarkdownEditorForm>
</template>
