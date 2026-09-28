import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';
import { BASE_URL } from './tests/utils/env';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // The public demo is shared and rate-sensitive; run serially so parallel load doesn't slow it down.
  workers: 1,
  // The public demo can take 60s+ to serve its JS bundle on a cold load; budget generously.
  timeout: 180_000,
  expect: { timeout: 30_000 },
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['allure-playwright', { resultsDir: 'allure-results' }],
    process.env.CI ? ['github'] : ['list'],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
