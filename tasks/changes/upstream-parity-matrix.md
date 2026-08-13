# Parity-матрица `gravity-ui/markdown-editor` → Vue

## Эталон и правила учёта

- **Upstream:** `gravity-ui/markdown-editor` commit `fcb1c73561e9d0ee04a8f2a73308c4fadd1cff14` (15.45.0, MIT).
- **Статусы:** `done` — используется в runtime Vue-пакета; `partial` — есть часть API/поведения, но не весь upstream-контракт; `pending` — ещё не переносился; `excluded` — только согласованное исключение.
- **Допустимые исключения:** `extensions/additional/GPT`, связанные с ним icons/i18n/tests, `extensions/markdown/Superscript`, продуктовая интеграция Yandex Forms, а также YFM `Checkbox`, `Color`, `Emoji`, `ImgSize`, `Monospace`, `Video` и `YfmConfigs`; для `CodeBlock` — IDE-paste и полноценный Vue node-view. Общие редакторские формы файла, изображения и ссылки не исключены.
- Для React-bound исходников Vue-эквивалентом должен стать компонент/composable/node-view; перенос core-семантики и Markdown-формата обязателен до UI-слоя.

## Public API, bundle и presets

| Upstream source | Vue target | Status | Примечание |
| --- | --- | --- | --- |
| `src/index.ts`, `src/configure.ts`, `src/classname.ts`, `src/logger.ts` | `src/index.ts`, `src/core/logger.ts` | partial | Базовый Vue entry и logger есть; exports/configure/classname неполные. |
| `src/bundle/*`, `src/Editor.ts` | `src/MarkdownEditor.vue`, `src/use-markdown-editor.ts`, `src/core/editor-instance.ts` | partial | Есть Vue host для трёх режимов, но это не API-parity upstream `Editor`/bundle. |
| `src/presets/{zero,commonmark,default,full,yfm}{,-specs}.ts` | `src/presets/{zero,default}.ts` | partial | `ZeroPreset` и начальный `DefaultPreset` (Zero + Lists) перенесены; list/base plugins DefaultPreset подключены к visual editor без смены schema identity. commonmark/full/yfm и specs pending. |
| `src/modules/toolbars/*`, `src/toolbar/*`, `src/plugins/*` | Vue toolbar/components | pending | Текущий toolbar не является переносом upstream presets/items. |
| `src/i18n/*`, `src/icons/*`, `src/view/*`, styles | `src/i18n/*`, Vue assets/styles | pending | Текущие локальные строки и CSS не заменяют upstream i18n/assets. |

## Core, common, ProseMirror и Markdown

| Upstream source | Vue target | Status | Примечание |
| --- | --- | --- | --- |
| `core/ExtensionBuilder.ts` | `core/extension-builder.ts` | partial | Есть builder, priority, granular registrations и overrides; нужны полный pipeline/context/node-view contract. |
| `core/ExtensionsManager.ts` | `core/extensions-manager.ts` | partial | Собирает schema/parser/serializer/plugins/actions для текущей base schema; нужны dynamic modifiers, node/mark views и upstream registries. |
| `core/ContentHandler.ts` | `core/content-handler.ts` | done | Подключён к `mountBasicWysiwygEditor.setValue`. |
| `core/ActionsManager.tsx`, `core/types/actions.ts`, `core/utils/actions.ts` | `core/actions.ts` | partial | Есть framework-neutral storage; нет полного action contract/binding. |
| `core/{SchemaSpecRegistry,ParserTokensRegistry,SerializerTokensRegistry}.ts` | `core/registries.ts` | partial | Runtime parser/serializer registries подключены к `ExtensionsManager`; требуются custom parser и полный upstream validation/dynamic-modifier contract. |
| `core/SchemaDynamicModifier.ts`, `core/types/dynamicModifiers.ts` | `core/schema-dynamic-modifier.ts` | partial | `SchemaDynamicModifier` подключён к `ExtensionsManager`; агрегатор всех parser/schema/serializer modifiers ещё pending. |
| `core/markdown/{MarkdownParser,MarkdownSerializer,MarkdownSerializerDynamicModifier}.ts` | `core/markdown.ts`, `core/markdown-parser.ts` | partial | Custom stack-based parser и parser dynamic modifier перенесены и экспортированы; production codec пока использует `prosemirror-markdown` до переноса полного набора token specs, serializer и serializer modifier. |
| `core/Editor.ts`, `core/types/{parser,serializer,keymap,node-views,extension}.ts` | `core/*`, `public-types.ts` | pending | |
| `core/utils/{parser,logger,metrics,dynamicModifiers}.ts` | `core/*` | pending | |
| `common/*`, `commands/join.ts`, `pm/*`, `cm/*` | `src/common`, `src/commands`, `src/pm`, `src/cm` | pending | Перенос без смены ProseMirror/CodeMirror семантики. |
| `markup/{editor,commands,codemirror}/*` | `core/markup-editor.ts`, `src/markup/*` | partial | Есть базовый CodeMirror host; отсутствуют upstream commands/facets/language extensions. |

