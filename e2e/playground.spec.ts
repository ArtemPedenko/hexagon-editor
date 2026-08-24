import {expect, test} from '@playwright/test';

const documentationPages = [
    ['getting-started', 'Getting started'],
    ['editor-api', 'Editor component API'],
    ['editor-modes', 'Modes, state, and component ref'],
    ['markdown-essentials', 'Markdown essentials'],
    ['extended-markdown', 'Extended Markdown and YFM'],
    ['images', 'Images, uploads, and forms'],
    ['renderer-ssr', 'Renderer, SSR, and styling'],
    ['katex-mermaid', 'KaTeX, Mermaid, and trusted HTML'],
    ['toolbar', 'Toolbar customization'],
    ['directives', 'Custom directives'],
    ['headless', 'Headless API'],
    ['presets-extensions', 'Presets, extensions, and specs'],
    ['core-subpaths', 'Core and public subpaths'],
    ['configuration', 'Configuration, i18n, and class names'],
    ['accessibility', 'Accessibility and responsive behavior'],
] as const;

async function selectEditorMode(page: import('@playwright/test').Page, name: string): Promise<void> {
    await page.locator('[data-toolbar-item="mode"]').click();
    await page.getByRole('menuitemradio', {exact: true, name}).click();
}

test.describe('Markdown editor playground', () => {
    test('renders every advanced Markdown extension without console errors', async ({page}) => {
        const errors: string[] = [];
        page.on('console', (message) => {
            if (message.type() === 'error') errors.push(message.text());
        });
        page.on('pageerror', (error) => errors.push(error.message));

        await page.goto('/');

        await expect(page.getByText('расширенные Markdown-функции')).toBeVisible();
        await expect(page.locator('.ProseMirror h1#editor-demo.playground-title')).toHaveText('Vue Markdown editor');
        await expect(page.locator('.ProseMirror h2')).toHaveText('Расширенные возможности');
        const quote = page.locator('.ProseMirror blockquote');
        await expect(quote).toHaveText('Изменения затрагивают:');
        await expect(quote).toHaveCSS('border-left-color', 'rgb(82, 130, 255)');
        await expect(page.locator('.ProseMirror p', {hasText: '<div data-demo-html>Raw HTML block</div>'})).toHaveText('<div data-demo-html>Raw HTML block</div>');
        await expect(page.locator('.ProseMirror [data-demo-html]')).toHaveCount(0);
        await expect(page.locator('.ProseMirror [data-directive-html]')).toHaveText('HTML directive');
        await expect(page.locator('.ProseMirror [data-math-inline]')).toBeVisible();
        await expect(page.locator('.ProseMirror [data-math-inline] .katex')).toBeVisible();
        await expect(page.locator('.ProseMirror [data-math-block]')).toContainText('sum');
        await expect(page.locator('.ProseMirror [data-math-block] .katex-display')).toBeVisible();
        await expect(page.locator('.ProseMirror [data-mermaid] svg')).toBeVisible();
        await expect(page.locator('.ProseMirror [data-yfm-html]')).toHaveText(':::html\n<section>YFM HTML block</section>\n:::');
        await expect(page.locator('.playground__preview')).toContainText('HTML directive');
        expect(errors).toEqual([]);
    });

    test('inserts and resizes an image from the playground toolbar', async ({page}) => {
        await page.goto('/');
        await page.getByTitle('Изображение').click();
        await page.getByLabel('Адрес изображения').fill('https://example.com/resize-fixture.svg');
        await page.getByLabel('Описание изображения').fill('resize-fixture.svg');
        await page.getByRole('button', {name: 'Сохранить'}).last().click();

        const image = page.locator('.ProseMirror img[alt="resize-fixture.svg"]');
        await expect(image).toBeVisible();
        await image.click();
        const imageActions = page.locator('.markdown-editor__image-actions');
        await expect(imageActions).toBeVisible();
        await expect(page.locator('[data-markdown-editor-toolbar] [data-toolbar-item="image-width"], [data-markdown-editor-toolbar] [data-toolbar-item="image-fit"]')).toHaveCount(0);
        const imageBounds = await image.boundingBox();
        const actionsBounds = await imageActions.boundingBox();
        if (imageBounds === null || actionsBounds === null) throw new Error('Image popover is not measurable');
        expect(actionsBounds.y + actionsBounds.height).toBeLessThanOrEqual(imageBounds.y);
        const objectFit = page.getByRole('combobox', {name: 'Отображение изображения'});
        await expect(objectFit).toHaveValue('contain');
        await objectFit.selectOption('cover');
        await expect(image).toHaveCSS('object-fit', 'cover');
        await page.getByTitle('На всю ширину').click();
        await expect(objectFit).toHaveValue('contain');
        await expect(image).toHaveAttribute('style', /width: 100%/);
        const handle = page.locator('.markdown-editor__image-resize-handle');
        await expect(handle).toBeVisible();
        const bounds = await handle.boundingBox();
        if (bounds === null) throw new Error('Resize handle is not measurable');
        await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        await page.mouse.down();
        await page.mouse.move(bounds.x + bounds.width / 2 + 40, bounds.y + bounds.height / 2);
        await page.mouse.up();

        await expect(image).not.toHaveAttribute('style', /width: 100%/);
        await expect(image).toHaveAttribute('style', /height: \d+px/);
        await image.click();
        await page.getByTitle('На всю ширину').click();
        await expect(image).toHaveAttribute('style', /width: 100%/);
        await expect(image).not.toHaveAttribute('style', /height:/);
    });

    test('validates and cancels the shared image form', async ({page}) => {
        await page.goto('/');
        await page.getByTitle('Изображение').click();
        await page.getByLabel('Адрес изображения').fill('not a url');
        await page.getByRole('button', {name: 'Сохранить'}).last().click();
        await expect(page.getByLabel('Адрес изображения')).toBeVisible();
        await page.getByRole('button', {name: 'Отмена'}).click();
        await expect(page.getByLabel('Адрес изображения')).toBeHidden();
    });

    test('inserts an image URL with alt text and title from the toolbar form', async ({page}) => {
        await page.goto('/');
        await page.getByTitle('Изображение').click();
        await page.getByLabel('Адрес изображения').fill('https://example.com/landscape.jpg');
        await page.getByLabel('Описание изображения').fill('Горный пейзаж');
        await page.getByLabel('Заголовок изображения').fill('Горы');
        await page.getByRole('button', {name: 'Сохранить'}).last().click();

        const image = page.locator('.ProseMirror img[alt="Горный пейзаж"]');
        await expect(image).toHaveAttribute('src', 'https://example.com/landscape.jpg');
        await expect(image).toHaveAttribute('title', 'Горы');
        await expect(image).toHaveAttribute('style', /width: 100%/);
    });

    test('inserts a titled link from the toolbar form', async ({page}) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto('/');
        await page.getByTitle('Ссылка').click();
        await page.getByLabel('Адрес ссылки').fill('https://example.com/docs');
        await page.getByLabel('Текст ссылки').fill('Документация');
        await page.getByLabel('Открывать в новом окне').check();
        await page.getByRole('button', {name: 'Сохранить'}).last().click();

        const link = page.locator('.ProseMirror a', {hasText: 'Документация'});
        await expect(link).toHaveAttribute('href', 'https://example.com/docs');
        await expect(link).toHaveAttribute('title', 'Документация');
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        await expect(link).toHaveAttribute('data-link-tooltip', 'https://example.com/docs');
        await link.click();
        await expect(page.getByLabel('Адрес ссылки')).toBeVisible();
        await expect(page.getByLabel('Открывать в новом окне')).toBeChecked();
        await expect(page.getByTitle('Ссылка')).toHaveAttribute('aria-pressed', 'true');
        expect(errors).toEqual([]);
    });

    test('prefills link text from the visual editor selection', async ({page}) => {
        await page.goto('/');
        const paragraph = page.locator('.ProseMirror p').filter({hasText: 'Этот раздел можно свернуть кнопкой в тулбаре.'});
        await paragraph.evaluate((element) => {
            const text = element.firstChild;
            if (!(text instanceof Text)) throw new Error('Expected paragraph text');
            const start = text.data.indexOf('раздел');
            const range = document.createRange();
            range.setStart(text, start);
            range.setEnd(text, start + 'раздел'.length);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            document.dispatchEvent(new Event('selectionchange'));
        });

        await page.getByTitle('Ссылка').click();
        await expect(page.getByLabel('Текст ссылки')).toHaveValue('раздел');
    });

    test('edits link text without deleting the surrounding paragraph', async ({page}) => {
        await page.goto('/');
        await selectEditorMode(page, 'Разметка');
        const markup = page.locator('.cm-content');
        await markup.click();
        await page.keyboard.press('ControlOrMeta+A');
        await page.keyboard.type('123123  [qwe](http://localhost:5173/ "3213123")');
        await selectEditorMode(page, 'Визуальный');

        await page.locator('.ProseMirror a', {hasText: 'qwe'}).click();
        await page.getByLabel('Текст ссылки').fill('changed');
        await page.getByRole('button', {name: 'Сохранить'}).last().click();

        await expect(page.locator('.ProseMirror p')).toHaveText('123123  changed');
        await expect(page.locator('.ProseMirror a')).toHaveText('changed');
    });

    test('sets a language and shows line numbers for a code block', async ({page}) => {
        await page.goto('/');
        await page.locator('.ProseMirror pre[data-language="typescript"] code').click();
        const language = page.locator('.ProseMirror pre[data-language="typescript"] .markdown-editor__code-language');
        await expect(language).toBeVisible();
        await language.selectOption('javascript');

        await expect(page.locator('.ProseMirror pre[data-language="javascript"]')).toBeVisible();
        await expect(page.locator('.ProseMirror pre[data-language="javascript"] .markdown-editor__code-line-number')).toHaveText(['1', '2']);
        await expect(page.locator('[data-markdown-editor-toolbar] [data-toolbar-item="code-language"]')).toHaveCount(0);
    });

    test('inserts HTML after the current visual block and opens its local editor', async ({page}) => {
        await page.goto('/');
        const paragraph = page.locator('.ProseMirror p').filter({hasText: 'Этот раздел можно свернуть кнопкой в тулбаре.'});
        await paragraph.evaluate((element) => {
            const text = element.firstChild;
            if (!(text instanceof Text)) throw new Error('Expected paragraph text');
            const range = document.createRange();
            range.setStart(text, text.length);
            range.collapse(true);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            document.dispatchEvent(new Event('selectionchange'));
        });
        await page.getByRole('button', {name: 'HTML'}).click();

        await expect(page.locator('.markdown-editor')).toHaveAttribute('data-mode', 'wysiwyg');
        const sourceEditor = page.locator('.markdown-editor__atomic-source .cm-content');
        await expect(sourceEditor).toBeVisible();
        await expect(sourceEditor).toContainText('<div>Add HTML code here</div>');
        const insertedAfterParagraph = await paragraph.evaluate((element) => element.nextElementSibling?.classList.contains('markdown-editor__atomic-source'));
        expect(insertedAfterParagraph).toBe(true);
    });

    test('keeps the cursor stable while syntax tokens are completed', async ({page}) => {
        await page.goto('/');
        const code = page.locator('.ProseMirror pre[data-language="typescript"] code');
        await code.evaluate((element) => {
            element.closest<HTMLElement>('[contenteditable="true"]')?.focus();
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
            let text: Text | undefined;
            for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
                if (!(node.parentElement?.closest('.markdown-editor__code-line-number, .markdown-editor__code-language'))) {
                    text = node as Text;
                }
            }
            if (text === undefined) throw new Error('Expected code text');
            const range = document.createRange();
            range.setStart(text, text.length);
            range.collapse(true);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            document.dispatchEvent(new Event('selectionchange'));
        });
        await page.keyboard.press('Enter');
        await page.keyboard.type('const value = 1;');
        await expect(code).toContainText('const value = 1;');

        const language = page.locator('.ProseMirror pre[data-language="typescript"] .markdown-editor__code-language');
        await language.selectOption('html');
        const htmlCode = page.locator('.ProseMirror pre[data-language="html"] code');
        await htmlCode.evaluate((element) => {
            element.closest<HTMLElement>('[contenteditable="true"]')?.focus();
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
            let text: Text | undefined;
            for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
                if (!(node.parentElement?.closest('.markdown-editor__code-line-number, .markdown-editor__code-language'))) {
                    text = node as Text;
                }
            }
            if (text === undefined) throw new Error('Expected code text');
            const range = document.createRange();
            range.setStart(text, text.length);
            range.collapse(true);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            document.dispatchEvent(new Event('selectionchange'));
        });
        await page.keyboard.press('Enter');
        await page.keyboard.type('<div>content</div>');
        await expect(htmlCode).toContainText('<div>content</div>');
    });

    test('groups inline and block code actions in one toolbar popover', async ({page}) => {
        await page.goto('/');
        const paragraph = page.locator('.ProseMirror p').filter({hasText: 'Этот раздел можно свернуть кнопкой в тулбаре.'});
        await paragraph.evaluate((element) => {
            const text = element.firstChild;
            if (!(text instanceof Text)) throw new Error('Expected paragraph text');
            const start = text.data.indexOf('раздел');
            const range = document.createRange();
            range.setStart(text, start);
            range.setEnd(text, start + 'раздел'.length);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            document.dispatchEvent(new Event('selectionchange'));
        });

        await page.getByTitle('Встроенный код').click();
        await expect(page.getByRole('menuitemradio', {name: 'Встроенный код'})).toBeVisible();
        await expect(page.getByRole('menuitemradio', {name: 'Блок кода'})).toBeVisible();
        await page.getByRole('menuitemradio', {name: 'Встроенный код'}).click();
        await expect(paragraph.locator('code')).toHaveText('раздел');

        await paragraph.click();
        await page.getByTitle('Встроенный код').click();
        await page.getByRole('menuitemradio', {name: 'Блок кода'}).click();
        await expect(page.locator('.ProseMirror pre[data-markup]').filter({hasText: 'Этот раздел можно свернуть кнопкой в тулбаре.'})).toBeVisible();
        await expect(page.locator('[data-markdown-editor-toolbar] [data-toolbar-item="code-block"]')).toHaveCount(0);
    });

    test('does not render the floating text-selection menu', async ({page}) => {
        await page.goto('/');
        await expect(page.locator('.markdown-editor__selection-panel, .markdown-editor__selection-actions')).toHaveCount(0);
    });

    test('types a paragraph at a virtual cursor between atomic blocks', async ({page}) => {
        await page.goto('/');

        const formula = page.locator('.ProseMirror [data-math-block]');
        await formula.click();
        await page.keyboard.press('ArrowDown');
        await expect(page.locator('.ProseMirror .hx-md-gapcursor')).toBeVisible();
        await page.keyboard.type('Текст между блоками');

        const paragraph = page.locator('.ProseMirror p', {hasText: 'Текст между блоками'});
        await expect(paragraph).toBeVisible();
        await expect(page.locator('.ProseMirror .hx-md-gapcursor')).toHaveCount(0);
    });

    test('creates an editable paragraph only by clicking the free space below the document', async ({page}) => {
        const errors: string[] = [];
        page.on('console', (message) => {
            if (message.type() === 'error') errors.push(message.text());
        });
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto('/');

        const editor = page.locator('.ProseMirror');
        const initialChildren = await editor.locator(':scope > *').count();
        const initialText = await editor.textContent();
        await editor.click({position: {x: 4, y: 4}});
        await expect(editor.locator(':scope > *')).toHaveCount(initialChildren);
        await expect(editor).toHaveText(initialText ?? '');

        const bounds = await editor.boundingBox();
        if (bounds === null) throw new Error('Visual editor is not measurable');
        await editor.click({position: {x: 4, y: bounds.height - 4}});
        await page.keyboard.type('After document');
        await expect(editor.locator(':scope > p').last()).toHaveText('After document');
        await expect(editor.locator(':scope > *')).toHaveCount(initialChildren + 1);
        expect(errors).toEqual([]);
    });

    test('edits only an atomic block as Markdown after a double click', async ({page}) => {
        await page.goto('/');

        const sourceEditor = page.locator('.markdown-editor__atomic-source .cm-editor');
        for (const [selector, expectedSource, maxHeight] of [
            ['[data-math-inline]', 'E = mc', 60],
            ['[data-math-block]', 'sum', 150],
            ['[data-mermaid]', 'graph LR', 150],
        ]) {
            const block = page.locator(`.ProseMirror ${selector}`);
            await block.dblclick();
            await expect(sourceEditor).toBeVisible();
            await expect(sourceEditor).toContainText(expectedSource);
            await expect(block).toBeHidden();
            await expect(sourceEditor).toHaveCSS('min-height', '0px');
            await expect(sourceEditor.locator('.cm-gutters')).toBeHidden();
            expect((await sourceEditor.boundingBox())?.height).toBeLessThan(maxHeight);
            await page.getByRole('heading', {exact: true, name: 'Markdown editor'}).click();
            await expect(sourceEditor).toBeHidden();
        }
    });

    test('keeps formula source while typing in the local Markdown editor', async ({page}) => {
        await page.goto('/');
        await page.locator('.ProseMirror [data-math-inline]').dblclick();

        await expect(page.getByTitle('Формула')).toHaveAttribute('aria-pressed', 'true');
        const sourceEditor = page.locator('.markdown-editor__atomic-source .cm-content');
        await sourceEditor.click();
        await page.keyboard.press('End');
        await page.keyboard.type(' + 1');
        await expect(sourceEditor).toContainText('+ 1');
        await page.keyboard.press('Control+Enter');

        await expect(page.locator('.markdown-editor__atomic-source')).toBeHidden();
        await expect(page.locator('.ProseMirror [data-math-inline]')).toContainText('1');
        await expect(page.getByTitle('Формула')).toHaveAttribute('aria-pressed', 'false');
    });

    test('shows a recoverable error for an invalid formula', async ({page}) => {
        await page.goto('/');
        await page.locator('.ProseMirror [data-math-inline]').dblclick();

        const sourceEditor = page.locator('.markdown-editor__atomic-source .cm-content');
        await sourceEditor.click();
        await page.keyboard.press('End');
        await page.keyboard.press('Shift+Home');
        await page.keyboard.type('\\invalid');
        await page.keyboard.press('Control+Enter');

        const formula = page.locator('.ProseMirror [data-math-inline]');
        await expect(formula).toHaveAttribute('data-math-error', '');
        await expect(formula).toHaveAttribute('aria-label', 'Формула. Дважды нажмите, чтобы редактировать.');
        await expect(formula).toHaveAttribute('title', 'Дважды нажмите, чтобы редактировать');
        await expect(formula.locator('.markdown-editor__math-hint')).toHaveCount(0);
        await expect(formula.locator('.markdown-editor__math-error')).toHaveText('\\invalid');
    });

    test('keeps Mermaid source editable in the visual editor', async ({page}) => {
        await page.goto('/');
        await page.locator('.ProseMirror [data-mermaid]').dblclick();

        const mermaidButton = page.getByRole('button', {name: 'Диаграмма Mermaid'});
        await expect(mermaidButton).toHaveAttribute('aria-pressed', 'true');
        const sourceEditor = page.locator('.markdown-editor__atomic-source .cm-content');
        await sourceEditor.fill('sequenceDiagram\n  Alice->>Bob: Hi Bob\n  Bob->>Alice: Hi Alice');
        await page.keyboard.press('Control+Enter');

        const diagram = page.locator('.ProseMirror [data-mermaid]');
        await expect(diagram.locator('svg')).toBeVisible();
        await expect(diagram).not.toHaveAttribute('data-mermaid-error', '');
        await expect(mermaidButton).toHaveAttribute('aria-pressed', 'true');
    });

    test('inserts and renders a Mermaid diagram from the full toolbar', async ({page}) => {
        await page.goto('/');
        await page.locator('.ProseMirror p').filter({hasText: 'Этот раздел можно свернуть кнопкой в тулбаре.'}).click();
        await page.getByRole('button', {name: 'Диаграмма Mermaid'}).click();

        const diagrams = page.locator('.ProseMirror [data-mermaid]');
        await expect(diagrams).toHaveCount(2);
        await expect(diagrams.last().locator('svg')).toBeVisible();
    });

    test('keeps YFM HTML source editable as text in the visual editor', async ({page}) => {
        await page.goto('/');
        const source = page.locator('.ProseMirror [data-yfm-html]');
        await source.evaluate((element) => {
            const text = element.firstChild;
            if (!(text instanceof Text)) throw new Error('YFM source is not editable text');
            const start = text.data.indexOf('YFM HTML');
            if (start < 0) throw new Error('YFM source text is missing');
            (element.closest('.ProseMirror') as HTMLElement | null)?.focus();
            const range = document.createRange();
            range.setStart(text, start);
            range.setEnd(text, start + 'YFM HTML'.length);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
        });
        await page.keyboard.insertText('Updated YFM HTML');

        await expect(source).toHaveText(':::html\n<section>Updated YFM HTML block</section>\n:::');
        await expect(page.locator('.markdown-editor__atomic-source')).toHaveCount(0);
    });

    test('does not insert another formula while editing the current formula', async ({page}) => {
        await page.goto('/');
        await page.locator('.ProseMirror [data-math-block]').dblclick();

        const sourceEditor = page.locator('.markdown-editor__atomic-source .cm-content');
        await page.getByTitle('Формула').click();

        await expect(page.locator('.markdown-editor')).toHaveAttribute('data-mode', 'wysiwyg');
        await expect(sourceEditor).toContainText('sum');
        await expect(sourceEditor).not.toContainText('E = mc^2');
    });

    test('keeps the document available in all editor modes', async ({page}) => {
        await page.goto('/');

        await page.locator('[data-toolbar-item="mode"]').click();
        await expect(page.getByRole('menuitemradio', {name: 'Визуальный'})).toHaveAttribute('aria-checked', 'true');
        await page.keyboard.press('Escape');
        await selectEditorMode(page, 'Разметка');
        const markupEditor = page.locator('.markdown-editor[data-mode="markup"] .cm-editor');
        await expect(markupEditor).toBeVisible();
        await page.locator('[data-toolbar-item="mode"]').click();
        await expect(page.getByRole('menuitemradio', {name: 'Разметка'})).toHaveAttribute('aria-checked', 'true');
        await page.keyboard.press('Escape');
        await expect(page.locator('.markdown-editor[data-mode="markup"] [data-markdown-editor-toolbar]')).toBeVisible();
        await expect(markupEditor.locator('.cm-gutters')).toHaveCount(0);
        await markupEditor.locator('.cm-content').click();
        await expect(markupEditor.locator('.cm-content')).toHaveCSS('caret-color', 'rgb(241, 243, 245)');
        await expect(page.locator('.cm-content')).toContainText('##+ Расширенные возможности');

        await selectEditorMode(page, 'Разделить');
        await expect(page.locator('.markdown-editor[data-mode="split"] .ProseMirror')).toBeVisible();
        await expect(page.locator('.markdown-editor[data-mode="split"] .cm-editor')).toBeVisible();

        await selectEditorMode(page, 'Визуальный');
        await expect(page.locator('.markdown-editor[data-mode="wysiwyg"] .ProseMirror')).toBeVisible();
    });

    test('keeps editor controls keyboard accessible on a narrow viewport', async ({page}) => {
        await page.setViewportSize({height: 844, width: 390});
        await page.goto('/');

        const modeButton = page.locator('[data-toolbar-item="mode"]');
        await modeButton.focus();
        await expect(page.getByTitle('Уровень заголовка')).toContainText('H');
        await expect(page.getByTitle('Формула')).toBeVisible();
        await page.keyboard.press('Enter');
        await page.getByRole('menuitemradio', {name: 'Разметка'}).click();

        await expect(page.locator('.markdown-editor[data-mode="markup"] .cm-editor')).toBeVisible();
        await expect(page.locator('.markdown-editor[data-mode="markup"] [data-markdown-editor-toolbar]')).toBeVisible();
    });

    test('keeps the editor toolbar sticky while the page scrolls', async ({page}) => {
        await page.setViewportSize({height: 500, width: 1000});
        await page.goto('/');
        const toolbar = page.locator('[data-markdown-editor-toolbar]');
        await expect(toolbar).toBeVisible();

        await page.evaluate(() => window.scrollTo({top: 500}));
        await expect.poll(async () => (await toolbar.boundingBox())?.y).toBe(0);
    });

    test('lets users switch the locale and theme in the playground', async ({page}) => {
        await page.goto('/');

        const formula = page.locator('.ProseMirror [data-math-block]');
        await expect(formula).toHaveAttribute('title', 'Дважды нажмите, чтобы редактировать');
        await page.getByLabel('Язык редактора').selectOption('en');
        await expect(page.getByRole('button', {name: 'Editor mode'})).toBeVisible();
        await expect(page.getByTitle('Formula')).toBeVisible();
        await expect(formula).toHaveAttribute('title', 'Double-click to edit');
        await expect(formula).toHaveAttribute('aria-label', 'Formula. Double-click to edit.');

        await page.getByLabel('Тема редактора').selectOption('dark');
        await expect(page.locator('.markdown-editor')).toHaveAttribute('data-theme', 'dark');
    });

    test('keeps table actions readable in the dark theme', async ({page}) => {
        await page.goto('/');
        await page.getByLabel('Тема редактора').selectOption('dark');
        await page.getByTitle('Таблица 3×3').click();
        await page.locator('.ProseMirror table').last().locator('td').first().click({button: 'right'});

        await expect(page.getByRole('menu', {name: 'Действия с таблицей'})).toHaveCSS('background-color', 'rgb(30, 32, 36)');
        await expect(page.getByRole('menuitem', {name: 'Добавить строку'})).toHaveCSS('color', 'rgb(241, 243, 245)');
        await expect(page.getByRole('menuitem', {name: 'Добавить строку'})).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    });

    test('inserts a formula block after a non-empty paragraph without switching to markup', async ({page}) => {
        await page.goto('/');

        const paragraph = page.locator('.ProseMirror p').filter({hasText: 'Этот раздел можно свернуть кнопкой в тулбаре.'});
        await paragraph.click();
        await page.getByTitle('Формула').click();
        await page.getByRole('menuitem', {name: 'Блок с формулой'}).click();

        await expect(page.locator('.markdown-editor')).toHaveAttribute('data-mode', 'wysiwyg');
        await expect(page.locator('.markdown-editor__atomic-source .cm-content')).toContainText('E = mc^2');
        await expect(paragraph).toBeVisible();
    });

    test('inserts an inline formula from the formula menu', async ({page}) => {
        await page.goto('/');

        await page.getByTitle('Формула').click();
        await expect(page.getByRole('menu', {name: 'Вставить формулу'})).toBeVisible();
        await page.getByRole('menuitem', {name: 'Формула в тексте'}).click();

        await expect(page.locator('.markdown-editor')).toHaveAttribute('data-mode', 'wysiwyg');
        await expect(page.locator('.markdown-editor__atomic-source .cm-content')).toContainText('E = mc^2');
    });

    test('inserts an editable 3 by 3 table from the toolbar', async ({page}) => {
        await page.goto('/');

        await page.getByTitle('Таблица 3×3').click();

        await expect(page.locator('.ProseMirror table').last()).toBeVisible();
        await expect(page.locator('.ProseMirror table').last().locator('td')).toHaveCount(6);
        await page.locator('.ProseMirror table').last().locator('td').first().click();
        await expect(page.locator('.markdown-editor__table-popover')).toHaveCount(0);
        await page.locator('.ProseMirror table').last().locator('td').first().click({button: 'right'});
        await expect(page.getByRole('menu', {name: 'Действия с таблицей'})).toBeVisible();
        await page.getByRole('heading', {exact: true, name: 'Markdown editor'}).click();
        await expect(page.getByRole('menu', {name: 'Действия с таблицей'})).toBeHidden();
        await page.locator('.ProseMirror table').last().locator('td').first().click({button: 'right'});
        await page.getByRole('menuitem', {name: 'Добавить колонку'}).click();
        await expect(page.locator('.ProseMirror table').last().locator('td')).toHaveCount(8);

        await selectEditorMode(page, 'Разметка');
        await selectEditorMode(page, 'Визуальный');

        await expect(page.locator('.ProseMirror table').last()).toBeVisible();
        await expect(page.locator('.ProseMirror table').last().locator('th')).toHaveCount(4);
        await expect(page.locator('.ProseMirror table').last().locator('td')).toHaveCount(8);
        await expect(page.locator('.ProseMirror table').last().locator('td').first()).toHaveCSS('border-top-style', 'solid');
    });

    test('continues a bullet list after Enter', async ({page}) => {
        await page.goto('/');

        const paragraph = page.locator('.ProseMirror p').filter({hasText: 'Этот раздел можно свернуть кнопкой в тулбаре.'});
        await paragraph.click({position: {x: 20, y: 10}});
        await page.getByTitle('Маркированный список').click();
        await page.getByRole('menuitemradio', {name: 'Маркированный список'}).click();
        await page.getByTitle('Маркированный список').click();
        await expect(page.getByRole('menuitem', {name: /Увеличить отступ/})).toBeDisabled();
        await expect(page.getByRole('menuitem', {name: /Уменьшить отступ/})).toBeEnabled();
        await page.getByTitle('Маркированный список').click();
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        await page.keyboard.type('Новый пункт');

        const list = page.locator('.ProseMirror > ul').last();
        await expect(list.locator('li')).toHaveCount(2);
        await expect(list.locator('li').last()).toContainText('Новый пункт');
    });

    test('nests a bullet list item with Tab without leaving the editor', async ({page}) => {
        await page.goto('/');

        const paragraph = page.locator('.ProseMirror p').filter({hasText: 'Этот раздел можно свернуть кнопкой в тулбаре.'});
        await paragraph.click({position: {x: 20, y: 10}});
        await page.getByTitle('Маркированный список').click();
        await page.getByRole('menuitemradio', {name: 'Маркированный список'}).click();
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        await page.keyboard.type('Второй пункт');
        await page.keyboard.press('Tab');

        const list = page.locator('.ProseMirror > ul').last();
        await expect(list.locator(':scope > li')).toHaveCount(1);
        await expect(list.locator(':scope > li > ul > li')).toContainText('Второй пункт');
        await page.keyboard.press('Tab');
        await expect(page.locator('.ProseMirror')).toBeFocused();

        await list.locator(':scope > li > ul > li').click({position: {x: 20, y: 10}});
        await page.keyboard.press('Shift+Tab');
        await expect(list.locator(':scope > li')).toHaveCount(2);
        await expect(list.locator(':scope > li').last()).toContainText('Второй пункт');
    });

    test('outdents an ordered list item with Shift+Tab', async ({page}) => {
        await page.goto('/');

        const paragraph = page.locator('.ProseMirror p').filter({hasText: 'Этот раздел можно свернуть кнопкой в тулбаре.'});
        await paragraph.click({position: {x: 20, y: 10}});
        await page.getByTitle('Маркированный список').click();
        await page.getByRole('menuitemradio', {name: 'Нумерованный список'}).click();
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        await page.keyboard.type('Второй пункт');
        await page.keyboard.press('Enter');
        await page.keyboard.type('Третий пункт');
        await page.keyboard.press('Tab');

        const list = page.locator('.ProseMirror > ol').last();
        await expect(list.locator(':scope > li')).toHaveCount(2);
        await expect(list.locator(':scope > li > ol > li')).toContainText('Третий пункт');

        await page.keyboard.press('Shift+Tab');
        await expect(list.locator(':scope > li')).toHaveCount(3);
        await expect(list.locator(':scope > li').last()).toContainText('Третий пункт');
    });

    test('offers safe row and column deletion for a focused table cell', async ({page}) => {
        await page.goto('/');
        await page.getByTitle('Таблица 3×3').click();

        const table = page.locator('.ProseMirror table').last();
        await table.locator('td').nth(1).click({button: 'right'});
        const deleteRow = page.getByRole('menuitem', {name: 'Удалить строку'});
        const deleteColumn = page.getByRole('menuitem', {name: 'Удалить колонку'});
        await expect(deleteRow).toBeVisible();
        await expect(deleteColumn).toBeVisible();

        await deleteRow.click();
        await expect(table.locator('td')).toHaveCount(3);

        await table.locator('td').nth(1).click({button: 'right'});
        await page.getByRole('menuitem', {name: 'Удалить колонку'}).click();
        await expect(table.locator('td')).toHaveCount(2);

        await table.locator('td').nth(1).click({button: 'right'});
        await page.getByRole('menuitem', {name: 'Удалить колонку'}).click();
        await expect(table.locator('td')).toHaveCount(1);
        await table.locator('td').first().click({button: 'right'});
        await expect(page.getByRole('menuitem', {name: 'Удалить колонку'})).toBeDisabled();
    });

    test('opens table actions after a long press on touch devices', async ({page}) => {
        await page.setViewportSize({height: 844, width: 390});
        await page.goto('/');
        await page.getByTitle('Таблица 3×3').click();

        const cell = page.locator('.ProseMirror table').last().locator('td').first();
        await cell.evaluate((element) => {
            const bounds = element.getBoundingClientRect();
            const touch = new Touch({
                clientX: bounds.left + bounds.width / 2,
                clientY: bounds.top + bounds.height / 2,
                identifier: 1,
                target: element,
            });
            element.dispatchEvent(new TouchEvent('touchstart', {
                bubbles: true,
                cancelable: true,
                changedTouches: [touch],
                touches: [touch],
            }));
        });
        await page.waitForTimeout(550);

        await expect(page.getByRole('menu', {name: 'Действия с таблицей'})).toBeVisible();
        await cell.dispatchEvent('touchend');
    });

    test('folds a section from its heading gutter', async ({page}) => {
        await page.goto('/');

        const heading = page.locator('.ProseMirror h2');
        const bounds = await heading.boundingBox();
        if (bounds === null) throw new Error('Folding heading is not visible');
        await heading.click({position: {x: 4, y: Math.min(12, bounds.height / 2)}});

        await expect(heading).toHaveClass(/markdown-editor__folding-heading--folded/);
        await expect(page.locator('.ProseMirror p').filter({hasText: 'Этот раздел можно свернуть кнопкой в тулбаре.'}))
            .toHaveClass(/markdown-editor__folded-content/);
    });

    test('preserves folding heading attributes when changing editor modes', async ({page}) => {
        await page.goto('/');

        const heading = page.locator('.ProseMirror h1#editor-demo.playground-title');
        await heading.click();
        await page.getByTitle('Свернуть раздел').click();

        await selectEditorMode(page, 'Разметка');
        await expect(page.locator('.markdown-editor[data-mode="markup"] .cm-content'))
            .toContainText('#+ Vue Markdown editor {#editor-demo .playground-title}');
        await selectEditorMode(page, 'Визуальный');

        await expect(page.locator('.ProseMirror h1#editor-demo.playground-title'))
            .toHaveText('Vue Markdown editor');
    });
});

