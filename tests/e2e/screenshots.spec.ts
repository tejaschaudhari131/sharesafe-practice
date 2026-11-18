// Generates docs/screenshots/*. Run with: SCREENSHOTS=1 npx playwright test screenshots
import { expect, test, type Page } from '@playwright/test';
import { accessItem, answerAccessByKeyboard, doCheck, startPre } from './helpers';

test.skip(!process.env.SCREENSHOTS, 'set SCREENSHOTS=1 to regenerate screenshots');

const dir = 'docs/screenshots';
const shot = (page: Page, name: string) => page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });

for (const [label, viewport] of [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 360, height: 740 }]] as const) {
  test(`screenshots ${label}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: label === 'mobile' ? 2 : 1, hasTouch: label === 'mobile' });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.locator('#sw-status')).toHaveText('Ready to work offline.', { timeout: 15000 });
    await shot(page, `${label}-01-home`);
    await startPre(page);
    await shot(page, `${label}-02-precheck`);
    await doCheck(page, 'pre', 3);
    await shot(page, `${label}-03-403-intro`);
    await page.locator('button[data-go=begin-practice]').click();
    await page.locator('#hint-btn').click(); await page.locator('#hint-btn').click();
    await shot(page, `${label}-04-access-hints`);
    await answerAccessByKeyboard(page, accessItem('roster'));
    await shot(page, `${label}-05-correct-feedback`);
    await page.locator('main button[data-go=code]').click();
    await page.locator('.qr-svg').waitFor();
    await shot(page, `${label}-06-resume-code-qr`);
    if (label === 'desktop') await page.locator('.qr-svg').screenshot({ path: `${dir}/qr-only.png` });
    await page.locator('footer button[data-go=end]').click();
    await shot(page, `${label}-07-end-session`);
    await page.locator('#wipe').click();
    await shot(page, `${label}-08-session-ended`);
    await page.locator('button[data-go=home]').click();
    await page.locator('#t-size').click(); await page.locator('#t-size').click();
    await page.locator('#t-contrast').click(); await page.locator('#t-plain').click();
    await startPre(page);
    await shot(page, `${label}-09-high-contrast-large-plain`);
    await page.locator('#t-size').click(); await page.locator('#t-contrast').click(); await page.locator('#t-plain').click();
    await page.reload();
    await ctx.setOffline(true);
    await page.reload();
    await expect(page.locator('#net')).toBeVisible();
    await shot(page, `${label}-10-offline`);
    await ctx.close();
  });
}

test('results, builder, Spanish, and scam (desktop)', async ({ page }) => {
  await page.goto('/');
  await startPre(page);
  await doCheck(page, 'pre', 0);
  await page.locator('button[data-go=begin-practice]').click();
  await page.locator('main button[data-go=post]').click();
  await doCheck(page, 'post', 2);
  await shot(page, 'desktop-11-results-before-after');

  await page.goto('/');
  await page.getByRole('button', { name: 'Teacher pack builder' }).first().click();
  await expect(page.locator('h1')).toHaveText('Teacher pack builder', { timeout: 15_000 });
  await shot(page, 'desktop-12-builder');

  await page.goto('/');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await shot(page, 'desktop-13-spanish');

  await page.getByRole('button', { name: 'Español' }).click();
  await page.locator('input[name=pack][value=scam]').check();
  await startPre(page);
  await doCheck(page, 'pre', 2, (await import('../../src/packs/scam')).pack.pre);
  await page.locator('button[data-go=begin-practice]').click();
  await expect(page.locator('.mail')).toBeVisible();
  await shot(page, 'desktop-14-scam-message');

  await page.goto('/');
  await page.getByRole('button', { name: 'Teacher pack builder' }).first().click();
  await expect(page.locator('#verify-h')).toHaveText('Teacher Verify', { timeout: 15_000 });
  await shot(page, 'desktop-15-teacher-verify');

  await page.goto('/');
  await expect(page.locator('#storage-badge')).toBeVisible();
  await shot(page, 'desktop-16-storage-badge');

  await page.getByRole('button', { name: 'English' }).click();
  await page.locator('input[name=pack][value=fractions]').check();
  await startPre(page);
  await expect(page.locator('h1')).toContainText(/pregunta 1|Prueba inicial|question 1/i);
  await shot(page, 'desktop-17-spanish-fractions');
});