## Markdown extensions

| Upstream source | Vue target | Status | Примечание |
| --- | --- | --- | --- |
| `extensions/markdown/Lists/*` | `core/lists.ts`, `extensions/markdown/{list-specs,lists}.ts`, `core/basic-editor.ts` | partial | Runtime list behavior, schema/parser/serializer specs, action factories и самостоятельная builder extension готовы; остаются подключение через preset и полный набор upstream tests. |
| `Blockquote` | `extensions/markdown/{blockquote,blockquote-specs}.ts`, `core/basic-editor.ts` | partial | Schema/parser/serializer specs, input rule, shortcut, toggle/lift commands и DefaultPreset подключены к runtime; `joinPrevQuote` ожидает общий upstream `commands/join`. |
| `Bold` | `extensions/markdown/{bold,bold-specs}.ts`, `core/basic-editor.ts` | done | Mark/schema/parser/serializer specs, `**`/`__` input rules, shortcut и toggle command подключены к DefaultPreset/visual editor. |
| `Italic` | `extensions/markdown/{italic,italic-specs}.ts`, `core/basic-editor.ts` | done | Mark/schema/parser/serializer specs, `*`/`_` input rules, shortcut и toggle command подключены к DefaultPreset/visual editor. |
| `Code` | `extensions/markdown/{code,code-specs}.ts`, `core/basic-editor.ts` | done | Mark/schema/parser/serializer specs, codemark input/cursor behavior, shortcut option и toggle command подключены к DefaultPreset/visual editor. |
| `CodeBlock` | `extensions/markdown/{code-block,code-block-specs}.ts`, `core/basic-editor.ts`, `MarkdownEditor.vue` | done | Schema/parser/serializer specs, безопасный fence, Tab, shortcut, выбор языка, line-number decorations и лёгкая подсветка JS/TS/JSON/HTML/CSS подключены к DefaultPreset/visual editor. IDE-paste и полноценный Vue node-view исключены из объёма работ. |
| `Heading` | `extensions/markdown/{heading,heading-specs}.ts`, `core/basic-editor.ts` | done | Schema/parser/serializer specs, input rule, shortcut options и toggle/reset commands подключены к DefaultPreset/visual editor; добавочные attrs existing codec сохранены до переноса FoldingHeading. |
| `HorizontalRule` | `extensions/markdown/{horizontal-rule,horizontal-rule-specs}.ts`, `core/basic-editor.ts` | done | Schema/parser/serializer specs, markup-preserving input rule и вставка rule с последующим paragraph подключены к DefaultPreset/visual editor. |
| `Link` | `extensions/markdown/{link,link-specs}.ts`, `core/basic-editor.ts`, `MarkdownEditor.vue` | done | Mark/schema/parser/serializer specs, input rule, URL-paste, create/edit/remove commands, Vue-форма URL/text/title с placeholder и tooltip адреса ссылки подключены к DefaultPreset/visual editor. |
| `Breaks` | `extensions/markdown/{breaks,breaks-specs}.ts`, `core/basic-editor.ts` | done | hard/soft break schema/parser/serializer, preferred-break option и Shift+Enter command подключены к DefaultPreset/visual editor. |
| `Deflist` | `extensions/markdown/{deflist,deflist-specs}.ts`, `core/basic-editor.ts` | partial | Schema/parser/serializer specs with upstream `dl`/`dt`/`dd` nodes and wrap command подключены к DefaultPreset/visual editor; specialized `splitDeflist` ожидает common parent-node utilities. |
| `Html` | `extensions/markdown/html.ts`, `core/basic-editor.ts` | partial | upstream html_block/html_inline schema/parser/serializer подключены к DefaultPreset/visual codec; block renderer пока сохраняет текущий raw HTML без upstream sanitizer. |
| `Image` | `extensions/markdown/image.ts`, `core/basic-editor.ts`, `MarkdownEditor.vue` | partial | Schema/parser/serializer, вставка с full-width default, URL-paste для URL изображений, resize/object-fit и Vue-форма URL/alt/title подключены к DefaultPreset/visual editor; полный upstream action/form contract pending. |
| `Mark` | `extensions/markdown/mark.ts`, `core/basic-editor.ts` | done | mark schema/parser/serializer, `==` input rule и toggle command подключены к DefaultPreset/visual editor. |
| `Strike` | `extensions/markdown/strike.ts`, `core/basic-editor.ts`, `MarkdownEditor.vue` | done | Upstream `strike` mark, `~~` parser/serializer/input rule and toggle command подключены к DefaultPreset/visual codec и используются тулбаром. |
| `Subscript` | `extensions/markdown/subscript.ts` | done | Самостоятельный extension: markdown-it, schema, parser/serializer, input rule, toggle-команда и unit-тест; включён в `DefaultPreset`. |
| `Superscript` | — | excluded | Явно исключён из объёма работ. |
| `Table` | `extensions/markdown/{table,table-specs,table-actions}.ts`, `core/basic-editor.ts` | partial | Самостоятельный extension: upstream-style schema, Markdown parser/serializer, создание/удаление таблицы, добавление/удаление строк и колонок, Tab/Shift+Tab и Enter navigation, column alignment, piped Markdown paste и unit-тест; включён в `DefaultPreset` и visual host. Контекстное меню visual host использует новые команды. Full upstream plugin/action parity pending. |
| `Underline` | `extensions/markdown/underline.ts` | done | Самостоятельный extension: markdown-it, schema, parser/serializer, input rule, toggle-команда и unit-тест; включён в `DefaultPreset`. |
| `additional/FoldingHeading` | `extensions/additional/folding-heading.ts`, `core/basic-editor.ts` | done | Folding plugin, structural visible/hidden section decorations, action contract, toggle-команда, input rule с trailing paragraph и click affordance вынесены в самостоятельный extension и подключены к DefaultPreset; Markdown codec и toolbar сохраняют текущую семантику. |
| `additional/Math` | `extensions/additional/math.ts`, `core/basic-editor.ts` | done | Самостоятельный extension: локальный Markdown-it tokenizer без Diplodoc, schema/parser/serializer, input rules, VS Code LaTeX paste, keymap и action contract для inline/block-формул; KaTeX renderer, локальный source editor, подсказка редактирования и отображение ошибки формулы подключены в Vue visual host. |
| `additional/Mermaid` | `extensions/additional/mermaid.ts`, `core/basic-editor.ts` | done | Самостоятельный extension: Mermaid fence tokenizer, schema/parser/serializer, action для вставки диаграммы и unit-тест подключены к DefaultPreset. Vue visual host переиспользует атомарный source editor и optional host renderer без bundling Mermaid runtime. |
| `additional/QuoteLink` | `extensions/additional/quote-link.ts`, `core/basic-editor.ts` | done | Самостоятельный extension: QuoteLink tokenizer, schema/parser/serializer, toggle action и input rule подключены к DefaultPreset. Visual host сохраняет текущий blockquote DOM и Markdown round-trip. Placeholder form и runtime-стили upstream пока не требуются локальному Vue host. |
| `additional/YfmHtmlBlock` | `extensions/additional/yfm-html-block.ts`, `core/basic-editor.ts` | done | Самостоятельный extension: tokenizer `:::html`, schema/parser/serializer и action вставки подключены к DefaultPreset. Vue visual host использует atomic source editor и host-provided HTML renderer вместо Diplodoc runtime. |
| `additional/GPT/*`, `icons/GPT*.tsx`, GPT i18n/tests | — | excluded | Явное исключение. |

