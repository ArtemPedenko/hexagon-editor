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
