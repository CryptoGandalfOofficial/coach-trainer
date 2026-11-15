import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page, type Route } from "@playwright/test";

const user = {
  id: 9001,
  openId: "e2e-mock-user",
  name: "E2E Mock User",
  email: "e2e-mock@example.test",
  loginMethod: "e2e",
  role: "user",
};

const skillTrends = JSON.stringify([
  { skill: "behavioral", score: 6, attempts: 3 },
]);

const weeklySummary = {
  id: 9001,
  userId: user.id,
  weekStart: "2026-10-04T00:00:00.000Z",
  attempts: 3,
  averageScore: 6,
  minutesPracticed: 75,
  summaryText: "Mock weekly progress for protected chart testing.",
  skillTrends,
  retentionRate: 80,
  recommendedModules: JSON.stringify([
    {
      skill: "behavioral",
      score: 6,
      title: "Evidence-backed story lab",
      reason: "Make impact and outcomes more concrete.",
      action: "Rewrite one story with measurable results.",
    },
  ]),
};

const comparison = {
  current: weeklySummary,
  previousWeeks: [],
  trendSeries: Array.from({ length: 10 }, (_, index) => ({
    weekStart: new Date(Date.UTC(2026, 9, 4 - index * 7)).toISOString(),
    skillTrends: JSON.stringify([
      {
        skill: "behavioral",
        score: 5 + (index % 4),
        attempts: 2 + (index % 3),
      },
    ]),
  })),
  peerAverageScore: 6.2,
  peerAverageMinutes: 60,
  peerCount: 8,
  peerAverageBySkill: [{ skill: "behavioral", score: 6.4, attempts: 8 }],
};

const progress = {
  profile: {
    preferredLanguage: "en",
    country: "Testland",
    targetRole: "Test role",
    experienceLevel: "intermediate",
    weeklyMinutes: 120,
    preferredModuleDifficulty: "intermediate",
    preferredModuleDuration: 30,
  },
  totals: { attempts: 3, averageScore: 6 },
  recentAttempts: [],
};

const session = {
  sessionId: 9001,
  mode: "focused",
  focus: "Communication",
  difficulty: "intermediate",
  sessions: 4,
  interviewType: "behavioral",
  timeline: "1-week",
  durationMinutes: 30,
};
async function fulfillTrpc(route: Route) {
  const path =
    new URL(route.request().url()).pathname.split("/api/trpc/")[1] ?? "";
  const values: Record<string, unknown> = {
    "auth.me": user,
    "profile.progress": progress,
    "profile.weeklySummary": weeklySummary,
    "profile.weeklyComparison": comparison,
    "profile.savedDateRanges": [],
    "coach.start": session,
  };
  const responsePaths = path.split(",");
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(
      responsePaths.map(responsePath => ({
        result: { data: { json: values[responsePath] ?? null } },
      }))
    ),
  });
}

async function installMockAuth(page: Page) {
  await page.route("**/api/trpc/**", fulfillTrpc);
}

test.describe("mobile trend chart gestures with mock authentication", () => {
  test.beforeEach(async ({ page }) => {
    await installMockAuth(page);
    await page.goto("/?from_e2e=mock");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Behavioral interview/i }).click();
    await page.getByRole("button", { name: /1 week/i }).click();
    await page.getByRole("button", { name: /Start my coaching plan/i }).click();
    await expect(page.getByText("Your coaching room")).toBeVisible();
  });
  test("supports swipe navigation and reset view", async ({ page }) => {
    const chart = page.getByTestId("skill-trend-chart");
    await expect(chart).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reset trend chart view" })
    ).toBeVisible();
    await expect(chart).toHaveScreenshot("mobile-trend-chart-mock.png", {
      animations: "disabled",
    });
    const position = page.getByTestId("chart-range-position");
    const before = await position.getAttribute("data-window");
    await chart.evaluate(node => {
      const touch = (x: number, y: number) =>
        new Touch({
          identifier: Date.now(),
          target: node,
          clientX: x,
          clientY: y,
        });
      node.dispatchEvent(
        new TouchEvent("touchstart", {
          bubbles: true,
          touches: [touch(320, 400)],
          changedTouches: [touch(320, 400)],
        })
      );
      node.dispatchEvent(
        new TouchEvent("touchend", {
          bubbles: true,
          touches: [],
          changedTouches: [touch(80, 400)],
        })
      );
    });
    await expect
      .poll(() => position.getAttribute("data-window"))
      .not.toBe(before);
    await expect(page.locator("div[aria-live='polite']")).toContainText(
      "Moving to chart window"
    );
    await page.getByRole("button", { name: "Reset trend chart view" }).click();
    await expect(position).toHaveAttribute("data-window", "1");
    await expect(page.locator("div[aria-live='polite']")).toContainText(
      "Chart view reset"
    );
  });

  test("supports pinch zoom on a touch viewport", async ({ page }) => {
    const chart = page.getByTestId("skill-trend-chart");
    await expect(chart).toBeVisible();
    await expect(page.getByText("1× zoom")).toBeVisible();
    await expect(chart).toHaveScreenshot(
      "mobile-trend-chart-before-pinch-mock.png",
      { animations: "disabled" }
    );
    await chart.evaluate(node => {
      const touch = (x: number, y: number, id: number) =>
        new Touch({ identifier: id, target: node, clientX: x, clientY: y });
      const first = touch(120, 400, 1);
      const second = touch(240, 400, 2);
      node.dispatchEvent(
        new TouchEvent("touchstart", {
          bubbles: true,
          touches: [first, second],
          changedTouches: [first, second],
        })
      );
      const expanded = touch(80, 400, 1);
      const expandedSecond = touch(280, 400, 2);
      node.dispatchEvent(
        new TouchEvent("touchmove", {
          bubbles: true,
          touches: [expanded, expandedSecond],
          changedTouches: [expanded, expandedSecond],
        })
      );
      node.dispatchEvent(
        new TouchEvent("touchend", {
          bubbles: true,
          touches: [],
          changedTouches: [expanded, expandedSecond],
        })
      );
    });
    await expect(page.getByText("2× zoom")).toBeVisible();
    await expect(page.locator("div[aria-live='polite']")).toContainText(
      "Zoom 2 times"
    );
  });

  test("authenticated chart has no serious or critical axe violations", async ({
    page,
  }) => {
    const results = await new AxeBuilder({ page })
      .include('[data-testid="skill-trend-chart"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    const seriousOrCritical = results.violations.filter(violation =>
      ["serious", "critical"].includes(violation.impact ?? "")
    );
    expect(
      seriousOrCritical,
      JSON.stringify(seriousOrCritical, null, 2)
    ).toEqual([]);
  });
});
