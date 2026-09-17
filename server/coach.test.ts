import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function caller() {
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe("Global AI Coach procedures", () => {
  beforeEach(() => {
    delete process.env.OPENROUTER_API_KEY;
  });

  it("calibrates an emergency technical plan", async () => {
    const result = await caller().coach.start({ interviewType: "tech-interview", timeline: "3-days" });
    expect(result.sessions).toBe(3);
    expect(result.mode).toBe("Emergency sprint");
    expect(result.focus).toBe("Core algorithms");
  });

  it("returns a useful question through the fallback path without an API key", async () => {
    const result = await caller().coach.question({ interviewType: "behavioral", difficulty: "intermediate", focus: "conflict resolution" });
    expect(result.coachType).toBe("fallback");
    expect(result.question).toContain("difficult team member");
    expect(result.hints.length).toBeGreaterThan(1);
  });

  it("returns actionable fallback feedback for an answer", async () => {
    const result = await caller().coach.evaluate({
      question: "Tell me about a challenge.",
      answer: "I explained the situation and the result.",
      interviewType: "behavioral",
      timeTaken: 5,
    });
    expect(result.coachType).toBe("fallback");
    expect(result.overallScore).toBe(5);
    expect(result.improvements.length).toBeGreaterThan(1);
    expect(result.detailedFeedback).toContain("useful starting point");
  });
});
