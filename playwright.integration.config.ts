import { defineConfig, devices } from "@playwright/test";

// E2E backend MUST run in STS on 8081 using the 'e2e' profile.
// Never reuse an existing frontend: the test runner owns a 5174 instance
// with Vite mode=e2e, whose /api proxy points exclusively to 8081.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.integration.spec.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --mode e2e --host 127.0.0.1 --port 5174 --strictPort",
    url: "http://127.0.0.1:5174/trips",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
