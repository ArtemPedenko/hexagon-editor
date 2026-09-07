import { expect, test } from '@playwright/test';

for (const mode of ['markup', 'split']) {
  test(`readonly protects keyboard commands and open forms in ${mode}`, async ({ page }) => {
    await page.goto('/hexagon-editor/e2e/readonly.html?mode=' + mode);
    await page.locator('[data-toolbar-item="image"]').click();
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('form input[type="number"]')).toHaveCount(0);
    await page.locator('form input[type="url"]').fill('https://example.com/image.png');
    await page.locator('#lock').click();
    await expect(page.locator('form')).toHaveCount(0);
    const content = page.locator('.cm-content');
    await expect(content).toHaveText('text');
    for (const key of ['Tab', 'Shift+Tab', 'Backspace', 'Delete', 'ControlOrMeta+z', 'ControlOrMeta+Shift+z']) {
      await content.focus();
      await page.keyboard.press(key);
      await expect(page.locator('#value')).toHaveText('text');
      await expect(content).toHaveText('text');
    }
    await page.locator('#replace').click();
    await expect(content).toHaveText('external');
    await expect(page.locator('#value')).toHaveText('external');
  });
}
