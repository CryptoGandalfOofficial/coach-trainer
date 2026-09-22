import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  createCoachingSession: vi.fn().mockResolvedValue(undefined),
  createWeeklySummaries: vi.fn().mockResolvedValue({ created: 4, weekStart: new Date("2026-09-20") }),
  createWeeklySummaryForUser: vi.fn().mockResolvedValue({ summaryText: "You completed 2 practices.", attempts: 2, averageScore: 8, minutesPracticed: 30, skillTrends: JSON.stringify([{ skill: "tech-interview", score: 8, attempts: 2 }]), retentionRate: 100 }),
  getAnalyticsSummary: vi.fn().mockResolvedValue({ totalEvents: 12, uniqueUsers: 4, byPath: [], byEvent: [], completionRate: 50, retentionCohorts: [{ cohort: "2026-09-01", users: 4, weeks: [{ week: 0, retained: 4, rate: 100 }] }], skillTrends: [{ skill: "tech-interview", week: "2026-09-01", attempts: 3, overall: 7, communication: 7, confidence: 6, technical: 8, timeManagement: 7 }], coachQuality: [{ coachType: "ai", attempts: 3, overall: 7, communication: 7, confidence: 6, technical: 8, timeManagement: 7 }] }),
  getCoachProfile: vi.fn().mockResolvedValue({ preferredLanguage: "de", country: "Germany", targetRole: "Staff engineer", experienceLevel: "advanced", weeklyMinutes: 480 }),
  getLatestWeeklySummary: vi.fn().mockResolvedValue({ summaryText: "You completed 2 practices.", attempts: 2, averageScore: 8, minutesPracticed: 30, skillTrends: JSON.stringify([{ skill: "tech-interview", score: 8, attempts: 2 }]), retentionRate: 100 }),
  getUserProgress: vi.fn().mockResolvedValue({ profile: undefined, sessions: [], attempts: [], totals: { sessions: 0, attempts: 0, averageScore: 0 } }),
  recordInteraction: vi.fn().mockResolvedValue(undefined),
  recordPracticeAttempt: vi.fn().mockResolvedValue(undefined),
  upsertCoachProfile: vi.fn().mockResolvedValue(undefined),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function caller(role: "user" | "admin" = "user") {
  const ctx: TrpcContext = {
    user: { id: 42, openId: "integration-user", name: "Integration User", email: "integration@example.com", loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe("Global AI Coach procedures", () => {
  beforeEach(() => { delete process.env.OPENROUTER_API_KEY; });

  it("calibrates an emergency technical plan for an authenticated user", async () => {
    const result = await caller().coach.start({ interviewType: "tech-interview", timeline: "3-days" });
    expect(result.sessions).toBe(3);
    expect(result.mode).toBe("Emergency sprint");
    expect(result.focus).toBe("Core algorithms");
    expect(result.sessionId).toBeTypeOf("number");
  });

  it("accepts multilingual profile settings and weekly availability", async () => {
    const result = await caller().profile.save({ preferredLanguage: "de", country: "Germany", targetRole: "Staff engineer", experienceLevel: "advanced", weeklyMinutes: 480 });
    expect(result).toBeUndefined();
  });

  it("returns a useful question through the fallback path without an API key", async () => {
    const result = await caller().coach.question({ sessionId: 1, interviewType: "behavioral", difficulty: "intermediate", focus: "conflict resolution" });
    expect(result.coachType).toBe("fallback");
    expect(result.question).toContain("difficult team member");
    expect(result.hints.length).toBeGreaterThan(1);
  });

  it("returns actionable fallback feedback for an answer", async () => {
    const result = await caller().coach.evaluate({ sessionId: 1, question: "Tell me about a challenge.", answer: "I explained the situation and the result.", interviewType: "behavioral", timeTaken: 5 });
    expect(result.coachType).toBe("fallback");
    expect(result.overallScore).toBe(5);
    expect(result.improvements.length).toBeGreaterThan(1);
    expect(result.detailedFeedback).toContain("useful starting point");
  });

  it("requires admin role and exposes retention, trends, and coach quality analytics", async () => {
    await expect(caller().analytics.summary()).rejects.toMatchObject({ code: "FORBIDDEN" });
    const result = await caller("admin").analytics.summary();
    expect(result.retentionCohorts[0]?.weeks[0]?.rate).toBe(100);
    expect(result.skillTrends[0]?.skill).toBe("tech-interview");
    expect(result.coachQuality[0]?.coachType).toBe("ai");
  });

  it("exports analytics as CSV only for administrators", async () => {
    await expect(caller().analytics.exportCsv()).rejects.toMatchObject({ code: "FORBIDDEN" });
    const csv = await caller("admin").analytics.exportCsv();
    expect(csv).toContain("section,dimension,period,count,score,detail");
    expect(csv).toContain("retention");
    expect(csv).toContain("coach-quality");
  });

  it("exposes the latest weekly summary and scheduled generation only to the right user types", async () => {
    const summary = await caller().profile.weeklySummary();
    expect(summary?.averageScore).toBe(8);
    await expect(caller().scheduled.generateWeeklySummaries()).rejects.toMatchObject({ code: "FORBIDDEN" });
    const generated = await caller("admin").scheduled.generateWeeklySummaries();
    expect(generated.created).toBe(4);
  });

  it("allows an authenticated user to manually refresh only their own weekly summary", async () => {
    const summary = await caller().profile.generateWeeklySummary();
    expect(summary?.attempts).toBe(2);
    expect(summary?.averageScore).toBe(8);
    expect(summary?.skillTrends).toContain("tech-interview");
    expect(summary?.retentionRate).toBe(100);
  });
});
