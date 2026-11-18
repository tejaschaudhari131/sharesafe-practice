import { expect, test } from '@playwright/test';
import { accessItem, answerAccessByKeyboard, doCheck, doFracCheck, getProgress, permission, startPre, tabTo } from './helpers';

test('keyboard-only: Permission to Learn pre-check → 403 intro → access practice → resume code restores the pack', async ({ page, browser }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText(/Digital Survival Curriculum/);
  await expect(page.locator('input[name=pack][value=permission]')).toBeChecked();
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip')).toBeFocused();

  await tabTo(page, 'button[data-go=start]');
  await page.keyboard.press('Enter');
  await expect(page.locator('h1')).toContainText(/question 1 of 2/, { timeout: 15_000 });
  await doCheck(page, 'pre', 1);
  await expect(page.locator('h1')).toHaveText('Pre-check done');
  await expect(page.locator('.big')).toContainText('1 of 2');
  await expect(page.locator('.mock-status')).toHaveText('403 Forbidden');
  await tabTo(page, 'button[data-go=begin-practice]');
  await page.keyboard.press('Enter');

  await expect(page.locator('h1')).toContainText('Class roster');
  const roster = accessItem('roster');
  await answerAccessByKeyboard(page, roster, true);
  await expect(page.locator('#feedback')).toContainText(/more access|Not quite/);
  await tabTo(page, '#hint-btn'); await page.keyboard.press('Enter');
  await expect(page.locator('#help ol.hints li')).toHaveCount(1);
  await answerAccessByKeyboard(page, roster);
  await expect(page.locator('#feedback')).toContainText('Correct');
  await expect(page.locator('#next-btn')).toBeFocused();

  const before = await getProgress(page);
  expect(before.packHash).toBeTruthy();
  await tabTo(page, 'button[data-go=code]'); await page.keyboard.press('Enter');
  const code = (await page.locator('#the-code').textContent())!.trim();
  expect(code).toMatch(/^[0-9A-Z]{6}-[0-9A-Z]{6}-[0-9A-Z]{6}$/);
  await expect(page.locator('.qr-svg')).toBeVisible();

  const ctx2 = await browser.newContext();
  const p2page = await ctx2.newPage();
  await p2page.goto('/');
  await p2page.getByRole('button', { name: 'I have a resume code' }).click();
  const typo = code.slice(0, 3) + (code[3] === 'A' ? 'B' : 'A') + code.slice(4);
  await p2page.getByLabel(/Resume code/).fill(typo);
  await p2page.keyboard.press('Enter');
  await expect(p2page.locator('#code-err')).toContainText('typo');
  await p2page.getByLabel(/Resume code/).fill(code.toLowerCase().replace(/-/g, ' '));
  await p2page.keyboard.press('Enter');
  await expect(p2page.locator('h1')).toHaveText('Progress restored');
  await expect(p2page.locator('main')).toContainText('Permission to Learn');
  await expect(p2page.locator('main')).toContainText('Pre-check: 1/2');
  const after = await getProgress(p2page);
  expect(after).toEqual(JSON.parse(JSON.stringify(before)));
  await ctx2.close();
});

test('QR link (#r=CODE) pre-fills restore, clears the hash, and reopens the same pack', async ({ page }) => {
  await page.goto('/');
  await startPre(page);
  await doCheck(page, 'pre', 2);
  await page.getByRole('button', { name: 'Resume code', exact: true }).click();
  const code = (await page.locator('#the-code').textContent())!.replace(/-/g, '');
  const ctx = await page.context().browser()!.newContext();
  const p = await ctx.newPage();
  await p.goto(`/#r=${code}`);
  await expect(p.locator('h1')).toHaveText('Continue with a resume code');
  expect(new URL(p.url()).hash).toBe('');
  await p.getByRole('button', { name: 'Restore progress' }).click();
  await expect(p.locator('main')).toContainText('Permission to Learn');
  await expect(p.locator('main')).toContainText('Pre-check: 2/2');
  await ctx.close();
});

test('full journey reaches before/after results', async ({ page }) => {
  await page.goto('/');
  await startPre(page);
  await doCheck(page, 'pre', 0);
  await page.getByRole('button', { name: 'Continue the lesson' }).click();
  await page.getByRole('button', { name: 'Take the post-check' }).click();
  await doCheck(page, 'post', 2);
  await expect(page.locator('h1')).toHaveText('Your results');
  await expect(page.locator('.mastery')).toBeVisible();
  await expect(page.locator('.mastery .big')).toContainText('0/2');
  await expect(page.locator('.mastery .big')).toContainText('2/2');
  await expect(page.locator('.mastery .big')).toContainText('+2');
  await expect(page.locator('#completion-code')).toHaveText(/^[0-9A-Z]{6}-[0-9A-Z]{6}-[0-9A-Z]{6}$/);
});

test('works offline after first load, including a lazy pack and the QR chunk', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('#sw-status')).toHaveText('Ready to work offline.', { timeout: 15000 });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('h1')).toHaveText(/Digital Survival Curriculum/);
  await expect(page.locator('#net')).toHaveText(/offline/);
  await startPre(page);
  await expect(page.locator('h1')).toContainText('question 1 of 2');
  await page.goto('/?from=offline');
  await expect(page.locator('h1')).toBeVisible();
  await page.getByRole('button', { name: 'Resume code', exact: true }).click();
  await expect(page.locator('.qr-svg')).toBeVisible();
  await context.setOffline(false);
});

