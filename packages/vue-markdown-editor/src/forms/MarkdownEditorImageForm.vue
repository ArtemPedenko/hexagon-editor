<script setup lang="ts">
import {computed, ref} from 'vue';

import MarkdownEditorForm from './MarkdownEditorForm.vue';
import MarkdownEditorTextInput from './MarkdownEditorTextInput.vue';

defineOptions({name: 'MarkdownEditorImageForm'});

export interface MarkdownEditorImageSubmitParams {alt: string; height?: number; name: string; title: string; url: string; width?: number}

const props = withDefaults(defineProps<{
    alt?: string;
    autofocus?: boolean;
    disabled?: boolean;
    height?: number | string;
    locale?: 'en' | 'ru';
    name?: string;
    title?: string;
    url?: string;
    width?: number | string;
}>(), {alt: '', autofocus: false, disabled: false, height: '', locale: 'ru', name: '', title: '', url: '', width: ''});

const emit = defineEmits<{
    apply: [params: MarkdownEditorImageSubmitParams]; cancel: []; invalid: [message: string];
    'update:alt': [value: string]; 'update:height': [value: string]; 'update:name': [value: string];
    'update:title': [value: string]; 'update:url': [value: string]; 'update:width': [value: string];
}>();

const form = ref<InstanceType<typeof MarkdownEditorForm>>();
const urlError = ref('');
const copy = computed(() => props.locale === 'en'
    ? {alt: 'Alt text', altHelp: 'Displayed if the image cannot be loaded.', apply: 'Submit', cancel: 'Cancel', height: 'Height', name: 'Image name', sizes: 'Size, px', title: 'Title', url: 'Image link', urlError: 'Enter a valid image address.', width: 'Width'}
    : {alt: 'Альтернативный текст', altHelp: 'Отображается, если изображение не загрузилось.', apply: 'Сохранить', cancel: 'Отмена', height: 'Высота', name: 'Подпись к рисунку', sizes: 'Размер в пикселях', title: 'Заголовок', url: 'Ссылка картинки', urlError: 'Введите корректный адрес изображения.', width: 'Ширина'});

function submit(): void {
    const url = props.url.trim();
    if (!isValidUrl(url)) { urlError.value = copy.value.urlError; emit('invalid', urlError.value); return; }
    urlError.value = '';
    const params: MarkdownEditorImageSubmitParams = {alt: props.alt.trim(), name: props.name.trim(), title: props.title.trim(), url};
    const width = optionalDimension(props.width); const height = optionalDimension(props.height);
    if (width !== undefined) params.width = width;
    if (height !== undefined) params.height = height;
    emit('apply', params);
}

function isValidUrl(value: string): boolean {
    if (value.startsWith('data:image/')) return true;
    try { return value.length > 0 && new URL(value).protocol.match(/^https?:$/) !== null; } catch { return false; }
}
function optionalDimension(value: number | string): number | undefined { const parsed = Number(value); return value === '' || !Number.isFinite(parsed) || parsed < 0 ? undefined : parsed; }

defineExpose({element: computed(() => form.value?.element)});
</script>

<template>
  <MarkdownEditorForm ref="form" :disabled="disabled" @submit="submit">
    <MarkdownEditorTextInput :model-value="url" aria-label="Адрес изображения" :autofocus="autofocus" :disabled="disabled" :error="urlError" :label="copy.url" placeholder="https://example.com/image.jpg" required type="url" @update:model-value="urlError = ''; emit('update:url', $event)" />
    <MarkdownEditorTextInput :model-value="name" :disabled="disabled" :label="copy.name" @update:model-value="emit('update:name', $event)" />
    <MarkdownEditorTextInput :model-value="alt" aria-label="Описание изображения" :disabled="disabled" :help="copy.altHelp" :label="copy.alt" @update:model-value="emit('update:alt', $event)" />
    <MarkdownEditorTextInput :model-value="title" aria-label="Заголовок изображения" :disabled="disabled" :label="copy.title" @update:model-value="emit('update:title', $event)" />
    <div class="markdown-editor-form__sizes" :aria-label="copy.sizes">
      <MarkdownEditorTextInput :model-value="width" :aria-label="copy.width" :disabled="disabled" :min="0" :placeholder="copy.width" type="number" @update:model-value="emit('update:width', $event)" />
      <span aria-hidden="true">×</span>
      <MarkdownEditorTextInput :model-value="height" :aria-label="copy.height" :disabled="disabled" :min="0" :placeholder="copy.height" type="number" @update:model-value="emit('update:height', $event)" />
    </div>
    <template #footer>
      <button type="button" @click="emit('cancel')">{{ copy.cancel }}</button>
      <button :disabled="disabled || !url.trim()" type="submit">{{ copy.apply }}</button>
    </template>
  </MarkdownEditorForm>
</template>

<style scoped>.markdown-editor-form__sizes { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: .35rem; }</style>
