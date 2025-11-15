import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run tests serially to avoid port conflicts
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 2 : 0,
  workers: 1, // One worker to avoid conflicts
  reporter: [['list', { printSteps: true }]],
  timeout: 30000,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start dev servers before running tests
  webServer: [
    {
      command: 'npm run dev:server',
      url: 'http://localhost:3000/health',
      reuseExistingServer: !process.env['CI'],
      timeout: 10000,
      cwd: '../..',
    },
    {
      command: 'npm run dev:client',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env['CI'],
      timeout: 10000,
      cwd: '../..',
    },
  ],
});
