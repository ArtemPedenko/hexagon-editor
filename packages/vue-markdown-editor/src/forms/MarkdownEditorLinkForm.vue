<script setup lang="ts">
import {computed, ref} from 'vue';

import MarkdownEditorForm from './MarkdownEditorForm.vue';
import MarkdownEditorTextInput from './MarkdownEditorTextInput.vue';

defineOptions({name: 'MarkdownEditorLinkForm'});

export interface MarkdownEditorLinkSubmitParams {text: string; title: string; url: string}

const props = withDefaults(defineProps<{
    autofocus?: boolean;
    disabled?: boolean;
    hasCurrentLink?: boolean;
    locale?: 'en' | 'ru';
    readOnlyText?: boolean;
    text?: string;
    title?: string;
    url?: string;
}>(), {
    autofocus: false,
    disabled: false,
    hasCurrentLink: false,
    locale: 'ru',
    readOnlyText: false,
    text: '',
    title: '',
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
const copy = computed(() => props.locale === 'en'
    ? {apply: 'Submit', cancel: 'Cancel', remove: 'Remove', text: 'Link text', textHelp: 'Text displayed as a link.', title: 'Title', url: 'Link address', urlError: 'Enter a valid link address.'}
    : {apply: 'Сохранить', cancel: 'Отмена', remove: 'Удалить', text: 'Текст ссылки', textHelp: 'Текст, который отображается как ссылка.', title: 'Заголовок', url: 'Адрес ссылки', urlError: 'Введите корректный адрес ссылки.'});
const urlError = ref('');

function submit(): void {
    const url = props.url.trim();
    if (!isValidUrl(url)) {
        urlError.value = copy.value.urlError;
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
  <MarkdownEditorForm ref="form" :disabled="disabled" @submit="submit">
    <MarkdownEditorTextInput :model-value="url" aria-label="Адрес ссылки" :autofocus="autofocus" :disabled="disabled" :error="urlError" :label="copy.url" placeholder="https://example.com" required type="url" @update:model-value="urlError = ''; emit('update:url', $event)" />
    <MarkdownEditorTextInput :model-value="text" aria-label="Текст ссылки" :disabled="disabled" :help="copy.textHelp" :label="copy.text" :readonly="readOnlyText" @update:model-value="emit('update:text', $event)" />
    <MarkdownEditorTextInput :model-value="title" aria-label="Заголовок ссылки" :disabled="disabled" :label="copy.title" @update:model-value="emit('update:title', $event)" />
    <template #footer>
      <button v-if="hasCurrentLink" :disabled="disabled" type="button" @click="emit('remove')">{{ copy.remove }}</button>
      <button type="button" @click="emit('cancel')">{{ copy.cancel }}</button>
      <button :disabled="disabled || !url.trim()" type="submit">{{ copy.apply }}</button>
    </template>
  </MarkdownEditorForm>
</template>
