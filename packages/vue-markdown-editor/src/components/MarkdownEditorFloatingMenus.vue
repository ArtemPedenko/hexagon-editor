<script setup lang="ts">
import {ref} from 'vue';

import type {BasicWysiwygSelectionState} from '../core';
import type {MarkdownEditorMessageKey} from '../i18n';
import type {MarkdownEditorMode, MarkdownEditorTheme} from '../public-types';
import ToolbarIcon from './MarkdownEditorToolbarIcon.vue';

defineProps<{
    codeVisible: boolean;
    formulaVisible: boolean;
    headingVisible: boolean;
    listVisible: boolean;
    mode: MarkdownEditorMode;
    modeVisible: boolean;
    state: BasicWysiwygSelectionState;
    textStyle: string;
    theme: MarkdownEditorTheme;
    translate: (key: MarkdownEditorMessageKey) => string;
}>();

const emit = defineEmits<{
    'code-block': [];
    'inline-code': [];
    'inline-formula': [];
    'math-block': [];
    'select-mode': [mode: MarkdownEditorMode];
    'select-text-style': [style: string];
    'bullet-list': [];
    'ordered-list': [];
    'indent-list': [];
    'outdent-list': [];
}>();

const code = ref<HTMLElement>();
const formula = ref<HTMLElement>();
const heading = ref<HTMLElement>();
const list = ref<HTMLElement>();
const modeMenu = ref<HTMLElement>();
const editorModes: MarkdownEditorMode[] = ['wysiwyg', 'markup', 'split'];

defineExpose({
    getElement(name: 'code' | 'formula' | 'heading' | 'list' | 'mode'): HTMLElement | undefined {
        return {code: code.value, formula: formula.value, heading: heading.value, list: list.value, mode: modeMenu.value}[name];
    },
});
</script>

<template>
  <div v-if="codeVisible" ref="code" class="markdown-editor__floating-menu" :data-theme="theme" role="menu" :aria-label="translate('code')">
    <button :aria-checked="state.code" role="menuitemradio" type="button" @mousedown.prevent @click="emit('inline-code')"><ToolbarIcon name="code" /><span>{{ translate('code') }}</span></button>
    <button :aria-checked="state.codeBlock" role="menuitemradio" type="button" @mousedown.prevent @click="emit('code-block')"><span class="markdown-editor__floating-menu-icon">{ }</span><span>{{ translate('codeBlock') }}</span></button>
  </div>
  <div v-if="headingVisible" ref="heading" class="markdown-editor__floating-menu" :data-theme="theme" role="menu" :aria-label="translate('heading')">
    <button v-for="style in ['paragraph', '1', '2', '3', '4', '5', '6']" :key="style" :aria-checked="textStyle === style" role="menuitemradio" type="button" @click="emit('select-text-style', style)">
      <span class="markdown-editor__floating-menu-icon">{{ style === 'paragraph' ? 'T' : `H${style}` }}</span>
      <span>{{ style === 'paragraph' ? translate('paragraph') : `${translate('heading')} ${style}` }}</span>
    </button>
  </div>
  <div v-if="formulaVisible" ref="formula" class="markdown-editor__floating-menu" :data-theme="theme" role="menu" :aria-label="translate('formulaInsert')">
    <button role="menuitem" type="button" @mousedown.prevent @click="emit('inline-formula')"><span class="markdown-editor__floating-menu-icon">ƒ</span><span>{{ translate('formulaInline') }}</span></button>
    <button role="menuitem" type="button" @mousedown.prevent @click="emit('math-block')"><span class="markdown-editor__floating-menu-icon">∑</span><span>{{ translate('formulaBlock') }}</span></button>
  </div>
  <div v-if="listVisible" ref="list" class="markdown-editor__floating-menu markdown-editor__floating-menu--list" :data-theme="theme" role="menu" :aria-label="translate('bulletList')">
    <button :aria-checked="state.bulletList" role="menuitemradio" type="button" @mousedown.prevent @click="emit('bullet-list')"><ToolbarIcon name="bulletList" /><span>{{ translate('bulletList') }}</span></button>
    <button :aria-checked="state.orderedList" role="menuitemradio" type="button" @mousedown.prevent @click="emit('ordered-list')"><ToolbarIcon name="orderedList" /><span>{{ translate('orderedList') }}</span></button>
    <button :disabled="!state.listIndentEnabled" role="menuitem" type="button" @mousedown.prevent @click="emit('indent-list')"><span class="markdown-editor__floating-menu-icon">→</span><span>{{ translate('listIndent') }}</span><kbd>Tab</kbd></button>
    <button :disabled="!state.listOutdentEnabled" role="menuitem" type="button" @mousedown.prevent @click="emit('outdent-list')"><span class="markdown-editor__floating-menu-icon">←</span><span>{{ translate('listOutdent') }}</span><kbd>⇧ Tab</kbd></button>
  </div>
  <div v-if="modeVisible" ref="modeMenu" class="markdown-editor__floating-menu" :data-theme="theme" role="menu" :aria-label="translate('mode')">
    <button v-for="editorMode in editorModes" :key="editorMode" :aria-checked="mode === editorMode" role="menuitemradio" type="button" @click="emit('select-mode', editorMode)">
      <span>{{ translate(editorMode === 'wysiwyg' ? 'visual' : editorMode) }}</span>
    </button>
  </div>
</template>
