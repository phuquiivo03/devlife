import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const pinnedChromium =
  "/home/quivo/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://127.0.0.1:4317",
    trace: "on-first-retry",
    // Playwright 1.64 dropped ubuntu-20.04 browser builds; pin the last
    // cached chromium that still runs here (same pin as capture-poses.mjs).
    launchOptions: existsSync(pinnedChromium)
      ? { executablePath: pinnedChromium }
      : {},
  },
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:4317",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
