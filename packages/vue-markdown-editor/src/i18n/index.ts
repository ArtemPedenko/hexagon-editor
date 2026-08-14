import type {MarkdownEditorLocale} from '../public-types';

const en = {
    apply: 'Submit', bold: 'Bold', bulletList: 'Bulleted list', cancel: 'Cancel', code: 'Inline code', codeBlock: 'Code block', codeLanguage: 'Code language', doubleClickToEdit: 'Double-click to edit',
    color: 'Text color', foldHeading: 'Collapse section', formula: 'Formula', formulaBlock: 'Formula block', formulaInline: 'Inline formula', formulaInsert: 'Insert formula',
    heading: 'Heading level', horizontalRule: 'Horizontal rule', html: 'HTML', image: 'Image', imageAlt: 'Alt text', imageAltAria: 'Image description', imageAltHelp: 'Displayed if the image cannot be loaded.',
    imageFit: 'Image display', imageHeight: 'Height', imageName: 'Image name', imageSizes: 'Size, px', imageTitle: 'Image title', imageUrl: 'Image link',
    imageUrlAria: 'Image address', imageUrlError: 'Enter a valid image address.', imageWidth: 'Width', imageWidthFull: 'Full width', italic: 'Italic',
    link: 'Link', linkNewWindow: 'Open in a new window', linkRemove: 'Remove', linkText: 'Link text', linkTextHelp: 'Text displayed as a link.', linkUrl: 'Link address', mermaid: 'Mermaid diagram',
    linkUrlError: 'Enter a valid link address.', listIndent: 'Increase indent', listOutdent: 'Decrease indent', mark: 'Highlight', markup: 'Markup', mode: 'Editor mode', orderedList: 'Numbered list', paragraph: 'Text', quote: 'Quote',
    redo: 'Redo', selectionBold: 'Bold selection', selectionItalic: 'Italic selection', split: 'Split', strike: 'Strikethrough', table: 'Table 3×3', toolbar: 'Markdown formatting',
    underline: 'Underline', undo: 'Undo', visual: 'Visual',
} as const;

const ru: Record<keyof typeof en, string> = {
    apply: 'Сохранить', bold: 'Жирный', bulletList: 'Маркированный список', cancel: 'Отмена', code: 'Встроенный код', codeBlock: 'Блок кода', codeLanguage: 'Язык кода', doubleClickToEdit: 'Дважды нажмите, чтобы редактировать',
    color: 'Цвет текста', foldHeading: 'Свернуть раздел', formula: 'Формула', formulaBlock: 'Блок с формулой', formulaInline: 'Формула в тексте', formulaInsert: 'Вставить формулу',
    heading: 'Уровень заголовка', horizontalRule: 'Горизонтальная линия', html: 'HTML', image: 'Изображение', imageAlt: 'Альтернативный текст', imageAltAria: 'Описание изображения', imageAltHelp: 'Отображается, если изображение не загрузилось.',
    imageFit: 'Отображение изображения', imageHeight: 'Высота', imageName: 'Подпись к рисунку', imageSizes: 'Размер в пикселях', imageTitle: 'Заголовок изображения', imageUrl: 'Ссылка картинки',
    imageUrlAria: 'Адрес изображения', imageUrlError: 'Введите корректный адрес изображения.', imageWidth: 'Ширина', imageWidthFull: 'На всю ширину', italic: 'Курсив',
    link: 'Ссылка', linkNewWindow: 'Открывать в новом окне', linkRemove: 'Удалить', linkText: 'Текст ссылки', linkTextHelp: 'Текст, который отображается как ссылка.', linkUrl: 'Адрес ссылки', mermaid: 'Диаграмма Mermaid',
    linkUrlError: 'Введите корректный адрес ссылки.', listIndent: 'Увеличить отступ', listOutdent: 'Уменьшить отступ', mark: 'Выделить', markup: 'Разметка', mode: 'Режим редактора', orderedList: 'Нумерованный список', paragraph: 'Текст', quote: 'Цитата',
    redo: 'Повторить', selectionBold: 'Жирный для выделения', selectionItalic: 'Курсив для выделения', split: 'Разделить', strike: 'Зачёркивание', table: 'Таблица 3×3', toolbar: 'Форматирование Markdown',
    underline: 'Подчёркивание', undo: 'Отменить', visual: 'Визуальный',
};

export type MarkdownEditorMessageKey = keyof typeof en;
export type MarkdownEditorMessages = Readonly<Record<MarkdownEditorMessageKey, string>>;

export const markdownEditorMessages: Readonly<Record<MarkdownEditorLocale, MarkdownEditorMessages>> = {en, ru};

export function getMarkdownEditorMessages(locale: MarkdownEditorLocale): MarkdownEditorMessages {
    return markdownEditorMessages[locale];
}
