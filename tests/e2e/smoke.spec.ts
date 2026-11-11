import { expect, test } from '@playwright/test';
import { answerByKeyboard, currentPracticeProblem, doCheck, getProgress, tabTo } from './helpers';

test('keyboard-only: pre-check → practice with hint → resume code → restore on a "new device"', async ({ page, browser }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText(/Practice fractions/);
  // Skip link is the first Tab stop.
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip')).toBeFocused();

  await tabTo(page, 'button[data-go=start]');
  await page.keyboard.press('Enter');
  await doCheck(page, 'pre', 4); // 4 right, 2 wrong
  await expect(page.locator('h1')).toHaveText('Pre-check done');
  await expect(page.locator('.big')).toContainText('4 of 6');
  await tabTo(page, 'button[data-go=begin-practice]');
  await page.keyboard.press('Enter');

  // Practice: wrong answer → feedback; hint; then correct.
  await expect(page.locator('h1')).toContainText('Equivalent fractions');
  const p = await currentPracticeProblem(page, 'equiv');
  await answerByKeyboard(page, p, true);
  await expect(page.locator('#feedback')).toContainText('Not quite');
  await tabTo(page, '#hint-btn'); await page.keyboard.press('Enter');
  await expect(page.locator('#help ol.hints li')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(page.locator('#help ol.hints li')).toHaveCount(2);
  await expect(page.locator('#help svg[role=img]').first()).toHaveAttribute('aria-label', /equal parts/);
  await answerByKeyboard(page, p);
  await expect(page.locator('#feedback')).toContainText('Correct');
  await expect(page.locator('#next-btn')).toBeFocused();
  await page.keyboard.press('Enter');

  // Practise another skill via the skill switcher.
  await tabTo(page, 'button[data-skill=addsub]'); await page.keyboard.press('Enter');
  const p2 = await currentPracticeProblem(page, 'addsub');
  await answerByKeyboard(page, p2);
  await expect(page.locator('#feedback')).toContainText('Correct');

  const before = await getProgress(page);
  await tabTo(page, 'button[data-go=code]'); await page.keyboard.press('Enter');
  const code = (await page.locator('#the-code').textContent())!.trim();
  expect(code).toMatch(/^[0-9A-Z]{6}-[0-9A-Z]{6}-[0-9A-Z]{6}$/);
  await expect(page.locator('.qr-svg')).toBeVisible();

  // New device = fresh browser context with empty storage.
  const ctx2 = await browser.newContext();
  const p2page = await ctx2.newPage();
  await p2page.goto('/');
  await p2page.getByRole('button', { name: 'I have a resume code' }).click();
  // A typo is caught with a helpful message.
  const typo = code.slice(0, 3) + (code[3] === 'A' ? 'B' : 'A') + code.slice(4);
  await p2page.getByLabel(/Resume code/).fill(typo);
  await p2page.keyboard.press('Enter');
  await expect(p2page.locator('#code-err')).toContainText('typo');
  await p2page.getByLabel(/Resume code/).fill(code.toLowerCase().replace(/-/g, ' '));
  await p2page.keyboard.press('Enter');
  await expect(p2page.locator('h1')).toHaveText('Progress restored');
  await expect(p2page.locator('main')).toContainText('Pre-check: 4/6');
  const after = await getProgress(p2page);
  expect(after).toEqual(JSON.parse(JSON.stringify(before)));
  await ctx2.close();
});

test('QR link (#r=CODE) pre-fills restore and clears the code from the address bar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start the pre-check' }).click();
  await doCheck(page, 'pre', 6);
  await page.getByRole('button', { name: 'Resume code', exact: true }).click();
  const code = (await page.locator('#the-code').textContent())!.replace(/-/g, '');
  const ctx = await page.context().browser()!.newContext();
  const p = await ctx.newPage();
  await p.goto(`/#r=${code}`);
  await expect(p.locator('h1')).toHaveText('Continue with a resume code');
  expect(new URL(p.url()).hash).toBe('');
  await p.getByRole('button', { name: 'Restore progress' }).click();
  await expect(p.locator('main')).toContainText('Pre-check: 6/6');
  await ctx.close();
});

