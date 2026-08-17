# Parity-матрица upstream Markdown editor → Vue

## Эталон и правила учёта

- **Upstream:** commit `fcb1c73561e9d0ee04a8f2a73308c4fadd1cff14` (15.45.0, MIT).
- **Статусы:** `done` — используется в runtime Vue-пакета; `partial` — есть часть API/поведения, но не весь upstream-контракт; `pending` — ещё не переносился; `excluded` — только согласованное исключение.
- **Допустимые исключения:** `extensions/additional/GPT`, связанные с ним icons/i18n/tests, `extensions/markdown/Superscript`, behavior-расширения `Autocomplete`, `CommandMenu` и `FilePaste`, все YFM-расширения, загрузка файлов и `FileForm`, продуктовая интеграция Yandex Forms; для `CodeBlock` — IDE-paste и полноценный Vue node-view. Общие редакторские формы изображения и ссылки не исключены.
- Для React-bound исходников Vue-эквивалентом должен стать компонент/composable/node-view; перенос core-семантики и Markdown-формата обязателен до UI-слоя.

## Public API, bundle и presets

| Upstream source | Vue target | Status | Примечание |
| --- | --- | --- | --- |
| `src/index.ts`, `src/configure.ts`, `src/classname.ts`, `src/logger.ts` | `src/{index,configure,classname}.ts`, `src/core/logger.ts` | done | Root API, применимые exports, `configure`/subscription contract, dependency-free `g-md-` BEM helper и logger публичны. Стабильные subpath entry points зафиксированы в package exports; React/GPT/upload/YFM-only API исключены согласованно. |
| `src/bundle/*`, `src/Editor.ts` | `src/MarkdownEditor.vue`, `src/use-markdown-editor.ts`, `src/core/editor-instance.ts` | done | Vue component ref и headless instance предоставляют common editor API (`clear/replace/prepend/append/insert`, cursor/focus/value), mode lifecycle, readonly/toolbar state и typed events; composable синхронизирует публичное состояние и уничтожает instance вместе с Vue scope. React views заменены единым Vue host для visual/markup/split. |
| `src/presets/{zero,commonmark,default,full,yfm}{,-specs}.ts` | `src/presets/{zero,commonmark,default,full}{,-specs}.ts` | done | Применимые `ZeroPreset`, `CommonMarkPreset`, `DefaultPreset` и scoped `FullPreset` перенесены и экспортированы; full runtime подключён к visual editor. Specs entry points учитывают объединённую runtime/spec архитектуру Vue-порта. YFM preset и исключённые extensions отсутствуют согласованно. |
| `src/modules/toolbars/*`, `src/toolbar/*`, `src/plugins/*` | `src/toolbar/*`, Vue toolbar/components | done | Публичные item/group/config factories, action bindings (`run`/active/enabled), применимые zero/commonmark/default/full presets, порядок и контекстная availability подключены к runtime; YFM-only/исключённые items отсутствуют согласованно. |
| `src/i18n/*`, `src/icons/*`, `src/view/*`, styles | `src/i18n/*`, `src/assets/toolbar-icons/*`, Vue components/styles | done | Централизованные типизированные `ru/en` сообщения экспортированы через root и `./i18n`; локальные SVG не требуют runtime icon package. Editor, toolbar, menus и формы используют единые locale/theme tokens, focus/disabled/error states и responsive wrapping. |

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
| `ClicksOnEdges`, `EditorModeKeymap` | `src/extensions/behavior/{clicks-on-edges,editor-mode-keymap}.ts` | done — клики по свободной области до/после документа создают доступный текстовый блок; Escape/Mod-Enter передаются в Vue `cancel`/`submit`, служебные клавиши можно поглотить с низким приоритетом. Покрыто unit и Chromium-сценарием. |
| `Autocomplete`, `CommandMenu` | — | excluded — согласованно не переносим popup-команды, их state/actions/plugins и связанные keyboard/a11y scenarios. |
| `Clipboard` | `src/extensions/behavior/clipboard.ts` | deferred — текущая вставка plain text и имён файлов в inline/block code остаётся подключённой к `DefaultPreset`; copy/cut, MIME `text/yfm` и дальнейшее развитие paste пока сознательно не реализуем. |
| `Cursor` | `src/extensions/behavior/cursor.ts` | done — upstream `GapCursorSelection`, virtual paragraph widget/input materialization and configurable ProseMirror drop cursor подключены к `DefaultPreset`; создание и навигация gap selection обеспечены командами `Selection`. |
| `FilePaste` | — | excluded — загрузка файлов через paste/drop и host callback полностью удалена из package API и runtime preset. |
| `History`, `Placeholder`, `Resizable`, `Selection`, `SelectionContext`, `SharedState` | `src/extensions/behavior/*` | partial — `History`, document-level `Placeholder`, `Selection` decorations, hierarchical select-all, fake-paragraph/gap-cursor commands/keymap и Vue `SelectionContext` перенесены и подключены к DefaultPreset/visual editor. Resizable supports selected image drag handles and Markdown dimension round-trip; generic node-view resizing, schema-driven placeholder decorations, `SharedState` и остальное pending. Search is deliberately excluded. |
| `ReactRenderer`, `WidgetDecoration` | `core/vue-renderer.ts`, `src/extensions/behavior/*` | partial |
| `behavior/utils/*` | `src/extensions/behavior/utils/*` | pending |

