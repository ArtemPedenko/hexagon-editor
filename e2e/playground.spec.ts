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

    test('does not show text-selection actions for atomic Markdown blocks', async ({page}) => {
        await page.goto('/');

        const selectionActions = page.locator('.markdown-editor__selection-panel');
        for (const selector of ['[data-math-block]', '[data-raw-html]', '[data-mermaid]']) {
            await page.locator(`.ProseMirror ${selector}`).click();
            await expect(selectionActions).toBeHidden();
        }
    });

    test('edits only an atomic block as Markdown after a double click', async ({page}) => {
        await page.goto('/');

        const sourceEditor = page.locator('.markdown-editor__atomic-source .cm-editor');
        for (const [selector, expectedSource, maxHeight] of [
            ['[data-math-inline]', 'E = mc', 60],
            ['[data-math-block]', 'sum', 150],
            ['[data-raw-html]', 'Raw HTML block', 60],
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
        await expect(formula).toHaveAttribute('aria-label', 'Formula. Double-click to edit.');
        await expect(formula.locator('.markdown-editor__math-error')).toHaveText('\\invalid');
    });

    test('keeps Mermaid source editable in the visual editor', async ({page}) => {
        await page.goto('/');
        await page.locator('.ProseMirror [data-mermaid]').dblclick();

        const sourceEditor = page.locator('.markdown-editor__atomic-source .cm-content');
        await sourceEditor.click();
        await page.keyboard.press('Control+a');
        await page.keyboard.type('flowchart LR\\n  Start --> Finish');
        await page.keyboard.press('Control+Enter');

        const diagram = page.locator('.ProseMirror [data-mermaid]');
        await expect(diagram).toContainText('flowchart LR');
        await expect(diagram).toContainText('Start --> Finish');
    });

    test('keeps YFM HTML source editable in the visual editor', async ({page}) => {
        await page.goto('/');
        await page.locator('.ProseMirror [data-yfm-html]').dblclick();

        const sourceEditor = page.locator('.markdown-editor__atomic-source .cm-content');
        await sourceEditor.click();
        await page.keyboard.press('Control+a');
        await page.keyboard.type('<aside>Updated YFM HTML</aside>');
        await page.keyboard.press('Control+Enter');

        await expect(page.locator('.ProseMirror [data-yfm-html]')).toContainText('<aside>Updated YFM HTML</aside>');
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

    test('keeps table actions readable in the dark theme', async ({page}) => {
        await page.goto('/');
        await page.getByLabel('Тема редактора').selectOption('dark');
        await page.getByTitle('Таблица 3×3').click();
        await page.locator('.ProseMirror table').last().locator('td').first().click({button: 'right'});

        await expect(page.getByRole('menu', {name: 'Действия с таблицей'})).toHaveCSS('background-color', 'rgb(30, 32, 36)');
        await expect(page.getByRole('menuitem', {name: 'Добавить строку'})).toHaveCSS('color', 'rgb(241, 243, 245)');
        await expect(page.getByRole('menuitem', {name: 'Добавить строку'})).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    });

    test('inserts a LaTeX formula from the toolbar', async ({page}) => {
        await page.goto('/');

        await page.getByTitle('Формула').click();
        await page.getByRole('menuitem', {name: 'Блок с формулой'}).click();

        await expect(page.locator('.markdown-editor[data-mode="markup"] .cm-content')).toContainText('E = mc^2');
    });

    test('opens local formula editing when inserting into an empty visual paragraph', async ({page}) => {
        await page.goto('/');

        await page.locator('.ProseMirror p').filter({hasText: 'Этот раздел можно свернуть кнопкой в тулбаре.'}).click();
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        await page.getByTitle('Формула').click();
        await page.getByRole('menuitem', {name: 'Блок с формулой'}).click();

        await expect(page.locator('.markdown-editor')).toHaveAttribute('data-mode', 'wysiwyg');
        await expect(page.locator('.markdown-editor__atomic-source .cm-content')).toContainText('E = mc^2');
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

        await page.getByRole('tab', {name: 'Разметка'}).click();
        await page.getByRole('tab', {name: 'Визуальный'}).click();

        await expect(page.locator('.ProseMirror table').last()).toBeVisible();
        await expect(page.locator('.ProseMirror table').last().locator('th')).toHaveCount(4);
        await expect(page.locator('.ProseMirror table').last().locator('td')).toHaveCount(8);
        await expect(page.locator('.ProseMirror table').last().locator('td').first()).toHaveCSS('border-top-style', 'solid');
    });

    test('continues a bullet list after Enter', async ({page}) => {
        await page.goto('/');

        const paragraph = page.locator('.ProseMirror p').filter({hasText: 'Этот раздел можно свернуть кнопкой в тулбаре.'});
        await paragraph.click();
        await page.getByTitle('Маркированный список').click();
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        await page.keyboard.type('Новый пункт');

        const list = page.locator('.ProseMirror > ul').last();
        await expect(list.locator('li')).toHaveCount(2);
        await expect(list.locator('li').last()).toHaveText('Новый пункт');
    });

    test('nests a bullet list item with Tab without leaving the editor', async ({page}) => {
        await page.goto('/');

        const paragraph = page.locator('.ProseMirror p').filter({hasText: 'Этот раздел можно свернуть кнопкой в тулбаре.'});
        await paragraph.click();
        await page.getByTitle('Маркированный список').click();
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        await page.keyboard.type('Второй пункт');
        await page.keyboard.press('Tab');

        const list = page.locator('.ProseMirror > ul').last();
        await expect(list.locator(':scope > li')).toHaveCount(1);
        await expect(list.locator(':scope > li > ul > li')).toHaveText('Второй пункт');
        await page.keyboard.press('Tab');
        await expect(page.locator('.ProseMirror')).toBeFocused();

        await page.getByText('Второй пункт', {exact: true}).first().click();
        await page.keyboard.press('Shift+Tab');
        await expect(list.locator(':scope > li')).toHaveCount(2);
        await expect(list.locator(':scope > li').last()).toHaveText('Второй пункт');
    });

    test('outdents an ordered list item with Shift+Tab', async ({page}) => {
        await page.goto('/');

        const paragraph = page.locator('.ProseMirror p').filter({hasText: 'Этот раздел можно свернуть кнопкой в тулбаре.'});
        await paragraph.click();
        await page.getByTitle('Нумерованный список').click();
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        await page.keyboard.type('Второй пункт');
        await page.keyboard.press('Enter');
        await page.keyboard.type('Третий пункт');
        await page.keyboard.press('Tab');

        const list = page.locator('.ProseMirror > ol').last();
        await expect(list.locator(':scope > li')).toHaveCount(2);
        await expect(list.locator(':scope > li > ol > li')).toHaveText('Третий пункт');

        await page.keyboard.press('Shift+Tab');
        await expect(list.locator(':scope > li')).toHaveCount(3);
        await expect(list.locator(':scope > li').last()).toHaveText('Третий пункт');
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

        await page.getByRole('tab', {name: 'Разметка'}).click();
        await expect(page.locator('.markdown-editor[data-mode="markup"] .cm-content'))
            .toContainText('#+ Vue Markdown editor {#editor-demo .playground-title}');
        await page.getByRole('tab', {name: 'Визуальный'}).click();

        await expect(page.locator('.ProseMirror h1#editor-demo.playground-title'))
            .toHaveText('Vue Markdown editor');
    });
});
