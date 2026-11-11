import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// Cold first load under emulated slow networks (Chrome DevTools Protocol throttling).
const profiles = [
  { name: 'Regular 2G (250 kbps, 300 ms RTT)', down: 250, up: 50, latency: 300 },
  { name: 'Slow 3G (400 kbps, 400 ms RTT)', down: 400, up: 400, latency: 400 },
];
const out: Record<string, unknown> = {};

for (const p of profiles) {
  test(`cold load on ${p.name}`, async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: p.latency, downloadThroughput: (p.down * 1000) / 8, uploadThroughput: (p.up * 1000) / 8,
    });
    let bytes = 0;
    page.on('response', async (r) => { try { bytes += (await r.body()).length; } catch { /* ignore */ } });
    const t0 = Date.now();
    await page.goto('/', { waitUntil: 'commit' });
    await expect(page.getByRole('button', { name: 'Start the pre-check' })).toBeVisible({ timeout: 20000 });
    const usable = Date.now() - t0;
    await expect(page.locator('#sw-status')).toHaveText('Ready to work offline.', { timeout: 30000 });
    const offlineReady = Date.now() - t0;
    out[p.name] = { usableMs: usable, offlineReadyMs: offlineReady, uncompressedBytesSeen: bytes };
    expect(usable).toBeLessThan(5000);
    await ctx.close();
  });
}
test.afterAll(() => { mkdirSync('docs/reports', { recursive: true }); writeFileSync('docs/reports/throttle-results.json', JSON.stringify(out, null, 2)); });
