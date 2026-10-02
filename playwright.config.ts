import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:3000",
    browserName: "chromium",
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    ...devices["Pixel 5"],
    hasTouch: true,
    isMobile: true,
    storageState: process.env.E2E_STORAGE_STATE || undefined,
    trace: "retain-on-failure",
  },
  reporter: [["list"]],
});
