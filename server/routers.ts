import { z } from "zod";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { createCoachingSession, createWeeklySummaries, createWeeklySummaryForUser, getAnalyticsSummary, getCoachProfile, getLatestWeeklySummary, getSavedDateRanges, getUserProgress, getWeeklyComparison, recordInteraction, recordPracticeAttempt, saveDateRange, upsertCoachProfile } from "./db";

type JsonRecord = Record<string, unknown>;
const interviewTypes = z.enum(["tech-interview", "behavioral", "system-design"]);
const timelines = z.enum(["3-days", "1-week", "2-weeks", "1-month", "3-months"]);

const plans: Record<string, Record<string, { sessions: number; focus: string; difficulty: string; mode: string }>> = {
  "tech-interview": { "3-days": { sessions: 3, focus: "Core algorithms", difficulty: "intermediate", mode: "Emergency sprint" }, "1-week": { sessions: 5, focus: "Data structures & algorithms", difficulty: "intermediate", mode: "Intensive" }, "2-weeks": { sessions: 8, focus: "Comprehensive technical prep", difficulty: "advanced", mode: "Focused" }, "1-month": { sessions: 12, focus: "Full technical mastery", difficulty: "advanced", mode: "Comprehensive" }, "3-months": { sessions: 20, focus: "Expert-level preparation", difficulty: "expert", mode: "Mastery" } },
  behavioral: { "3-days": { sessions: 2, focus: "STAR method basics", difficulty: "beginner", mode: "Emergency sprint" }, "1-week": { sessions: 4, focus: "Leadership scenarios", difficulty: "intermediate", mode: "Intensive" }, "2-weeks": { sessions: 6, focus: "Advanced behavioral skills", difficulty: "intermediate", mode: "Focused" }, "1-month": { sessions: 10, focus: "Executive presence", difficulty: "advanced", mode: "Comprehensive" }, "3-months": { sessions: 15, focus: "Leadership mastery", difficulty: "expert", mode: "Mastery" } },
  "system-design": { "3-days": { sessions: 2, focus: "Basic system concepts", difficulty: "intermediate", mode: "Emergency sprint" }, "1-week": { sessions: 4, focus: "Scalability patterns", difficulty: "intermediate", mode: "Intensive" }, "2-weeks": { sessions: 7, focus: "Complex system design", difficulty: "advanced", mode: "Focused" }, "1-month": { sessions: 12, focus: "Enterprise architecture", difficulty: "advanced", mode: "Comprehensive" }, "3-months": { sessions: 18, focus: "System design mastery", difficulty: "expert", mode: "Mastery" } },
};
const fallbackQuestions: Record<string, string> = { "tech-interview": "Implement a function that finds two numbers in an array that add up to a target sum. Explain your complexity and edge cases.", behavioral: "Tell me about a time you worked with a difficult team member. What did you do, and what was the measurable outcome?", "system-design": "Design a globally available URL-shortening service. Clarify requirements, estimate scale, and explain your trade-offs." };
const roleRubrics: Array<{ match: RegExp; rubric: string }> = [
  { match: /(engineer|developer|software|technical)/i, rubric: "Correctness, complexity, testing, debugging, trade-offs, and communication." },
  { match: /(product|manager|owner)/i, rubric: "Problem framing, prioritization, user impact, metrics, trade-offs, and stakeholder communication." },
  { match: /(designer|ux|research)/i, rubric: "User insight, clarity of rationale, iteration, accessibility, constraints, and critique response." },
  { match: /(sales|account|customer)/i, rubric: "Discovery, empathy, objection handling, value articulation, evidence, and next-step clarity." },
];
function guidance(profile: { preferredLanguage?: string | null; country?: string | null; targetRole?: string | null } | undefined) {
  const rubric = roleRubrics.find((item) => profile?.targetRole && item.match.test(profile.targetRole))?.rubric || "Clarity, evidence, structured reasoning, judgment, and a concise next step.";
  const jurisdiction = profile?.country ? `Use examples and norms appropriate for ${profile.country}; do not provide legal advice or assume one jurisdiction's rules apply globally.` : "Ask clarifying questions before making jurisdiction-specific assumptions.";
  return { language: profile?.preferredLanguage || "en", role: profile?.targetRole || "the target role", rubric, jurisdiction };
}

async function callOpenRouter(system: string, user: string): Promise<JsonRecord> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured");
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": process.env.APP_URL || "https://globalcoach-hhuwnvps.manus.space", "X-Title": "Global AI Coach" }, body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash", messages: [{ role: "system", content: system }, { role: "user", content: user }], temperature: 0.4, max_tokens: 1600 }), signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`OpenRouter returned ${response.status}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }> };
  let content = payload.choices?.[0]?.message?.content;
  if (Array.isArray(content)) content = content.map((part) => part.text || "").join("");
  if (!content) throw new Error("OpenRouter returned empty content");
  return JSON.parse(content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()) as JsonRecord;
}

