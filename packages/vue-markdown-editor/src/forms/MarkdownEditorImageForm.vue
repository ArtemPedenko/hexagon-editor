<script setup lang="ts">
import {computed, ref} from 'vue';
import type {MarkdownEditorLocale, MarkdownEditorTheme} from '../public-types';
import {getMarkdownEditorMessages} from '../i18n';

import MarkdownEditorForm from './MarkdownEditorForm.vue';
import MarkdownEditorTextInput from './MarkdownEditorTextInput.vue';

defineOptions({name: 'MarkdownEditorImageForm'});

export interface MarkdownEditorImageSubmitParams {alt: string; height?: number; name: string; title: string; url: string; width?: number}
export type MarkdownEditorImageUpload = (file: File) => Promise<string>;

const props = withDefaults(defineProps<{
    alt?: string;
    autofocus?: boolean;
    disabled?: boolean;
    height?: number | string;
    locale?: MarkdownEditorLocale;
    name?: string;
    title?: string;
    theme?: MarkdownEditorTheme;
    uploadImage?: MarkdownEditorImageUpload;
    url?: string;
    width?: number | string;
}>(), {alt: '', autofocus: false, disabled: false, height: '', locale: 'ru', name: '', theme: 'auto', title: '', uploadImage: undefined, url: '', width: ''});

const emit = defineEmits<{
    apply: [params: MarkdownEditorImageSubmitParams]; cancel: []; invalid: [message: string];
    'update:alt': [value: string]; 'update:height': [value: string]; 'update:name': [value: string];
    'update:title': [value: string]; 'update:url': [value: string]; 'update:width': [value: string];
}>();

const form = ref<InstanceType<typeof MarkdownEditorForm>>();
const urlError = ref('');
const uploadError = ref('');
const uploading = ref(false);
const copy = computed(() => getMarkdownEditorMessages(props.locale));

async function uploadFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file === undefined || props.uploadImage === undefined) return;
    uploadError.value = '';
    uploading.value = true;
    try {
        const url = await props.uploadImage(file);
        if (!isValidUrl(url)) throw new Error('Invalid image URL');
        urlError.value = '';
        emit('update:url', url);
        if (props.alt.trim() === '') emit('update:alt', file.name);
    } catch {
        uploadError.value = copy.value.imageUploadError;
        emit('invalid', uploadError.value);
    } finally {
        uploading.value = false;
    }
}

function submit(): void {
    const url = props.url.trim();
    if (!isValidUrl(url)) { urlError.value = copy.value.imageUrlError; emit('invalid', urlError.value); return; }
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
  <MarkdownEditorForm ref="form" :disabled="disabled" :theme="theme" @submit="submit">
    <label v-if="uploadImage" class="markdown-editor-image-upload" :class="{'markdown-editor-image-upload--disabled': disabled || uploading}">
      <input accept="image/*" :disabled="disabled || uploading" type="file" @change="uploadFile">
      <span>{{ uploading ? copy.imageUploading : copy.imageUpload }}</span>
    </label>
    <p v-if="uploadError" class="markdown-editor-image-upload__error" role="alert">{{ uploadError }}</p>
    <MarkdownEditorTextInput :model-value="url" :aria-label="copy.imageUrlAria" :autofocus="autofocus" :disabled="disabled" :error="urlError" :label="copy.imageUrl" placeholder="https://example.com/image.jpg" required type="url" @update:model-value="urlError = ''; emit('update:url', $event)" />
    <MarkdownEditorTextInput :model-value="name" :disabled="disabled" :label="copy.imageName" @update:model-value="emit('update:name', $event)" />
    <MarkdownEditorTextInput :model-value="alt" :aria-label="copy.imageAltAria" :disabled="disabled" :help="copy.imageAltHelp" :label="copy.imageAlt" @update:model-value="emit('update:alt', $event)" />
    <MarkdownEditorTextInput :model-value="title" :aria-label="copy.imageTitle" :disabled="disabled" :label="copy.imageTitle" @update:model-value="emit('update:title', $event)" />
    <div class="markdown-editor-form__sizes" :aria-label="copy.imageSizes">
      <MarkdownEditorTextInput :model-value="width" :aria-label="copy.imageWidth" :disabled="disabled" :min="0" :placeholder="copy.imageWidth" type="number" @update:model-value="emit('update:width', $event)" />
      <span aria-hidden="true">×</span>
      <MarkdownEditorTextInput :model-value="height" :aria-label="copy.imageHeight" :disabled="disabled" :min="0" :placeholder="copy.imageHeight" type="number" @update:model-value="emit('update:height', $event)" />
    </div>
    <template #footer>
      <button type="button" @click="emit('cancel')">{{ copy.cancel }}</button>
      <button :disabled="disabled || uploading || !url.trim()" type="submit">{{ copy.apply }}</button>
    </template>
  </MarkdownEditorForm>
</template>

<style scoped>
.markdown-editor-form__sizes { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: .35rem; }
.markdown-editor-image-upload { display: flex; align-items: center; justify-content: center; min-height: 2.25rem; padding: 0 .75rem; border: 1px dashed var(--markdown-border); border-radius: .375rem; cursor: pointer; }
.markdown-editor-image-upload:hover, .markdown-editor-image-upload:focus-within { border-color: var(--markdown-focus-text); }
.markdown-editor-image-upload--disabled { cursor: default; opacity: .55; }
.markdown-editor-image-upload input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.markdown-editor-image-upload__error { margin: -.35rem 0 0; color: #d7504b; font-size: .75rem; }
</style>
