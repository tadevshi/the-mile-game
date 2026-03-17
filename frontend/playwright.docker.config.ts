import { defineConfig, devices } from '@playwright/test';

/**
 * Docker-specific Playwright config for E2E testing against the Docker nginx.
 * 
 * Usage:
 *   cd frontend && npx playwright test --config=playwright.docker.config.ts --reporter=list
 * 
 * Prerequisites:
 *   - Docker must be running with: docker-compose up -d
 *   - Frontend built inside Docker (production build)
 *   - Backend running inside Docker
 *   - Nginx exposed at localhost:8081
 * 
 * Key differences from playwright.config.ts:
 *   - Uses localhost:8081 (Docker nginx) instead of localhost:5173 (Vite dev server)
 *   - No webServer (assumes Docker is already running)
 *   - Routes like /quiz, /ranking, /thank-you are 307-redirected to /event/mile-2026/*
 */
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
    // Docker nginx port (exposed via docker-compose)
    baseURL: 'http://localhost:8081',
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

  // NO webServer - assumes Docker is already running with:
  // docker-compose up -d
  // The nginx at localhost:8081 proxies to backend internally.
});