async function generateQuestion(interviewType: string, difficulty: string, focus: string, profile: Awaited<ReturnType<typeof getCoachProfile>>) {
  const context = guidance(profile);
  try {
    const result = await callOpenRouter("You are a precise, encouraging global interview coach. Return valid JSON only.", `Create one ${difficulty} ${interviewType} practice question for ${context.role}, in language ${context.language}, focused on ${focus}. Rubric: ${context.rubric} Jurisdiction context: ${context.jurisdiction} Return JSON with question, context, hints, expectedApproach, evaluationCriteria, estimatedMinutes, and followUps.`);
    return { ...result, coachType: "ai", rubric: context.rubric, jurisdictionNotes: context.jurisdiction, model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash" };
  } catch (error) {
    console.warn("[Coach] Question fallback:", error instanceof Error ? error.message : error);
    return { question: fallbackQuestions[interviewType] || fallbackQuestions["tech-interview"], context: `This exercise tests structured thinking for ${context.role}.`, hints: ["Clarify assumptions first.", "Explain your reasoning aloud.", "Reserve time to review edge cases."], expectedApproach: "State assumptions, work through a clear structure, explain trade-offs, and close with a concise summary.", evaluationCriteria: context.rubric.split(", "), estimatedMinutes: interviewType === "behavioral" ? 5 : 15, followUps: ["What would you improve with more time?", "How would you adapt this to a different context?"], rubric: context.rubric, jurisdictionNotes: context.jurisdiction, coachType: "fallback" };
  }
}

async function evaluateAnswer(question: string, answer: string, interviewType: string, timeTaken: number, profile: Awaited<ReturnType<typeof getCoachProfile>>) {
  const context = guidance(profile);
  try {
    const result = await callOpenRouter("You are a supportive but rigorous global interview evaluator. Return valid JSON only with scores from 0 to 10.", `Evaluate this ${interviewType} answer for ${context.role} in ${context.language}. Question: ${question}\nAnswer: ${answer}\nTime taken: ${timeTaken} minutes. Rubric: ${context.rubric} Jurisdiction context: ${context.jurisdiction} Return JSON with overallScore, technicalScore, communicationScore, confidenceScore, timeManagementScore, strengths, improvements, detailedFeedback, nextSteps, and improvementPriority.`);
    return { ...result, coachType: "ai", rubric: context.rubric, jurisdictionNotes: context.jurisdiction };
  } catch (error) {
    console.warn("[Coach] Evaluation fallback:", error instanceof Error ? error.message : error);
    return { overallScore: 5, technicalScore: 5, communicationScore: answer.trim().length > 120 ? 6 : 4, confidenceScore: 5, timeManagementScore: timeTaken <= 20 ? 6 : 4, strengths: ["Engaged with the question", "Provided a starting point for feedback"], improvements: ["Add specific evidence", "Make the structure easier to follow", "State the outcome or trade-off explicitly"], detailedFeedback: `Your answer is a useful starting point for the ${context.role} rubric. Add a clear structure, concrete evidence, and a measurable result.`, nextSteps: ["Rewrite the answer using the role-specific rubric", "Practice once under a timer"], improvementPriority: "communication", rubric: context.rubric, jurisdictionNotes: context.jurisdiction, coachType: "fallback" };
  }
}

function csvCell(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
function analyticsCsv(data: Awaited<ReturnType<typeof getAnalyticsSummary>>) {
  const rows = ["section,dimension,period,count,score,detail"];
  for (const item of data.byPath) rows.push(["path", item.path, "", item.count, "", ""].map(csvCell).join(","));
  for (const item of data.byEvent) rows.push(["event", item.eventType, "", item.count, "", ""].map(csvCell).join(","));
  for (const cohort of data.retentionCohorts) for (const week of cohort.weeks) rows.push(["retention", cohort.cohort, `week-${week.week}`, week.retained, week.rate, `${cohort.users} cohort users`].map(csvCell).join(","));
  for (const item of data.skillTrends) rows.push(["skill-trend", item.skill, item.week, item.attempts, item.overall, `technical=${item.technical}; communication=${item.communication}; confidence=${item.confidence}; time=${item.timeManagement}`].map(csvCell).join(","));
  for (const item of data.coachQuality) rows.push(["coach-quality", item.coachType, "all-time", item.attempts, item.overall, `technical=${item.technical}; communication=${item.communication}; confidence=${item.confidence}; time=${item.timeManagement}`].map(csvCell).join(","));
  return rows.join("\n");
}

export const appRouter = router({
  system: systemRouter,
  auth: router({ me: publicProcedure.query((opts) => opts.ctx.user), logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }) }),
  profile: router({
    save: protectedProcedure.input(z.object({ preferredLanguage: z.string().max(32).optional(), country: z.string().max(64).optional(), targetRole: z.string().max(128).optional(), experienceLevel: z.string().max(32).optional(), weeklyMinutes: z.number().int().min(0).max(10000).optional(), preferredModuleDifficulty: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(), preferredModuleDuration: z.number().int().min(5).max(180).optional() })).mutation(({ ctx, input }) => upsertCoachProfile(ctx.user.id, input)),
    progress: protectedProcedure.query(({ ctx }) => getUserProgress(ctx.user.id)),
    savedDateRanges: protectedProcedure.query(({ ctx }) => getSavedDateRanges(ctx.user.id)),
    saveDateRange: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(64), startDate: z.string().date(), endDate: z.string().date() })).mutation(({ ctx, input }) => saveDateRange(ctx.user.id, input)),
    weeklySummary: protectedProcedure.query(({ ctx }) => getLatestWeeklySummary(ctx.user.id)),
    weeklyComparison: protectedProcedure.input(z.object({ role: z.string().max(128).optional(), country: z.string().max(64).optional(), experienceLevel: z.string().max(32).optional(), startDate: z.string().date().optional(), endDate: z.string().date().optional() }).optional()).query(({ ctx, input }) => getWeeklyComparison(ctx.user.id, input)),
    generateWeeklySummary: protectedProcedure.mutation(({ ctx }) => createWeeklySummaryForUser(ctx.user.id)),
  }),
  coach: router({
    start: protectedProcedure.input(z.object({ interviewType: interviewTypes, timeline: timelines, difficultyOverride: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(), durationMinutes: z.number().int().min(5).max(180).optional() })).mutation(async ({ ctx, input }) => { const plan = plans[input.interviewType][input.timeline]; const difficulty = input.difficultyOverride || plan.difficulty; const durationMinutes = input.durationMinutes || (input.timeline === "3-days" ? 20 : input.timeline === "1-week" ? 30 : 45); const persisted = await createCoachingSession(ctx.user.id, { interviewType: input.interviewType, timeline: input.timeline, focus: plan.focus, difficulty, mode: plan.mode, plannedSessions: plan.sessions }); await recordInteraction(ctx.user.id, persisted?.id, { eventType: "session_started", path: input.interviewType, metadata: { timeline: input.timeline, mode: plan.mode, difficulty, durationMinutes } }); return { sessionId: persisted?.id ?? Date.now(), ...plan, difficulty, durationMinutes, interviewType: input.interviewType, timeline: input.timeline }; }),
    question: protectedProcedure.input(z.object({ sessionId: z.number().int(), interviewType: interviewTypes, difficulty: z.string(), focus: z.string().min(1) })).mutation(async ({ ctx, input }) => { const result = await generateQuestion(input.interviewType, input.difficulty, input.focus, await getCoachProfile(ctx.user.id)); await recordInteraction(ctx.user.id, input.sessionId, { eventType: "question_generated", path: input.interviewType, metadata: { coachType: result.coachType, focus: input.focus } }); return result; }),
    evaluate: protectedProcedure.input(z.object({ sessionId: z.number().int(), question: z.string().min(1), answer: z.string().min(1), interviewType: interviewTypes, timeTaken: z.number().min(0).max(240) })).mutation(async ({ ctx, input }) => { const result = await evaluateAnswer(input.question, input.answer, input.interviewType, input.timeTaken, await getCoachProfile(ctx.user.id)); await recordPracticeAttempt(ctx.user.id, input.sessionId, { question: input.question, answer: input.answer, overallScore: Number(result.overallScore) || 0, technicalScore: Number(result.technicalScore) || 0, communicationScore: Number(result.communicationScore) || 0, confidenceScore: Number(result.confidenceScore) || 0, timeManagementScore: Number(result.timeManagementScore) || 0, coachType: String(result.coachType || "fallback"), timeTaken: input.timeTaken }); await recordInteraction(ctx.user.id, input.sessionId, { eventType: "practice_completed", path: input.interviewType, metadata: { coachType: result.coachType, overallScore: result.overallScore } }); return result; }),
  }),
  analytics: router({
    track: publicProcedure.input(z.object({ eventType: z.string().max(64), path: z.string().max(64), sessionId: z.number().int().optional(), metadata: z.record(z.string(), z.unknown()).optional() })).mutation(({ ctx, input }) => recordInteraction(ctx.user?.id, input.sessionId, input)),
    summary: adminProcedure.query(() => getAnalyticsSummary()),
    exportCsv: adminProcedure.query(async () => analyticsCsv(await getAnalyticsSummary())),
  }),
  scheduled: router({ generateWeeklySummaries: adminProcedure.mutation(() => createWeeklySummaries()) }),
});

export type AppRouter = typeof appRouter;
