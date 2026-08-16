import { defineConfig, devices } from '@playwright/test';

const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: 1,
  reporter: isCi
    ? [['line'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  expect: {
    timeout: 30_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: isCi ? 'retain-on-failure' : 'off',
    ...(!isCi ? { channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' } : {}),
  },
  projects: [
    {
      name: isCi ? 'chromium' : 'chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
