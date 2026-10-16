import { defineConfig, devices } from "@playwright/test";

// Fast browser smoke tests: mocked API; do not require a running backend.
export default defineConfig({
  testDir: "./e2e",
  testIgnore: "**/*.integration.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort",
    url: "http://127.0.0.1:5173/trips",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
