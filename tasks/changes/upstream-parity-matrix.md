# Parity-матрица `gravity-ui/markdown-editor` → Vue

## Эталон и правила учёта

- **Upstream:** `gravity-ui/markdown-editor` commit `fcb1c73561e9d0ee04a8f2a73308c4fadd1cff14` (15.45.0, MIT).
- **Статусы:** `done` — используется в runtime Vue-пакета; `partial` — есть часть API/поведения, но не весь upstream-контракт; `pending` — ещё не переносился; `excluded` — только согласованное исключение.
- **Допустимые исключения:** `extensions/additional/GPT`, связанные с ним icons/i18n/tests, и продуктовая интеграция Yandex Forms. Общие редакторские формы файла, изображения и ссылки не исключены.
- Для React-bound исходников Vue-эквивалентом должен стать компонент/composable/node-view; перенос core-семантики и Markdown-формата обязателен до UI-слоя.

## Public API, bundle и presets

| Upstream source | Vue target | Status | Примечание |
| --- | --- | --- | --- |
| `src/index.ts`, `src/configure.ts`, `src/classname.ts`, `src/logger.ts` | `src/index.ts`, `src/core/logger.ts` | partial | Базовый Vue entry и logger есть; exports/configure/classname неполные. |
| `src/bundle/*`, `src/Editor.ts` | `src/MarkdownEditor.vue`, `src/use-markdown-editor.ts`, `src/core/editor-instance.ts` | partial | Есть Vue host для трёх режимов, но это не API-parity upstream `Editor`/bundle. |
| `src/presets/{zero,commonmark,default,full,yfm}{,-specs}.ts` | `src/presets/*` | pending | Нужны именованные Vue presets и совместимые specs. |
| `src/modules/toolbars/*`, `src/toolbar/*`, `src/plugins/*` | Vue toolbar/components | pending | Текущий toolbar не является переносом upstream presets/items. |
| `src/i18n/*`, `src/icons/*`, `src/view/*`, styles | `src/i18n/*`, Vue assets/styles | pending | Текущие локальные строки и CSS не заменяют upstream i18n/assets. |

## Core, common, ProseMirror и Markdown

| Upstream source | Vue target | Status | Примечание |
| --- | --- | --- | --- |
| `core/ExtensionBuilder.ts` | `core/extension-builder.ts` | partial | Есть builder, priority, granular registrations и overrides; нужны полный pipeline/context/node-view contract. |
| `core/ExtensionsManager.ts` | `core/extensions-manager.ts` | partial | Собирает schema/parser/serializer/plugins/actions для текущей base schema; нужны dynamic modifiers, node/mark views и upstream registries. |
| `core/ContentHandler.ts` | `core/content-handler.ts` | done | Подключён к `mountBasicWysiwygEditor.setValue`. |
| `core/ActionsManager.tsx`, `core/types/actions.ts`, `core/utils/actions.ts` | `core/actions.ts` | partial | Есть framework-neutral storage; нет полного action contract/binding. |
| `core/{SchemaSpecRegistry,ParserTokensRegistry,SerializerTokensRegistry}.ts` | `core/registries.ts` | partial | Есть простые registries; требуется upstream create/validation contract. |
| `core/SchemaDynamicModifier.ts`, `core/types/dynamicModifiers.ts` | `core/*` | pending | |
| `core/markdown/{MarkdownParser,MarkdownSerializer,MarkdownSerializerDynamicModifier}.ts` | `core/markdown.ts` | partial | Используется `prosemirror-markdown`; custom upstream parser/serializer/dynamic modifiers ещё не перенесены. |
| `core/Editor.ts`, `core/types/{parser,serializer,keymap,node-views,extension}.ts` | `core/*`, `public-types.ts` | pending | |
| `core/utils/{parser,logger,metrics,dynamicModifiers}.ts` | `core/*` | pending | |
| `common/*`, `commands/join.ts`, `pm/*`, `cm/*` | `src/common`, `src/commands`, `src/pm`, `src/cm` | pending | Перенос без смены ProseMirror/CodeMirror семантики. |
| `markup/{editor,commands,codemirror}/*` | `core/markup-editor.ts`, `src/markup/*` | partial | Есть базовый CodeMirror host; отсутствуют upstream commands/facets/language extensions. |

