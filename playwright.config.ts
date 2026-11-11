import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173', channel: 'chrome', viewport: { width: 1280, height: 800 } },
  webServer: { command: 'npx serve -s dist -l 4173 --no-clipboard', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 30_000 },
});
