# Перенести upstream-модули gravity-ui/markdown-editor на Vue 3

## Статус постановки

В работе — parity-инвентаризация зафиксирована в `tasks/changes/upstream-parity-matrix.md`; перенесены foundation `ExtensionBuilder`/`ExtensionsManager`, Markdown serializer registration, `Lists`, `Blockquote`, `Bold`, `Italic`, inline `Code`, базовый runtime `CodeBlock`, `Heading`, `HorizontalRule`, `WysiwygContentHandler`, `History`, `Clipboard`, `FilePaste`, `Placeholder`, `Selection` и Vue-адаптация `SelectionContext`. Все подключаемые behavior/markdown-расширения включены в visual editor через `DefaultPreset`. Следующий срез — `Link`.

## Решения и [Уточнить]

- Единственный эталон поведения и исходников — `gravity-ui/markdown-editor` commit `fcb1c73561e9d0ee04a8f2a73308c4fadd1cff14` (15.45.0, MIT).
- Переносить весь применимый upstream-код; React-bound view, hooks и renderer заменять Vue 3-адаптером, не меняя редакторскую семантику.
- Публичный API включает все применимые upstream export и extension/action points под теми же именами и семантикой; React entry points заменяются Vue-компонентом и composable.
- GPT исключается полностью: исходники, i18n, иконки, зависимости, экспорты, playground и документация.
- Интеграция с продуктом Yandex Forms исключается, если встретится в зависимом коде. Общие формы редактора для ссылок, изображений и файлов входят в перенос.
- Текущий самописный код не является источником поведения: он заменяется или адаптируется только после сверки с upstream.

## Итоговая задача

**Тип:** Tech Debt  
**Приоритет:** High — текущий частичный порт создаёт несовместимое поведение редактора и блокирует его надёжное подключение.  
**Постановщик:** Пользователь  
**Исполнитель / приёмка:** Команда разработки / QA + Team Lead

## Описание

Текущий `@gravity-ui/vue-markdown-editor` реализует ограниченный самостоятельный редактор и расходится с `@gravity-ui/markdown-editor` в API, extension architecture, Markdown-кодеках, командах и клавиатурных сценариях. Требуется заменить этот подход последовательным переносом upstream-модулей на Vue 3: framework-independent ProseMirror/CodeMirror-код переносится без изменения поведения, а React UI заменяется Vue-реализацией. Результат — Vue-пакет с функциональным и контрактным паритетом upstream, кроме GPT и интеграции Yandex Forms.

## Что нужно сделать

1. Составить versioned parity-матрицу всех upstream export, core, presets, extensions, actions, schema/parser/serializer, plugins, keymaps, node/widget views, toolbar, i18n, styles и тестов; для каждого элемента зафиксировать upstream-файл, Vue-адаптацию и статус. **Готово:** `tasks/changes/upstream-parity-matrix.md`.
2. Перенести редакторское ядро `core`, `common`, `commands`, `cm`, `pm`, `markup`, markdown-it, registries, менеджеры extensions/actions и public types. Сохранить порядок регистрации, транзакционную семантику, parser/serializer и Markdown/YFM round-trip.
3. Перенести base, markdown, behavior, additional и YFM-расширения вертикальными срезами: сначала независимый код, затем Vue renderer/forms/node views/toolbar, затем upstream unit-тесты и Vue integration/e2e. Обязательный первый срез — полный `Lists`: schema, Markdown attrs, parser/serializer, input rules, commands, merge/collapse plugins и keymap.
4. Заменить React view, hooks, toolbar, popups, forms и decorations Vue-компонентами и mount-адаптером ProseMirror; React и `react-dom` не должны попасть в runtime dependencies. Сохранить WYSIWYG, markup и split-view, accessibility, локали и темы upstream.
5. Обновить exports, README, license notices и playground. Playground сделать parity-harness: одинаковые Markdown, действия и ожидаемые Markdown/DOM для списков, table, upload, clipboard, search, modes, Math, Mermaid, HTML, YFM и node views.

## Что не входит в задачу

- GPT и интеграция Yandex Forms; редизайн или самостоятельная замена UX upstream.

## Технические детали

Поддерживать ESM TypeScript/Vue 3-пакет `@gravity-ui/vue-markdown-editor`. Новые entry points и совместимые deep imports публиковать только после фиксации в parity-матрице. Стили и i18n переносить вместе с соответствующей функцией. Нельзя заменять существующий upstream-модуль упрощённой командой или новым форматом Markdown.

## Критерии приёмки

1. Все применимые upstream-модули и public exports перечислены в parity-матрице, имеют Vue-эквивалент и ссылку на источник; исключения ограничены GPT и Yandex Forms.
2. Vue-пакет не имеет runtime-зависимостей `react` и `react-dom`; Vue API сохраняет семантику upstream instance, extensions, actions и режимов.
3. Для каждого модуля проходят перенесённые unit-тесты, Vue integration-тесты и Markdown/YFM round-trip; Chromium parity-сценарии не содержат console/page errors.
4. `Tab`, `Shift+Tab`, `Enter`, `Backspace`, `Mod-[` и `Mod-]` в nested bullet/ordered lists повторяют upstream и не уводят фокус из WYSIWYG list item.
5. Перед приёмкой проходят `pnpm test`, `pnpm typecheck`, `pnpm lint` и `pnpm test:e2e`; playground проверен вручную на desktop и narrow viewport.

## Тестирование

Разработчик переносит релевантные upstream-тесты и запускает обязательные проверки на каждом вертикальном срезе. QA принимает parity-матрицу, Markdown/YFM round-trip, клавиатуру, режимы, toolbar/popups, upload, accessibility и визуальные состояния playground в Chromium.

## Риски и зависимости

Upstream содержит React-bound код и optional peer dependencies: зависимости подключать только когда они нужны соответствующему модулю, без React. Перенос затрагивает общий редакторский core, поэтому частичный срез не закрывается при красных общих тестах. Оценка и срок определяются после inventory parity-матрицы.
