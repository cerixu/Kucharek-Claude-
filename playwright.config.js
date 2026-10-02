import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'python3 -m http.server 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 10000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], serviceWorkers: 'block' } },
    { name: 'pwa', use: { ...devices['Desktop Chrome'], serviceWorkers: 'allow' }, testMatch: /pwa\.spec\.js/ },
  ],
});