test('leave-no-trace: default uses session storage only; Wipe session clears storage and offline copy', async ({ page }) => {
  await page.goto('/');
  await startPre(page);
  await doCheck(page, 'pre', 2);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(await page.evaluate(() => sessionStorage.getItem('sharesafe:v2'))).toBeTruthy();
  await expect(page.locator('#storage-badge')).toHaveAttribute('data-persistent-bytes', '0');
  await expect(page.locator('#storage-badge')).toContainText(/0 bytes/);

  await page.getByRole('link', { name: 'ShareSafe Practice' }).click();
  await page.getByLabel(/Save progress on this device/).check();
  expect(await page.evaluate(() => localStorage.getItem('sharesafe:v2'))).toBeTruthy();
  await expect(page.locator('#sw-status')).toHaveText('Ready to work offline.', { timeout: 15000 });
  await page.evaluate(() => new Promise((r) => { const q = indexedDB.open('leftover'); q.onsuccess = () => { q.result.close(); r(null); }; }));

  await page.getByRole('button', { name: 'Wipe session' }).click();
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

test('accessibility toggles: text size, high contrast, plain language, and Spanish', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Text size/ }).click();
  await expect(page.locator('html')).toHaveClass(/lt1/);
  await page.getByRole('button', { name: 'High contrast' }).click();
  await expect(page.locator('html')).toHaveClass(/hc/);
  await expect(page.getByRole('button', { name: 'High contrast' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Plain language' }).click();
  await expect(page.locator('h1')).toHaveText('Learn digital safety. No sign-up.');
  await expect(page.getByRole('button', { name: 'Plain language' })).toBeFocused();
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.locator('h1')).toHaveText(/Currículo de supervivencia digital|Aprende seguridad digital/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
});

test('Spot the Scam and Fractions packs load from the home picker', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[name=pack][value=scam]').check();
  await startPre(page);
  await expect(page.locator('h1')).toContainText('question 1 of 2');
  await expect(page.locator('main')).toContainText(/scholarship|beca|won/i);
  await page.getByRole('link', { name: 'ShareSafe Practice' }).click();
  await page.locator('input[name=pack][value=fractions]').check();
  await startPre(page);
  await doFracCheck(page, 'pre', 2);
  await expect(page.locator('h1')).toHaveText('Pre-check done');
  await expect(page.locator('.big')).toContainText('2 of 2');
});

test('teacher pack builder: byte counter, export, and try a pack', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Teacher pack builder' }).first().click();
  await expect(page.locator('h1')).toHaveText('Teacher pack builder', { timeout: 15_000 });
  await page.locator('#b-title').fill('Library Wi-Fi quiz');
  await page.locator('#b-id').fill('wifi-quiz');
  // Fill the first pre, practice and post prompts + two choices so the pack validates.
  const fillQ = async (sec: string, prompt: string) => {
    const card = page.locator(`[data-sec=${sec}] .q-card`).first();
    await card.locator('[data-f=prompt]').fill(prompt);
    await card.locator('[data-f=c0]').fill('Yes');
    await card.locator('[data-f=c1]').fill('No');
  };
  await fillQ('pre', 'Should you share your password on library Wi-Fi?');
  await fillQ('practice', 'A classmate asks for your login on a shared PC. What do you do?');
  await fillQ('post', 'Is a public computer a good place to stay signed in?');
  await expect(page.locator('.byte')).toContainText(/Pack JSON: [1-9]/);
  await expect(page.locator('.byte')).toContainText(/printed QR|Share link: [1-9]/);
  await expect(page.locator('.byte')).not.toContainText('too large');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download pack JSON' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/wifi-quiz\.json/);
  await page.getByRole('button', { name: 'Try this pack now' }).click();
  await expect(page.locator('h1')).toContainText('question 1 of 1', { timeout: 15_000 });
  await expect(page.locator('main')).toContainText('library Wi-Fi');
});

test('Teacher Verify decodes pack id and pre/post scores from a completion code', async ({ page }) => {
  await page.goto('/');
  await startPre(page);
  await doCheck(page, 'pre', 1);
  await page.getByRole('button', { name: 'Continue the lesson' }).click();
  await page.getByRole('button', { name: 'Take the post-check' }).click();
  await doCheck(page, 'post', 2);
  await expect(page.locator('.mastery')).toBeVisible();
  const code = (await page.locator('#completion-code').textContent())!.trim();
  await page.getByRole('button', { name: 'Teacher pack builder' }).first().click();
  await expect(page.locator('h1')).toHaveText('Teacher pack builder', { timeout: 15_000 });
  await expect(page.locator('#verify-h')).toHaveText('Teacher Verify');
  await page.locator('#verify-code').fill(code);
  await page.getByRole('button', { name: 'Verify code' }).click();
  const out = page.locator('#verify-out');
  await expect(out).toContainText(/Permission to Learn/);
  await expect(out).toContainText(/Pre-check 1\/2/);
  await expect(out).toContainText(/Post-check 2\/2/);
  await expect(out).toContainText(/not forgery-proof|typos|checksum|personal data/i);
});

test('double Escape opens wipe confirmation and is announced', async ({ page }) => {
  await page.goto('/');
  await startPre(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('#escape-live')).toHaveText(/Press Escape again/);
  await page.keyboard.press('Escape');
  await expect(page.locator('h1')).toHaveText('End session and wipe this device');
  await expect(page.locator('#escape-live')).toHaveText(/Opening the wipe confirmation/);
});