## Behavior extensions

| Upstream source | Vue target | Status |
| --- | --- | --- |
| `Autocomplete`, `ClicksOnEdges`, `CommandMenu`, `EditorModeKeymap` | `src/extensions/behavior/*` | pending |
| `Clipboard` | `src/extensions/behavior/clipboard.ts` | partial — code-block/inline-code paste, including file names, is connected to `DefaultPreset`; full copy/cut, YFM MIME and parser-aware paste remain pending. |
| `Cursor` | `src/extensions/behavior/cursor.ts` | done — upstream `GapCursorSelection`, virtual paragraph widget/input materialization and configurable ProseMirror drop cursor подключены к `DefaultPreset`; создание и навигация gap selection обеспечены командами `Selection`. |
| `FilePaste`, `History`, `Placeholder`, `Resizable`, `Selection`, `SelectionContext`, `SharedState` | `src/extensions/behavior/*` | partial — `History`, document-level `Placeholder`, callback-based `FilePaste`, `Selection` decorations, hierarchical select-all, fake-paragraph/gap-cursor commands/keymap и Vue `SelectionContext` перенесены и подключены к DefaultPreset/visual editor. Resizable supports selected image drag handles and Markdown dimension round-trip; generic node-view resizing, schema-driven placeholder decorations, `SharedState` и остальное pending. Search is deliberately excluded. |
| `ReactRenderer`, `WidgetDecoration` | `core/vue-renderer.ts`, `src/extensions/behavior/*` | partial |
| `behavior/utils/*` | `src/extensions/behavior/utils/*` | pending |