test('full journey reaches before/after results', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start the pre-check' }).click();
  await doCheck(page, 'pre', 2);
  await page.getByRole('button', { name: 'Start practising' }).click();
  await page.getByRole('button', { name: 'Take the post-check' }).click();
  await doCheck(page, 'post', 5);
  await expect(page.locator('h1')).toHaveText('Your results');
  await expect(page.locator('.big')).toContainText('2/6');
  await expect(page.locator('.big')).toContainText('5/6');
  await expect(page.locator('.big')).toContainText('+3');
});

test('works offline after first load', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('#sw-status')).toHaveText('Ready to work offline.', { timeout: 15000 });
  await page.reload(); // ensure page is controlled by the SW
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('h1')).toHaveText(/Practice fractions/);
  await expect(page.locator('#net')).toHaveText(/offline/);
  await page.getByRole('button', { name: 'Start the pre-check' }).click();
  await expect(page.locator('h1')).toContainText('question 1 of 6');
  // A deep link also works offline (navigation fallback to cached index.html).
  await page.goto('/?from=offline');
  await expect(page.locator('h1')).toBeVisible();
  // The lazily loaded QR chunk is precached too.
  await page.getByRole('button', { name: 'Resume code', exact: true }).click();
  await expect(page.locator('.qr-svg')).toBeVisible();
  await context.setOffline(false);
});

test('leave-no-trace: default uses session storage only; End session wipes storage and offline copy', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start the pre-check' }).click();
  await doCheck(page, 'pre', 3);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(await page.evaluate(() => sessionStorage.getItem('sharesafe:v1'))).toBeTruthy();

  // Opt in to saving on device → localStorage used.
  await page.getByRole('link', { name: 'ShareSafe Practice' }).click();
  await page.getByLabel(/Save progress on this device/).check();
  expect(await page.evaluate(() => localStorage.getItem('sharesafe:v1'))).toBeTruthy();
  await expect(page.locator('#sw-status')).toHaveText('Ready to work offline.', { timeout: 15000 });
  // An IndexedDB database (simulating anything left behind) gets removed too.
  await page.evaluate(() => new Promise((r) => { const q = indexedDB.open('leftover'); q.onsuccess = () => { q.result.close(); r(null); }; }));

  await page.getByRole('button', { name: 'End session' }).click();
  await expect(page.locator('h1')).toHaveText('End session and wipe this device');
  await page.getByLabel(/Also remove the offline copy/).check();
  await page.getByRole('button', { name: 'Yes, wipe and end session' }).click();
  await expect(page.locator('h1')).toHaveText('Session ended');
  await expect(page.locator('main [role=status]')).toContainText('offline cache');
  const state = await page.evaluate(async () => ({
    ls: localStorage.length, ss: sessionStorage.length,
    caches: (await caches.keys()).length,
    sws: (await navigator.serviceWorker.getRegistrations()).length,
    dbs: (await indexedDB.databases()).length,
  }));
  expect(state).toEqual({ ls: 0, ss: 0, caches: 0, sws: 0, dbs: 0 });
});

test('accessibility toggles: text size, high contrast, plain language', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Text size/ }).click();
  await expect(page.locator('html')).toHaveClass(/lt1/);
  await page.getByRole('button', { name: 'High contrast' }).click();
  await expect(page.locator('html')).toHaveClass(/hc/);
  await expect(page.getByRole('button', { name: 'High contrast' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Plain language' }).click();
  await expect(page.locator('h1')).toHaveText('Practice fractions. No sign-up.');
  await expect(page.getByRole('button', { name: 'Plain language' })).toBeFocused();
});
