import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  createCoachingSession: vi.fn().mockResolvedValue(undefined),
  getAnalyticsSummary: vi.fn().mockResolvedValue({ totalEvents: 0, uniqueUsers: 0, byPath: [], byEvent: [], completionRate: 0 }),
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

  it("requires admin role for the analytics summary", async () => {
    await expect(caller().analytics.summary()).rejects.toMatchObject({ code: "FORBIDDEN" });
    const result = await caller("admin").analytics.summary();
    expect(result).toHaveProperty("byPath");
    expect(result).toHaveProperty("completionRate");
  });
});