## YFM extensions

| Upstream source | Vue target | Status |
| --- | --- | --- |
| `Checkbox`, `Color`, `Emoji`, `ImgSize`, `Monospace`, `Video`, `YfmConfigs` | — | excluded — согласованное исключение из объёма работ. |
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
| Browser scenarios for Markdown, actions, modes, uploads, clipboard, node views and accessibility | `e2e/playground.spec.ts` | partial |
| Desktop and narrow manual visual check | playground | pending |

## Следующий реализуемый срез

1. **ClicksOnEdges + EditorModeKeymap:** перенести плагины и клавиатурные переходы, проверить границы документа и смену режимов с клавиатуры.
2. **Clipboard:** довести copy/cut, `text/yfm`, HTML/plain-text parser-aware paste и selection trimming; сохранить отдельный file-paste flow.
3. **Autocomplete + CommandMenu:** сначала framework-neutral state/actions/plugins, затем Vue popup/widget и keyboard/a11y scenarios.
4. **YFM:** переносить отдельными вертикальными срезами в порядке `YfmHeading` → `YfmCut` → `YfmNote` → `YfmFile` → `YfmTable` → `YfmTabs`.
5. **Integration parity:** upstream forms, toolbar/presets, bundle/composable API, i18n/styles и public exports; затем полный desktop/narrow acceptance pass.

Для каждого feature-среза порядок один: upstream non-React код и unit-тесты → Vue view/form/widget → runtime preset/export → Chromium-сценарий → обновление этой матрицы.
