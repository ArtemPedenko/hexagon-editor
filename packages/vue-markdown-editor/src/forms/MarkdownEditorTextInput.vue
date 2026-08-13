<script setup lang="ts">
import {onMounted, ref} from 'vue';

defineOptions({name: 'MarkdownEditorTextInput'});

const props = withDefaults(defineProps<{
    ariaLabel?: string;
    autofocus?: boolean;
    disabled?: boolean;
    error?: string;
    help?: string;
    label?: string;
    modelValue?: number | string;
    min?: number;
    placeholder?: string;
    readonly?: boolean;
    required?: boolean;
    type?: 'number' | 'text' | 'url';
}>(), {
    ariaLabel: undefined,
    autofocus: false,
    disabled: false,
    error: undefined,
    help: undefined,
    label: undefined,
    modelValue: '',
    min: undefined,
    placeholder: undefined,
    readonly: false,
    required: false,
    type: 'text',
});

const emit = defineEmits<{
    'update:modelValue': [value: string];
}>();

const input = ref<HTMLInputElement>();
const helpId = `markdown-editor-input-${Math.random().toString(36).slice(2)}`;

onMounted(() => {
    if (props.autofocus) input.value?.focus();
});

defineExpose({focus: () => input.value?.focus(), input});
</script>

<template>
  <label class="markdown-editor-form__row">
    <span v-if="label" class="markdown-editor-form__label">{{ label }}</span>
    <input
      ref="input"
      class="markdown-editor-form__input"
      :class="{'markdown-editor-form__input--error': error}"
      :value="modelValue"
      :aria-describedby="help || error ? helpId : undefined"
      :aria-invalid="error ? 'true' : undefined"
      :aria-label="ariaLabel ?? label"
      :disabled="disabled"
      :min="min"
      :placeholder="placeholder"
      :readonly="readonly"
      :required="required"
      :type="type"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
    <span v-if="error || help" :id="helpId" class="markdown-editor-form__help" :class="{'markdown-editor-form__help--error': error}">{{ error ?? help }}</span>
  </label>
</template>
