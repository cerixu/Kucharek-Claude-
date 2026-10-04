import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: true,
  workers: process.env.CI ? 4 : 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'python3 -m http.server 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 10000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], serviceWorkers: 'block' }, testIgnore: /(?:pwa|startup|design-34e|user-mobile|stage-44)\.spec\.js/ },
    { name: 'pwa', use: { ...devices['Desktop Chrome'], serviceWorkers: 'allow' }, testMatch: /(?:pwa|stage-44)\.spec\.js/ },
    { name: 'webkit-mobile', use: { ...devices['iPhone 13'], serviceWorkers: 'allow' }, testMatch: /(?:startup|user-mobile)\.spec\.js/ },
    { name: 'design-mobile', use: { ...devices['iPhone 13'], serviceWorkers: 'allow' }, testMatch: /design-34e\.spec\.js/ },
  ],
});
