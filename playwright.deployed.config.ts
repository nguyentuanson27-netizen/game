import { defineConfig } from "@playwright/test";

// Checks the live GitHub Pages site (no local server). Used by the deploy workflow:
//   DEPLOYED_URL=https://nguyentuanson27-netizen.github.io/game/ EXPECTED_SHA=<sha> npm run test:deployed
const deployedUrl = process.env.DEPLOYED_URL ?? "https://nguyentuanson27-netizen.github.io/game/";

export default defineConfig({
  testDir: "tests/deployed",
  testMatch: "**/*.spec.ts",
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: deployedUrl.endsWith("/") ? deployedUrl : `${deployedUrl}/`,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    trace: "retain-on-failure",
  },
  // Chromium only: offline is simulated with context.setOffline, which WebKit does not honour
  // for service-worker reloads (see tests/e2e/smoke.spec.ts). WebKit stays covered by tests/e2e.
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
