<script setup lang="ts">
import { ref } from 'vue';

import type { BasicWysiwygSelectionState } from '../core';
import type { MarkdownEditorMessageKey } from '../i18n';
import type { MarkdownEditorMode, MarkdownEditorTheme } from '../public-types';
import { textColorCssVariables, textColorMessageKeys, textColorNames } from '../extensions/markdown/color';
import type { TextColorName } from '../extensions/markdown/color';
import ToolbarIcon from './MarkdownEditorToolbarIcon.vue';

defineProps<{
	codeVisible: boolean;
	colorVisible: boolean;
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
	'select-color': [color: TextColorName];
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
const color = ref<HTMLElement>();
const formula = ref<HTMLElement>();
const heading = ref<HTMLElement>();
const list = ref<HTMLElement>();
const modeMenu = ref<HTMLElement>();
const editorModes: MarkdownEditorMode[] = ['wysiwyg', 'markup', 'split'];

defineExpose({
	getElement(name: 'code' | 'color' | 'formula' | 'heading' | 'list' | 'mode'): HTMLElement | undefined {
		return {
			code: code.value,
			color: color.value,
			formula: formula.value,
			heading: heading.value,
			list: list.value,
			mode: modeMenu.value,
		}[name];
	},
});
</script>

<template>
	<div
		v-if="colorVisible"
		ref="color"
		class="markdown-editor__floating-menu"
		:data-theme="theme"
		role="menu"
		:aria-label="translate('color')"
	>
		<button
			v-for="colorName in textColorNames"
			:key="colorName"
			role="menuitemradio"
			type="button"
			@mousedown.prevent
			@click="emit('select-color', colorName)"
		>
			<span
				class="markdown-editor__floating-menu-icon"
				:style="{ color: `var(${textColorCssVariables[colorName]})` }"
			>A</span>
			<span>{{ translate(textColorMessageKeys[colorName]) }}</span>
		</button>
	</div>
	<div
		v-if="codeVisible"
		ref="code"
		class="markdown-editor__floating-menu"
		:data-theme="theme"
		role="menu"
		:aria-label="translate('code')"
	>
		<button
			:aria-checked="state.code"
			role="menuitemradio"
			type="button"
			@mousedown.prevent
			@click="emit('inline-code')"
		>
			<ToolbarIcon name="code" />
			<span>{{ translate('code') }}</span>
		</button>
		<button
			:aria-checked="state.codeBlock"
			role="menuitemradio"
			type="button"
			@mousedown.prevent
			@click="emit('code-block')"
		>
			<span class="markdown-editor__floating-menu-icon">{ }</span>
			<span>{{ translate('codeBlock') }}</span>
		</button>
	</div>
	<div
		v-if="headingVisible"
		ref="heading"
		class="markdown-editor__floating-menu"
		:data-theme="theme"
		role="menu"
		:aria-label="translate('heading')"
	>
		<button
			v-for="style in ['paragraph', '1', '2', '3', '4', '5', '6']"
			:key="style"
			:aria-checked="textStyle === style"
			role="menuitemradio"
			type="button"
			@click="emit('select-text-style', style)"
		>
			<span class="markdown-editor__floating-menu-icon">{{ style === 'paragraph' ? 'T' : `H${style}` }}</span>
			<span>{{ style === 'paragraph' ? translate('paragraph') : `${translate('heading')} ${style}` }}</span>
		</button>
	</div>
	<div
		v-if="formulaVisible"
		ref="formula"
		class="markdown-editor__floating-menu"
		:data-theme="theme"
		role="menu"
		:aria-label="translate('formulaInsert')"
	>
		<button
			role="menuitem"
			type="button"
			@mousedown.prevent
			@click="emit('inline-formula')"
		>
			<span class="markdown-editor__floating-menu-icon">ƒ</span>
			<span>{{ translate('formulaInline') }}</span>
		</button>
		<button
			role="menuitem"
			type="button"
			@mousedown.prevent
			@click="emit('math-block')"
		>
			<span class="markdown-editor__floating-menu-icon">∑</span>
			<span>{{ translate('formulaBlock') }}</span>
		</button>
	</div>
	<div
		v-if="listVisible"
		ref="list"
		class="markdown-editor__floating-menu markdown-editor__floating-menu--list"
		:data-theme="theme"
		role="menu"
		:aria-label="translate('bulletList')"
	>
		<button
			:aria-checked="state.bulletList"
			role="menuitemradio"
			type="button"
			@mousedown.prevent
			@click="emit('bullet-list')"
		>
			<ToolbarIcon name="bulletList" />
			<span>{{ translate('bulletList') }}</span>
		</button>
		<button
			:aria-checked="state.orderedList"
			role="menuitemradio"
			type="button"
			@mousedown.prevent
			@click="emit('ordered-list')"
		>
			<ToolbarIcon name="orderedList" />
			<span>{{ translate('orderedList') }}</span>
		</button>
		<button
			:disabled="!state.listIndentEnabled"
			role="menuitem"
			type="button"
			@mousedown.prevent
			@click="emit('indent-list')"
		>
			<span class="markdown-editor__floating-menu-icon">→</span>
			<span>{{ translate('listIndent') }}</span>
			<kbd>Tab</kbd>
		</button>
		<button
			:disabled="!state.listOutdentEnabled"
			role="menuitem"
			type="button"
			@mousedown.prevent
			@click="emit('outdent-list')"
		>
			<span class="markdown-editor__floating-menu-icon">←</span>
			<span>{{ translate('listOutdent') }}</span>
			<kbd>⇧ Tab</kbd>
		</button>
	</div>
	<div
		v-if="modeVisible"
		ref="modeMenu"
		class="markdown-editor__floating-menu"
		:data-theme="theme"
		role="menu"
		:aria-label="translate('mode')"
	>
		<button
			v-for="editorMode in editorModes"
			:key="editorMode"
			:aria-checked="mode === editorMode"
			role="menuitemradio"
			type="button"
			@click="emit('select-mode', editorMode)"
		>
			<span>{{ translate(editorMode === 'wysiwyg' ? 'visual' : editorMode) }}</span>
		</button>
	</div>
</template>

<style scoped>
.markdown-editor__floating-menu {
	--markdown-background: #fff;
	--markdown-border: #d8dbe0;
	--markdown-focus-background: #526da8;
	--markdown-focus-text: #fff;
	--markdown-text: #202125;
	z-index: 10;
	display: grid;
	gap: 0.125rem;
	width: max-content;
	max-width: calc(100vw - 1rem);
	min-width: 14rem;
	padding: 0.1875rem;
	border: 1px solid var(--markdown-border);
	border-radius: 0.5rem;
	box-shadow: 0 0.75rem 1.75rem rgb(0 0 0 / 28%);
	background: var(--markdown-background);
	color: var(--markdown-text);
}

.markdown-editor__floating-menu[data-theme='dark'] {
	--markdown-background: #303236;
	--markdown-border: #45484e;
	--markdown-focus-background: #526da8;
	--markdown-focus-text: #fff;
	--markdown-text: #f1f3f5;
}

@media (prefers-color-scheme: dark) {
	.markdown-editor__floating-menu[data-theme='auto'] {
		--markdown-background: #303236;
		--markdown-border: #45484e;
		--markdown-focus-background: #526da8;
		--markdown-focus-text: #fff;
		--markdown-text: #f1f3f5;
	}
}

.markdown-editor__floating-menu button {
	display: grid;
	grid-template-columns: 1.5rem 1fr;
	gap: 0.375rem;
	align-items: center;
	justify-content: flex-start;
	width: 100%;
	min-height: 2rem;
	padding: 0.25rem 0.5rem;
	border: 0;
	border-radius: 0.375rem;
	white-space: nowrap;
	color: inherit;
	background: transparent;
	cursor: pointer;
	font: inherit;
	text-align: left;
}

.markdown-editor__floating-menu button:hover {
	color: var(--markdown-focus-text);
	background: var(--markdown-focus-background);
}
.markdown-editor__floating-menu button:focus-visible {
	outline: 2px solid var(--markdown-focus-text);
	outline-offset: -2px;
}
.markdown-editor__floating-menu button[aria-checked='true'] {
	color: var(--markdown-focus-text);
	background: var(--markdown-focus-background);
}
.markdown-editor__floating-menu button:disabled {
	cursor: default;
	opacity: 0.42;
}
.markdown-editor__floating-menu button:disabled:hover {
	color: inherit;
	background: transparent;
}
.markdown-editor__floating-menu-icon {
	color: color-mix(in srgb, currentColor 84%, transparent);
	font-size: 0.75rem;
	font-weight: 500;
	text-align: center;
}
.markdown-editor__floating-menu--list button {
	grid-template-columns: 1.5rem minmax(10rem, 1fr) auto;
}
.markdown-editor__floating-menu--list :deep(.markdown-editor__toolbar-icon) {
	justify-self: center;
	width: 1rem;
	height: 1rem;
}

.markdown-editor__floating-menu kbd {
	padding: 0.15rem 0.35rem;
	border: 0;
	border-radius: 999px;
	color: color-mix(in srgb, currentColor 86%, transparent);
	background: color-mix(in srgb, currentColor 14%, transparent);
	font:
		0.7rem/1.2 ui-monospace,
		SFMono-Regular,
		Menlo,
		monospace;
}
</style>
