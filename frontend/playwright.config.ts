import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    // A deterministic browser locale: the app maps it to English, so the
    // specs that assert the English UI hold regardless of the host locale.
    locale: 'en-US',
    trace: 'on-first-retry',
   },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
     },
   ],
})
