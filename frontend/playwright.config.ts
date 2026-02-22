import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './testsprite_tests',
  
  // Fail fast in CI, run all in development
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  
  // Reporter
  reporter: [['html', { open: 'never' }], ['list']],
  
  // Global timeout settings
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    // Headless by default; use PWDEBUG=1 to open browser
    headless: true,
    // Slow down for debugging: slowMo: 500,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start Vite dev server before running tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
