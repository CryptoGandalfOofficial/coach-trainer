import { test, expect } from "@playwright/test";

test.describe("mobile trend chart gestures", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?from_e2e=1");
    await page.waitForLoadState("networkidle");
  });

  test("supports swipe navigation and reset view", async ({ page }) => {
    const chart = page.getByTestId("skill-trend-chart");
    if (!(await chart.count())) test.skip(true, "Authenticated trend chart data is required; provide E2E_STORAGE_STATE");
    await expect(page.getByRole("button", { name: "Reset trend chart view" })).toBeVisible();
    const position = page.getByTestId("chart-range-position");
    const before = await position.getAttribute("data-window");
    await chart.evaluate((node) => {
      const touch = (x: number, y: number) => new Touch({ identifier: Date.now(), target: node, clientX: x, clientY: y });
      node.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [touch(320, 400)], changedTouches: [touch(320, 400)] }));
      node.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [], changedTouches: [touch(80, 400)] }));
    });
    await expect.poll(() => position.getAttribute("data-window")).not.toBe(before);
    await page.getByRole("button", { name: "Reset trend chart view" }).click();
    await expect(position).toHaveAttribute("data-window", "1");
  });

  test("supports pinch zoom on a touch viewport", async ({ page }) => {
    const chart = page.getByTestId("skill-trend-chart");
    if (!(await chart.count())) test.skip(true, "Authenticated trend chart data is required; provide E2E_STORAGE_STATE");
    await expect(page.getByText("1× zoom")).toBeVisible();
    await chart.evaluate((node) => {
      const touch = (x: number, y: number, id: number) => new Touch({ identifier: id, target: node, clientX: x, clientY: y });
      const first = touch(120, 400, 1);
      const second = touch(240, 400, 2);
      node.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [first, second], changedTouches: [first, second] }));
      const expanded = touch(80, 400, 1);
      const expandedSecond = touch(280, 400, 2);
      node.dispatchEvent(new TouchEvent("touchmove", { bubbles: true, touches: [expanded, expandedSecond], changedTouches: [expanded, expandedSecond] }));
      node.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [], changedTouches: [expanded, expandedSecond] }));
    });
    await expect(page.getByText("2× zoom")).toBeVisible();
  });
});
