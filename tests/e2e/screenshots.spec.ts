// Generates docs/screenshots/*. Run with: SCREENSHOTS=1 npx playwright test screenshots
import { expect, test, type Page } from '@playwright/test';
import { answerByKeyboard, currentPracticeProblem, doCheck } from './helpers';

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
    await page.locator('button[data-go=start]').click();
    await shot(page, `${label}-02-precheck`);
    await doCheck(page, 'pre', 3);
    await page.locator('button[data-go=begin-practice]').click();
    await page.locator('button[data-skill=addsub]').click();
    await page.locator('#hint-btn').click(); await page.locator('#hint-btn').click();
    await page.locator('#a-n').focus();
    await shot(page, `${label}-03-practice-hints`);
    await page.locator('#steps-btn').click();
    await shot(page, `${label}-04-worked-steps`);
    await page.locator('#next-btn').click();
    await answerByKeyboard(page, await currentPracticeProblem(page, 'addsub'));
    await shot(page, `${label}-05-correct-feedback`);
    await page.locator('main button[data-go=code]').click();
    await page.locator('.qr-svg').waitFor();
    await shot(page, `${label}-06-resume-code-qr`);
    if (label === 'desktop') await page.locator('.qr-svg').screenshot({ path: `${dir}/qr-only.png` });
    await page.locator('footer button[data-go=end]').click();
    await shot(page, `${label}-07-end-session`);
    await page.locator('#wipe').click();
    await shot(page, `${label}-08-session-ended`);
    // High contrast + extra-large text + plain language
    await page.locator('button[data-go=home]').click();
    await page.locator('#t-size').click(); await page.locator('#t-size').click();
    await page.locator('#t-contrast').click(); await page.locator('#t-plain').click();
    await page.locator('button[data-go=start]').click();
    await shot(page, `${label}-09-high-contrast-large-plain`);
    await page.locator('#t-size').click(); await page.locator('#t-contrast').click(); await page.locator('#t-plain').click();
    // Offline
    await page.reload();
    await ctx.setOffline(true);
    await page.reload();
    await expect(page.locator('#net')).toBeVisible();
    await shot(page, `${label}-10-offline`);
    await ctx.close();
  });
}

test('results view (desktop)', async ({ page }) => {
  await page.goto('/');
  await page.locator('button[data-go=start]').click();
  await doCheck(page, 'pre', 2);
  await page.locator('button[data-go=begin-practice]').click();
  await page.locator('main button[data-go=post]').click();
  await doCheck(page, 'post', 6);
  await shot(page, 'desktop-11-results-before-after');
});