## YFM extensions

| Upstream source | Vue target | Status |
| --- | --- | --- |
| `Checkbox`, `Color`, `Emoji`, `ImgSize`, `Monospace`, `Video`, `YfmConfigs` | — | excluded — согласованное исключение из объёма работ. |
| `YfmCut`, `YfmFile`, `YfmHeading`, `YfmNote`, `YfmTable`, `YfmTabs` | — | excluded — согласованно не переносим оставшиеся YFM-расширения и связанные с ними views/actions/tests. |

## Forms, renderer и integration layer

| Upstream source | Vue target | Status | Примечание |
| --- | --- | --- | --- |
| `forms/{Link,Image,TextInput,base,components,utils}.tsx` | `src/forms/{MarkdownEditorForm,MarkdownEditorTextInput,MarkdownEditorLinkForm,MarkdownEditorImageForm}.vue` | done | Публичные Vue primitives и формы Link/Image поддерживают URL validation/error, autofocus, disabled/readonly, ru/en labels, apply/cancel/remove, typed trimmed payloads и image dimensions; toolbar использует те же формы. Upload tabs/components исключены вместе с FileForm. |
| `forms/FileForm.tsx` | — | excluded — загрузка файлов и форма файла полностью исключены из package API, toolbar, paste/drop и playground. |
| `react-utils/*`, `markup/codemirror/react-facet.ts` | `core/vue-renderer.ts`, Vue composables | partial | Есть mount-адаптер для node/widget/context panel; нет полного parity. |
| `bundle/*View.tsx`, `bundle/MarkupManager.ts`, `bundle/useMarkdownEditor.ts` | Vue components/composables | pending | |

## Test and playground parity

| Upstream source | Vue target | Status |
| --- | --- | --- |
| `core/*.test.ts`, extension tests, `markup/*.test.ts`, `bundle/Editor.test.ts` | Vitest tests in package | partial |
| Browser scenarios for Markdown, actions, modes, forms, clipboard, node views and accessibility | `e2e/playground.spec.ts` | partial |
| Desktop and narrow manual visual check | playground | pending |

## Следующий реализуемый срез

**Integration/API parity** — следующий и последний крупный этап переноса. Он включает:

1. **Общие Vue-формы Link и Image — done.** Переиспользуемые публичные формы и base/TextInput primitives поддерживают применимый upstream props/events contract, validation/error, autofocus, disabled/readonly, локали и image dimensions. Загрузка файлов и `FileForm` исключены.
2. **Toolbar, toolbar items и editor presets — done.** Публичные item/group/config factories, action bindings и применимые `zero`, `commonmark`, `default`, `full` toolbar/editor presets подключены и экспортированы. Исключённые Autocomplete, CommandMenu и YFM extensions в presets не входят.
3. **Bundle и composable API — done.** `MarkdownEditor`, `useMarkdownEditor` и headless instance предоставляют применимый common editor contract, lifecycle, mode switching, focus/cursor, readonly/toolbar state и typed events. Исключённые upload/search/YFM API не публикуются.
4. **Public exports и совместимые entry points — done.** Root surface и стабильные `core/extensions/specs/presets/toolbar/forms/configure/classname` subpaths собираются с JavaScript и declarations; внутренние пути закрыты package exports. React/GPT/upload/YFM-only API отсутствуют.
5. **i18n, icons и styles — done.** Общие типизированные строки `ru/en`, локальные toolbar SVG, темы телепортируемых меню/форм, focus/disabled/error states и независимый responsive wrapping подключены к package UI.
6. **Финальная документация и acceptance.** Обновить README и parity-матрицу, расширить Chromium-сценарии для modes/forms/toolbar/public API, затем вручную проверить desktop и narrow viewport без console/page errors. Это подтверждает не только unit-контракты, но и реальную интеграцию собранного Vue-пакета.

Для каждого feature-среза порядок один: upstream non-React код и unit-тесты → Vue view/form/widget → runtime preset/export → Chromium-сценарий → обновление этой матрицы.
