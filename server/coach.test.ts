import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  createCoachingSession: vi.fn().mockResolvedValue(undefined),
  createWeeklySummaries: vi
    .fn()
    .mockResolvedValue({ created: 4, weekStart: new Date("2026-09-20") }),
  createWeeklySummaryForUser: vi.fn().mockResolvedValue({
    summaryText: "You completed 2 practices.",
    attempts: 2,
    averageScore: 8,
    minutesPracticed: 30,
    skillTrends: JSON.stringify([
      { skill: "tech-interview", score: 8, attempts: 2 },
    ]),
    recommendedModules: JSON.stringify([
      {
        title: "Algorithm fluency sprint",
        score: 8,
        reason: "Build speed.",
        action: "Complete two timed problems.",
      },
    ]),
    retentionRate: 100,
  }),
  getAnalyticsSummary: vi.fn().mockResolvedValue({
    totalEvents: 12,
    uniqueUsers: 4,
    byPath: [],
    byEvent: [],
    completionRate: 50,
    retentionCohorts: [
      {
        cohort: "2026-09-01",
        users: 4,
        weeks: [{ week: 0, retained: 4, rate: 100 }],
      },
    ],
    skillTrends: [
      {
        skill: "tech-interview",
        week: "2026-09-01",
        attempts: 3,
        overall: 7,
        communication: 7,
        confidence: 6,
        technical: 8,
        timeManagement: 7,
      },
    ],
    coachQuality: [
      {
        coachType: "ai",
        attempts: 3,
        overall: 7,
        communication: 7,
        confidence: 6,
        technical: 8,
        timeManagement: 7,
      },
    ],
  }),
  getCoachProfile: vi.fn().mockResolvedValue({
    preferredLanguage: "de",
    country: "Germany",
    targetRole: "Staff engineer",
    experienceLevel: "advanced",
    weeklyMinutes: 480,
    preferredModuleDifficulty: "advanced",
    preferredModuleDuration: 45,
  }),
  getTargetStandard: vi.fn().mockResolvedValue(null),
  getTargetStandardVersions: vi
    .fn()
    .mockResolvedValue([
      {
        id: 1,
        targetStandardId: 1,
        versionNumber: 1,
        snapshot: "{}",
        changeNote: "Initial Target Standard",
        createdAt: new Date(),
      },
    ]),
  getTargetSources: vi
    .fn()
    .mockResolvedValue([
      {
        id: 1,
        targetStandardId: 1,
        url: "https://example.com/rubric",
        status: "pending_review",
      },
    ]),
  getReadinessScore: vi.fn().mockResolvedValue({
    targetStandardId: 1,
    version: "v1",
    score: 62,
    overallPracticeScore: 5,
    attempts: 2,
    confidence: "low",
    breakdown: [
      {
        id: "clarity",
        label: "Clarity and structure",
        weight: 25,
        targetScore: 8,
        score: 5,
        readiness: 63,
        evidenceCount: 2,
        status: "gap",
      },
    ],
  }),
  ingestTargetSource: vi
    .fn()
    .mockResolvedValue({
      id: 1,
      status: "pending_review",
      url: "https://example.com/rubric",
    }),
  reviewTargetSource: vi
    .fn()
    .mockResolvedValue({
      id: 1,
      status: "approved",
      url: "https://example.com/rubric",
    }),
  getLatestWeeklySummary: vi.fn().mockResolvedValue({
    summaryText: "You completed 2 practices.",
    attempts: 2,
    averageScore: 8,
    minutesPracticed: 30,
    skillTrends: JSON.stringify([
      { skill: "tech-interview", score: 8, attempts: 2 },
    ]),
    retentionRate: 100,
  }),
  getSavedDateRanges: vi.fn().mockResolvedValue([
    {
      name: "Interview sprint",
      startDate: "2026-09-01",
      endDate: "2026-09-23",
    },
  ]),
  getWeeklyComparison: vi.fn().mockResolvedValue({
    current: { averageScore: 8, minutesPracticed: 30 },
    previousWeeks: [{ averageScore: 7, minutesPracticed: 20 }],
    trendSeries: [
      {
        weekStart: new Date("2026-09-20"),
        skillTrends: JSON.stringify([
          { skill: "tech-interview", score: 8, attempts: 2 },
        ]),
      },
    ],
    peerAverageScore: 6.5,
    peerAverageMinutes: 25,
    peerCount: 3,
    peerAverageBySkill: [
      {
        skill: "tech-interview",
        score: 6.5,
        attempts: 4,
        sampleSize: 1,
        confidence: "low",
      },
    ],
  }),
  getUserProgress: vi.fn().mockResolvedValue({
    profile: undefined,
    sessions: [],
    attempts: [],
    totals: { sessions: 0, attempts: 0, averageScore: 0 },
  }),
  recordInteraction: vi.fn().mockResolvedValue(undefined),
  recordPracticeAttempt: vi.fn().mockResolvedValue(undefined),
  upsertCoachProfile: vi.fn().mockResolvedValue(undefined),
  upsertTargetStandard: vi.fn().mockImplementation(async (_userId, input) => ({
    id: 1,
    userId: 42,
    ...input,
    evaluator: input.evaluator || null,
    jurisdiction: input.jurisdiction || null,
    targetDate: input.targetDate
      ? new Date(`${input.targetDate}T00:00:00.000Z`)
      : null,
    language: input.language || "en",
    format: input.format || null,
    sourceUrl: input.sourceUrl || null,
    notes: input.notes || null,
    version: "v1",
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  saveDateRange: vi.fn().mockResolvedValue([
    {
      name: "Interview sprint",
      startDate: "2026-09-01",
      endDate: "2026-09-23",
    },
  ]),
  updateDateRange: vi
    .fn()
    .mockResolvedValue([
      { name: "Final week", startDate: "2026-09-16", endDate: "2026-09-23" },
    ]),
  deleteDateRange: vi.fn().mockResolvedValue([]),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function caller(role: "user" | "admin" = "user") {
  const ctx: TrpcContext = {
    user: {
      id: 42,
      openId: "integration-user",
      name: "Integration User",
      email: "integration@example.com",
      loginMethod: "test",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe("Global AI Coach procedures", () => {
  beforeEach(() => {
    delete process.env.OPENROUTER_API_KEY;
  });

  it("calibrates an emergency technical plan for an authenticated user", async () => {
    const result = await caller().coach.start({
      interviewType: "tech-interview",
      timeline: "3-days",
    });
    expect(result.sessions).toBe(3);
    expect(result.mode).toBe("Emergency sprint");
    expect(result.focus).toBe("Core algorithms");
    expect(result.sessionId).toBeTypeOf("number");
  });

  it("accepts multilingual profile settings and weekly availability", async () => {
    const result = await caller().profile.save({
      preferredLanguage: "de",
      country: "Germany",
      targetRole: "Staff engineer",
      experienceLevel: "advanced",
      weeklyMinutes: 480,
      preferredModuleDifficulty: "advanced",
      preferredModuleDuration: 45,
    });
    expect(result).toBeUndefined();
  });

  it("saves a structured Target Standard for the current goal", async () => {
    const result = await caller().profile.saveTargetStandard({
      outcomeType: "job-interview",
      targetName: "Senior Backend Engineer final loop",
      evaluator: "Acme",
      jurisdiction: "Germany",
      targetDate: "2026-11-15",
      language: "en",
      format: "four rounds",
      sourceUrl: "https://example.com/rubric",
      notes: "System design and behavioral rounds are decisive.",
    });
    expect(result?.targetName).toBe("Senior Backend Engineer final loop");
    expect(result?.jurisdiction).toBe("Germany");
  });

  it("exposes Target Standard history, source review, and readiness evidence", async () => {
    const history = await caller().profile.targetStandardVersions();
    const sources = await caller().profile.targetSources();
    const readiness = await caller().profile.readinessScore();
    const reviewed = await caller().profile.reviewTargetSource({
      sourceId: 1,
      status: "approved",
      reviewNotes: "Publisher and jurisdiction verified.",
    });
    expect(history[0]?.versionNumber).toBe(1);
    expect(sources[0]?.status).toBe("pending_review");
    expect(readiness?.score).toBe(62);
    expect(reviewed?.status).toBe("approved");
  });

  it("returns a useful question through the fallback path without an API key", async () => {
    const result = await caller().coach.question({
      sessionId: 1,
      interviewType: "behavioral",
      difficulty: "intermediate",
      focus: "conflict resolution",
    });
    expect(result.coachType).toBe("fallback");
    expect(result.question).toContain("difficult team member");
    expect(result.hints.length).toBeGreaterThan(1);
  });

  it("returns actionable fallback feedback for an answer", async () => {
    const result = await caller().coach.evaluate({
      sessionId: 1,
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

  it("requires admin role and exposes retention, trends, and coach quality analytics", async () => {
    await expect(caller().analytics.summary()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    const result = await caller("admin").analytics.summary();
    expect(result.retentionCohorts[0]?.weeks[0]?.rate).toBe(100);
    expect(result.skillTrends[0]?.skill).toBe("tech-interview");
    expect(result.coachQuality[0]?.coachType).toBe("ai");
  });

  it("exports analytics as CSV only for administrators", async () => {
    await expect(caller().analytics.exportCsv()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    const csv = await caller("admin").analytics.exportCsv();
    expect(csv).toContain("section,dimension,period,count,score,detail");
    expect(csv).toContain("retention");
    expect(csv).toContain("coach-quality");
  });

  it("exposes the latest weekly summary and scheduled generation only to the right user types", async () => {
    const summary = await caller().profile.weeklySummary();
    expect(summary?.averageScore).toBe(8);
    await expect(
      caller().scheduled.generateWeeklySummaries()
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const generated = await caller("admin").scheduled.generateWeeklySummaries();
    expect(generated.created).toBe(4);
  });

  it("allows an authenticated user to manually refresh only their own weekly summary", async () => {
    const summary = await caller().profile.generateWeeklySummary();
    expect(summary?.attempts).toBe(2);
    expect(summary?.averageScore).toBe(8);
    expect(summary?.skillTrends).toContain("tech-interview");
    expect(summary?.recommendedModules).toContain("Algorithm fluency sprint");
    expect(summary?.retentionRate).toBe(100);
  });

  it("returns privacy-safe weekly comparison data", async () => {
    const comparison = await caller().profile.weeklyComparison();
    expect(comparison.previousWeeks[0]?.averageScore).toBe(7);
    expect(comparison.peerAverageScore).toBe(6.5);
    expect(comparison.peerAverageBySkill[0]?.sampleSize).toBe(1);
    expect(comparison.peerAverageBySkill[0]?.confidence).toBe("low");
    expect(comparison).not.toHaveProperty("peerUserIds");
  });

  it("accepts role, country, and experience filters for peer comparisons", async () => {
    const comparison = await caller().profile.weeklyComparison({
      role: "Engineer",
      country: "Germany",
      experienceLevel: "advanced",
      startDate: "2026-08-01",
      endDate: "2026-09-23",
    });
    expect(comparison.peerAverageMinutes).toBe(25);
  });

  it("starts an accepted module with the selected difficulty and duration", async () => {
    const session = await caller().coach.start({
      interviewType: "tech-interview",
      timeline: "1-week",
      difficultyOverride: "expert",
      durationMinutes: 60,
    });
    expect(session.difficulty).toBe("expert");
    expect(session.durationMinutes).toBe(60);
  });

  it("lists and saves named custom trend ranges for the authenticated user", async () => {
    const ranges = await caller().profile.savedDateRanges();
    expect(ranges[0]?.name).toBe("Interview sprint");
    const saved = await caller().profile.saveDateRange({
      name: "Final week",
      startDate: "2026-09-16",
      endDate: "2026-09-23",
    });
    expect(saved[0]?.name).toBe("Interview sprint");
    const updated = await caller().profile.updateDateRange({
      originalName: "Interview sprint",
      name: "Final week",
      startDate: "2026-09-16",
      endDate: "2026-09-23",
    });
    expect(updated[0]?.name).toBe("Final week");
    expect(
      await caller().profile.deleteDateRange({ name: "Final week" })
    ).toEqual([]);
  });
});