## Markdown extensions

| Upstream source | Vue target | Status | Примечание |
| --- | --- | --- | --- |
| `extensions/markdown/Lists/*` | `core/lists.ts`, `core/basic-editor.ts` | partial | Runtime: schema attrs, parser/serializer, input rules, commands, merge/collapse plugins, keymaps; нужно выделить самостоятельное upstream extension/preset API и перенести полный набор upstream tests. |
| `Blockquote`, `Bold`, `Breaks`, `Code`, `CodeBlock`, `Heading`, `HorizontalRule`, `Italic`, `Link` | `src/extensions/markdown/*` | pending | Функции частично присутствуют в `basic-editor`, но extension API не перенесён. |
| `Deflist`, `Html`, `Image`, `Mark`, `Strike`, `Subscript`, `Superscript`, `Table`, `Underline` | `src/extensions/markdown/*` | pending | То же: runtime-фрагменты не считаются ported extension. |
| `additional/FoldingHeading`, `Math`, `Mermaid`, `QuoteLink`, `YfmHtmlBlock` | `src/extensions/additional/*` | pending | В `basic-editor` есть часть рендера/Markdown, но отсутствуют upstream extensions/actions/views. |
| `additional/GPT/*`, `icons/GPT*.tsx`, GPT i18n/tests | — | excluded | Явное исключение. |

## Behavior extensions

| Upstream source | Vue target | Status |
| --- | --- | --- |
| `Autocomplete`, `ClicksOnEdges`, `Clipboard`, `CommandMenu`, `Cursor`, `EditorModeKeymap` | `src/extensions/behavior/*` | pending |
| `FilePaste`, `History`, `Placeholder`, `Resizable`, `Search`, `Selection`, `SelectionContext`, `SharedState` | `src/extensions/behavior/*` | pending |
| `ReactRenderer`, `WidgetDecoration` | `core/vue-renderer.ts`, `src/extensions/behavior/*` | partial |
| `behavior/utils/*` | `src/extensions/behavior/utils/*` | pending |

## YFM extensions

| Upstream source | Vue target | Status |
| --- | --- | --- |
| `Checkbox`, `Color`, `Emoji`, `ImgSize`, `Monospace`, `Video`, `YfmConfigs` | `src/extensions/yfm/*` | pending |
| `YfmCut`, `YfmFile`, `YfmHeading`, `YfmNote`, `YfmTable`, `YfmTabs` | `src/extensions/yfm/*` | pending |

## Forms, renderer и integration layer

| Upstream source | Vue target | Status | Примечание |
| --- | --- | --- | --- |
| `forms/{Link,Image,FileForm,TextInput,base,components,utils}.tsx` | `src/forms/*` | pending | Перенести как Vue components; не путать с исключённой интеграцией Yandex Forms. |
| `react-utils/*`, `markup/codemirror/react-facet.ts` | `core/vue-renderer.ts`, Vue composables | partial | Есть mount-адаптер для node/widget/context panel; нет полного parity. |
| `bundle/*View.tsx`, `bundle/MarkupManager.ts`, `bundle/useMarkdownEditor.ts` | Vue components/composables | pending | |

## Test and playground parity

| Upstream source | Vue target | Status |
| --- | --- | --- |
| `core/*.test.ts`, extension tests, `markup/*.test.ts`, `bundle/Editor.test.ts` | Vitest tests in package | partial |
| Browser scenarios for Markdown, actions, modes, uploads, clipboard, search, node views and accessibility | `e2e/playground.spec.ts` | partial |
| Desktop and narrow manual visual check | playground | pending |

## Следующий реализуемый срез

1. Завершить core registries и upstream `MarkdownParser`/`MarkdownSerializer` contracts.
2. На этой базе перенести `presets/zero` и `extensions/base/BaseSchema`, затем выделить `Lists` из `basic-editor` в самостоятельное extension/preset.
3. Для каждого последующего расширения сначала перенести non-React код и tests, затем Vue node/widget/form view и Chromium scenario.
