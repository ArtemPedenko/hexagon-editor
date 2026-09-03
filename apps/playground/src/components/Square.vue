<script setup lang="ts">
import type { MarkdownDirectiveComponentProps } from 'hexagon-editor';
const props = defineProps<MarkdownDirectiveComponentProps<{ size?: number }>>();
</script>
<template>
  <aside
    :data-directive="props.name"
    :style="{ width: `${props.attrs.size ?? 120}px` }"
  >
    <textarea
      v-if="!props.readonly"
      :value="props.content"
      style="width: 100%"
      @input="props.updateContent(($event.target as HTMLTextAreaElement).value)"
    />
    <button
      v-if="!props.readonly"
      type="button"
      @click="props.updateAttrs({ size: props.attrs.size === 120 ? 200 : 120 })"
    >
      Resize square
    </button>
    <p v-else>{{ props.content }}</p>
  </aside>
</template>
