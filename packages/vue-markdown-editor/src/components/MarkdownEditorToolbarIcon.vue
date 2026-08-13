<script setup lang="ts">
import arrowLeft from '../assets/toolbar-icons/arrow-uturn-ccw-left.svg?raw';
import arrowRight from '../assets/toolbar-icons/arrow-uturn-cw-right.svg?raw';
import bold from '../assets/toolbar-icons/bold.svg?raw';
import bulletList from '../assets/toolbar-icons/list-ul.svg?raw';
import chevronDown from '../assets/toolbar-icons/chevron-down.svg?raw';
import code from '../assets/toolbar-icons/code.svg?raw';
import functionIcon from '../assets/toolbar-icons/function.svg?raw';
import horizontalRule from '../assets/toolbar-icons/minus.svg?raw';
import image from '../assets/toolbar-icons/picture.svg?raw';
import italic from '../assets/toolbar-icons/italic.svg?raw';
import link from '../assets/toolbar-icons/link.svg?raw';
import orderedList from '../assets/toolbar-icons/list-ol.svg?raw';
import quote from '../assets/toolbar-icons/quote-open.svg?raw';
import strike from '../assets/toolbar-icons/strikethrough.svg?raw';
import table from '../assets/toolbar-icons/layout-cells.svg?raw';
import underline from '../assets/toolbar-icons/underline.svg?raw';

const icons = {arrowLeft, arrowRight, bold, bulletList, chevronDown, code, function: functionIcon, horizontalRule, image, italic, link, orderedList, quote, strike, table, underline} as const;

const props = defineProps<{name: keyof typeof icons}>();
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- Static SVG sources are bundled with the editor. -->
  <span class="markdown-editor__toolbar-icon" aria-hidden="true" v-html="icons[props.name]" />
</template>

<style scoped>
.markdown-editor__toolbar-icon { display: inline-flex; width: 1rem; height: 1rem; }
.markdown-editor__toolbar-icon :deep(svg) { display: block; width: 100%; height: 100%; }
</style>
