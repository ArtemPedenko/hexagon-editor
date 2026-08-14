<script setup lang="ts">
import {ref} from 'vue';

import type {MarkdownEditorMode} from '../public-types';

const props = defineProps<{
    mode: MarkdownEditorMode;
    setMode: (mode: MarkdownEditorMode) => Promise<void>;
    translate: (key: 'mode' | 'visual' | 'markup' | 'split') => string;
}>();

const modes: MarkdownEditorMode[] = ['wysiwyg', 'markup', 'split'];
const tablist = ref<HTMLElement>();

async function handleNavigation(event: KeyboardEvent): Promise<void> {
    const currentIndex = modes.indexOf(props.mode);
    const nextIndex = event.key === 'Home'
        ? 0
        : event.key === 'End'
            ? modes.length - 1
            : event.key === 'ArrowRight'
                ? (currentIndex + 1) % modes.length
                : event.key === 'ArrowLeft'
                    ? (currentIndex - 1 + modes.length) % modes.length
                    : -1;
    if (nextIndex < 0) return;

    event.preventDefault();
    const nextMode = modes[nextIndex]!;
    await props.setMode(nextMode);
    tablist.value?.querySelector<HTMLElement>(`[data-editor-mode="${nextMode}"]`)?.focus();
}
</script>

<template>
  <div ref="tablist" class="markdown-editor__modes" role="tablist" :aria-label="translate('mode')" @keydown="handleNavigation">
    <button
      v-for="editorMode in modes"
      :key="editorMode"
      :data-editor-mode="editorMode"
      :aria-selected="mode === editorMode"
      role="tab"
      type="button"
      @click="setMode(editorMode)"
    >
      {{ translate(editorMode === 'wysiwyg' ? 'visual' : editorMode) }}
    </button>
  </div>
</template>
