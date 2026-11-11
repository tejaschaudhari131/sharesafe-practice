import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { doCheck } from './helpers';

const results: Record<string, { violations: number; passes: number; ids: string[] }> = {};

async function scan(page: import('@playwright/test').Page, name: string) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
  results[name] = { violations: r.violations.length, passes: r.passes.length, ids: r.violations.map((v) => `${v.id} (${v.nodes.length})`) };
  return r.violations;
}

for (const mode of ['default', 'high-contrast+large+plain']) {
  test(`axe: all views, ${mode}`, async ({ page }) => {
    await page.goto('/');
    if (mode !== 'default') {
      await page.getByRole('button', { name: /Text size/ }).click();
      await page.getByRole('button', { name: /Text size/ }).click();
      await page.getByRole('button', { name: 'High contrast' }).click();
      await page.getByRole('button', { name: 'Plain language' }).click();
    }
    const all: unknown[] = [];
    all.push(...await scan(page, `${mode}: home`));
    await page.locator('button[data-go=start]').click();
    all.push(...await scan(page, `${mode}: pre-check`));
    await doCheck(page, 'pre', 3);
    await page.locator('button[data-go=begin-practice]').click();
    await page.locator('#hint-btn').click();
    all.push(...await scan(page, `${mode}: practice + hint`));
    await page.locator('#steps-btn').click();
    all.push(...await scan(page, `${mode}: worked steps`));
    await page.locator('button[data-skill=compare]').click();
    all.push(...await scan(page, `${mode}: compare problem`));
    await page.locator('main button[data-go=code]').click();
    await page.locator('.qr-svg').waitFor();
    all.push(...await scan(page, `${mode}: resume code`));
    await page.locator('footer button[data-go=end]').click();
    all.push(...await scan(page, `${mode}: end session`));
    await page.locator('footer button[data-go=about]').click();
    all.push(...await scan(page, `${mode}: about`));
    expect(all).toEqual([]);
  });
}

test.afterAll(() => {
  mkdirSync('docs/reports', { recursive: true });
  writeFileSync('docs/reports/axe-results.json', JSON.stringify(results, null, 2));
});