test.describe('Documentation', () => {
    test('renders every registered route with its heading, active link, and typed example', async ({page}) => {
        for (const [slug, title] of documentationPages) {
            await page.goto(`/#/docs/${slug}`);
            await expect(page).toHaveURL(new RegExp(`#\\/docs\\/${slug}$`));
            await expect(page.getByRole('heading', {level: 1, name: title})).toBeVisible();
            await expect(page.locator(`.docs-sidebar a[href="#/docs/${slug}"]`)).toHaveAttribute('aria-current', 'page');
            await expect(page.locator('.docs-article pre code').filter({hasText: '<script setup lang="ts">'}).first()).toBeVisible();
        }
    });

    test('handles redirects, direct reloads, and scroll restoration', async ({page}) => {
        await page.goto('/#/docs');
        await expect(page).toHaveURL(/#\/docs\/getting-started$/);
        await page.goto('/#/docs/not-a-page');
        await expect(page).toHaveURL(/#\/docs\/getting-started$/);
        await page.goto('/#/docs/accessibility');
        await page.reload();
        await expect(page.getByRole('heading', {level: 1, name: 'Accessibility and responsive behavior'})).toBeVisible();
        await page.evaluate(() => window.scrollTo({top: document.body.scrollHeight}));
        await page.locator('.docs-sidebar a[href="#/docs/getting-started"]').click();
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    });

    test('keeps mobile documentation navigation horizontally scrollable', async ({page}) => {
        await page.setViewportSize({height: 844, width: 390});
        await page.goto('/#/docs/getting-started');
        const navigation = page.getByRole('navigation', {name: 'Documentation pages'});
        await expect(navigation).toBeVisible();
        await expect(navigation).toHaveCSS('overflow-x', 'auto');
        expect(await navigation.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    });
});
