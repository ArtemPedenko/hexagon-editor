import {expect, test} from '@playwright/test';

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
        await expect(page.locator('.ProseMirror dl')).toContainText('Термин');
        await expect(page.locator('.ProseMirror blockquote[data-quote-link]')).toContainText('Цитата со ссылкой на источник.');
        await expect(page.locator('.ProseMirror [data-demo-html]')).toHaveText('Raw HTML block');
        await expect(page.locator('.ProseMirror [data-directive-html]')).toHaveText('HTML directive');
        await expect(page.locator('.ProseMirror [data-math-inline]')).toBeVisible();
        await expect(page.locator('.ProseMirror [data-math-inline] .katex')).toBeVisible();
        await expect(page.locator('.ProseMirror [data-math-block]')).toContainText('sum');
        await expect(page.locator('.ProseMirror [data-math-block] .katex-display')).toBeVisible();
        await expect(page.locator('.ProseMirror [data-mermaid]')).toContainText('graph LR');
        await expect(page.locator('.ProseMirror [data-yfm-html]')).toContainText('YFM HTML block');
        await expect(page.locator('.playground__preview')).toContainText('HTML directive');
        expect(errors).toEqual([]);
    });

    test('keeps the document available in all editor modes', async ({page}) => {
        await page.goto('/');

        await page.getByRole('tab', {name: 'Разметка'}).click();
        await expect(page.locator('.markdown-editor[data-mode="markup"] .cm-editor')).toBeVisible();
        await expect(page.locator('.cm-content')).toContainText('##+ Расширенные возможности');

        await page.getByRole('tab', {name: 'Разделить'}).click();
        await expect(page.locator('.markdown-editor[data-mode="split"] .ProseMirror')).toBeVisible();
        await expect(page.locator('.markdown-editor[data-mode="split"] .cm-editor')).toBeVisible();

        await page.getByRole('tab', {name: 'Визуальный'}).click();
        await expect(page.locator('.markdown-editor[data-mode="wysiwyg"] .ProseMirror')).toBeVisible();
    });

    test('keeps editor controls keyboard accessible on a narrow viewport', async ({page}) => {
        await page.setViewportSize({height: 844, width: 390});
        await page.goto('/');

        await page.getByRole('tab', {name: 'Визуальный'}).focus();
        await expect(page.getByTitle('Формула')).toBeVisible();
        await page.keyboard.press('ArrowRight');

        await expect(page.locator('.markdown-editor[data-mode="markup"] .cm-editor')).toBeVisible();
    });

    test('lets users switch the locale and theme in the playground', async ({page}) => {
        await page.goto('/');

        await page.getByLabel('Язык редактора').selectOption('en');
        await expect(page.getByRole('tablist', {name: 'Editor mode'})).toBeVisible();
        await expect(page.getByTitle('Formula')).toBeVisible();

        await page.getByLabel('Тема редактора').selectOption('dark');
        await expect(page.locator('.markdown-editor')).toHaveAttribute('data-theme', 'dark');
    });

    test('inserts a LaTeX formula from the toolbar', async ({page}) => {
        await page.goto('/');

        await page.getByTitle('Формула').click();

        await expect(page.locator('.markdown-editor[data-mode="markup"] .cm-content')).toContainText('E = mc^2');
    });

    test('inserts an editable 3 by 3 table from the toolbar', async ({page}) => {
        await page.goto('/');

        await page.getByTitle('Таблица 3×3').click();

        await expect(page.locator('.ProseMirror table').last()).toBeVisible();
        await expect(page.locator('.ProseMirror table').last().locator('td')).toHaveCount(9);
        await page.locator('.ProseMirror table').last().locator('td').first().click();
        await expect(page.locator('.markdown-editor__table-control--column')).toHaveCount(3);
        await expect(page.locator('.markdown-editor__table-control--row')).toHaveCount(3);
        await page.locator('.markdown-editor__table-control--column').first().click();
        await expect(page.locator('.ProseMirror table').last().locator('td')).toHaveCount(12);

        await page.getByRole('tab', {name: 'Разметка'}).click();
        await page.getByRole('tab', {name: 'Визуальный'}).click();

        await expect(page.locator('.ProseMirror table').last()).toBeVisible();
        await expect(page.locator('.ProseMirror table').last().locator('th')).toHaveCount(4);
        await expect(page.locator('.ProseMirror table').last().locator('td')).toHaveCount(8);
        await expect(page.locator('.ProseMirror table').last().locator('td').first()).toHaveCSS('border-top-style', 'solid');
    });

    test('folds content from a folding heading through the toolbar', async ({page}) => {
        await page.goto('/');

        await page.locator('.ProseMirror h2').click();
        const foldingButton = page.getByTitle('Свернуть раздел');
        await expect(foldingButton).toBeVisible();
        await foldingButton.click();

        await expect(foldingButton).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('.ProseMirror p').filter({hasText: 'Этот раздел можно свернуть кнопкой в тулбаре.'}))
            .toHaveClass(/markdown-editor__folded-content/);
    });
});
