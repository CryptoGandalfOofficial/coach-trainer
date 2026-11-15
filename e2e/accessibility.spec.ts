import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

test.describe("accessibility", () => {
  test("landing page has no serious or critical violations", async ({ page }) => {
    await page.goto("/?from_e2e=1");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    const seriousOrCritical = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    );
    expect(seriousOrCritical, JSON.stringify(seriousOrCritical, null, 2)).toEqual([]);
  });

  test("authenticated trend chart has no serious or critical violations", async ({ page }) => {
    await page.goto("/?from_e2e=1");
    await page.waitForLoadState("networkidle");

    const chart = page.getByTestId("skill-trend-chart");
    if (!(await chart.count())) {
      test.skip(true, "Authenticated trend chart data is required; provide E2E_STORAGE_STATE");
    }

    const results = await new AxeBuilder({ page })
      .include('[data-testid="skill-trend-chart"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    const seriousOrCritical = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    );
    expect(seriousOrCritical, JSON.stringify(seriousOrCritical, null, 2)).toEqual([]);
  });
});
