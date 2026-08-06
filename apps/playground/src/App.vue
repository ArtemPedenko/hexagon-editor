<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue';

import {
  createBasicEditorCommands,
  mountBasicMarkupEditor,
  mountBasicWysiwygEditor,
  renderMarkdownPreview,
  VERSION,
} from '@gravity-ui/vue-markdown-editor';
import type {BasicMarkupEditor, BasicWysiwygEditor} from '@gravity-ui/vue-markdown-editor';

const editorTarget = ref<HTMLElement>();
const markupTarget = ref<HTMLElement>();
const markdown = ref('# Начните писать\n\nЭто первый интерактивный этап Vue-порта.');
const mode = ref<'markup' | 'visual'>('visual');
const previewHtml = computed(() => renderMarkdownPreview(markdown.value));
const commands = createBasicEditorCommands();
const linkEditorVisible = ref(false);
const linkValue = ref('https://');
let editor: BasicWysiwygEditor | undefined;
let markupEditor: BasicMarkupEditor | undefined;

function mountVisualEditor(): void {
  const target = editorTarget.value;
  if (target === undefined) {
    return;
  }

  editor = mountBasicWysiwygEditor({
    initialValue: markdown.value,
    onChange: (value) => {
      markdown.value = value;
    },
    target,
  });
}

function mountMarkupEditor(): void {
  const target = markupTarget.value;
  if (target === undefined) {
    return;
  }

  markupEditor = mountBasicMarkupEditor({
    initialValue: markdown.value,
    onChange: (value) => {
      markdown.value = value;
    },
    target,
  });
}

onMounted(mountVisualEditor);

watch(mode, async (nextMode) => {
  editor?.destroy();
  markupEditor?.destroy();
  editor = undefined;
  markupEditor = undefined;
  await nextTick();

  if (nextMode === 'visual') {
    mountVisualEditor();
  } else {
    mountMarkupEditor();
  }
});

onBeforeUnmount(() => {
  editor?.destroy();
  markupEditor?.destroy();
});

function execute(command: Parameters<BasicWysiwygEditor['run']>[0]): void {
  editor?.run(command);
}

function applyLink(): void {
  if (linkValue.value.trim().length === 0) {
    return;
  }

  execute(commands.link(linkValue.value.trim()));
  linkEditorVisible.value = false;
}
</script>

<template>
  <main class="playground">
    <header class="playground__header">
      <p class="playground__eyebrow">
        Gravity UI · Vue 3
      </p>
      <h1>Markdown editor</h1>
      <p class="playground__status">
        Visual mode · базовые расширения · {{ VERSION }}
      </p>
    </header>
    <section
      class="playground__workspace"
      aria-label="Редактор Markdown"
    >
      <section class="playground__editor-pane">
        <div class="playground__pane-title">
          <div class="playground__mode-switch" role="tablist" aria-label="Режим редактора">
            <button :aria-selected="mode === 'visual'" role="tab" type="button" @click="mode = 'visual'">Visual editor</button>
            <button :aria-selected="mode === 'markup'" role="tab" type="button" @click="mode = 'markup'">Markup</button>
          </div>
          <span>{{ mode === 'visual' ? '⌘B / Ctrl+B · ⌘I / Ctrl+I' : '⌘F / Ctrl+F · Tab для отступа' }}</span>
        </div>
        <div v-if="mode === 'visual'" class="playground__toolbar" role="toolbar" aria-label="Форматирование Markdown">
          <div class="playground__toolbar-group">
            <button type="button" title="Отменить" aria-label="Отменить" @mousedown.prevent @click="execute(commands.undo)">↶</button>
            <button type="button" title="Повторить" aria-label="Повторить" @mousedown.prevent @click="execute(commands.redo)">↷</button>
          </div>
          <div class="playground__toolbar-group">
            <select aria-label="Уровень заголовка" @change="execute(commands.heading(Number(($event.target as HTMLSelectElement).value)))">
              <option value="1">H1</option>
              <option value="2">H2</option>
              <option value="3">H3</option>
              <option value="4">H4</option>
            </select>
            <button type="button" title="Жирный" aria-label="Жирный" @mousedown.prevent @click="execute(commands.bold)"><strong>B</strong></button>
            <button type="button" title="Курсив" aria-label="Курсив" @mousedown.prevent @click="execute(commands.italic)"><em>I</em></button>
            <button type="button" title="Подчёркивание" aria-label="Подчёркивание" @mousedown.prevent @click="execute(commands.underline)"><u>U</u></button>
            <button type="button" title="Зачёркивание" aria-label="Зачёркивание" @mousedown.prevent @click="execute(commands.strikethrough)"><s>S</s></button>
            <button type="button" title="Выделить" aria-label="Выделить" @mousedown.prevent @click="execute(commands.mark)">▣</button>
            <button type="button" title="Inline code" aria-label="Inline code" @mousedown.prevent @click="execute(commands.code)">&lt;/&gt;</button>
          </div>
          <div class="playground__toolbar-group">
            <button type="button" title="Маркированный список" aria-label="Маркированный список" @mousedown.prevent @click="execute(commands.bulletList)">•≡</button>
            <button type="button" title="Нумерованный список" aria-label="Нумерованный список" @mousedown.prevent @click="execute(commands.orderedList)">1≡</button>
            <button type="button" title="Цитата" aria-label="Цитата" @mousedown.prevent @click="execute(commands.quote)">❝</button>
            <button type="button" title="Code block" aria-label="Code block" @mousedown.prevent @click="execute(commands.codeBlock)">{ }</button>
          </div>
          <div class="playground__toolbar-group">
            <button type="button" title="Ссылка" aria-label="Ссылка" @mousedown.prevent @click="linkEditorVisible = !linkEditorVisible">⌁</button>
            <button type="button" title="Горизонтальная линия" aria-label="Горизонтальная линия" @mousedown.prevent @click="execute(commands.horizontalRule)">―</button>
            <button type="button" title="Таблица 3×3" aria-label="Таблица 3×3" @mousedown.prevent @click="execute(commands.insertTable())">▦</button>
          </div>
          <form v-if="linkEditorVisible" class="playground__link-editor" @submit.prevent="applyLink">
            <input v-model="linkValue" aria-label="Адрес ссылки" type="url" />
            <button type="submit">Готово</button>
          </form>
        </div>
        <div
          v-if="mode === 'visual'"
          ref="editorTarget"
          class="playground__editor"
        />
        <div v-else class="playground__markup-shell">
          <div class="playground__markup-toolbar" role="toolbar" aria-label="Команды markup-режима">
            <button type="button" @click="markupEditor?.undo()">Отменить</button>
            <button type="button" @click="markupEditor?.redo()">Повторить</button>
            <button type="button" @click="markupEditor?.openSearch()">Поиск</button>
            <span>Markdown с подсветкой синтаксиса</span>
          </div>
          <div ref="markupTarget" class="playground__markup" />
        </div>
      </section>
      <aside class="playground__source-pane">
        <div class="playground__pane-title">
          Preview
        </div>
        <div class="playground__preview" v-html="previewHtml" />
      </aside>
    </section>
  </main>
</template>
