import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { accessItem, answerAccessByKeyboard, doCheck, startPre } from './helpers';

const results: Record<string, { violations: number; passes: number; ids: string[] }> = {};

async function scan(page: import('@playwright/test').Page, name: string) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
  results[name] = { violations: r.violations.length, passes: r.passes.length, ids: r.violations.map((v) => `${v.id} (${v.nodes.length})`) };
  if (r.violations.length) {
    results[name].ids = r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.failureSummary || n.html.slice(0, 80)).join(' | ')}`);
  }
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
    await startPre(page);
    all.push(...await scan(page, `${mode}: pre-check`));
    await doCheck(page, 'pre', 3);
    all.push(...await scan(page, `${mode}: 403 intro`));
    await page.locator('button[data-go=begin-practice]').click();
    await page.locator('#hint-btn').click();
    all.push(...await scan(page, `${mode}: access practice + hint`));
    await answerAccessByKeyboard(page, accessItem('roster'));
    all.push(...await scan(page, `${mode}: access feedback`));
    await page.locator('button[data-skill=project]').click();
    all.push(...await scan(page, `${mode}: group project`));
    await page.locator('main button[data-go=code]').click();
    await page.locator('.qr-svg').waitFor();
    all.push(...await scan(page, `${mode}: resume code`));
    await page.locator('footer button[data-go=end]').click();
    all.push(...await scan(page, `${mode}: end session`));
    await page.locator('footer button[data-go=about]').click();
    all.push(...await scan(page, `${mode}: about`));
    expect(all, JSON.stringify(results, null, 2)).toEqual([]);
  });
}

test('axe: builder and Spanish home', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  const v1 = await scan(page, 'spanish: home');
  await page.getByRole('button', { name: 'Español' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('button', { name: 'Teacher pack builder' }).first().click();
  await expect(page.locator('h1')).toHaveText('Teacher pack builder', { timeout: 15_000 });
  const v2 = await scan(page, 'default: builder');
  expect([...v1, ...v2], JSON.stringify(results, null, 2)).toEqual([]);
});

test.afterAll(() => {
  mkdirSync('docs/reports', { recursive: true });
  writeFileSync('docs/reports/axe-results.json', JSON.stringify(results, null, 2));
});
