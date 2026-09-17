import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

type JsonRecord = Record<string, unknown>;

const interviewTypes = z.enum(["tech-interview", "behavioral", "system-design"]);
const timelines = z.enum(["3-days", "1-week", "2-weeks", "1-month", "3-months"]);

const plans: Record<string, Record<string, { sessions: number; focus: string; difficulty: string; mode: string }>> = {
  "tech-interview": {
    "3-days": { sessions: 3, focus: "Core algorithms", difficulty: "intermediate", mode: "Emergency sprint" },
    "1-week": { sessions: 5, focus: "Data structures & algorithms", difficulty: "intermediate", mode: "Intensive" },
    "2-weeks": { sessions: 8, focus: "Comprehensive technical prep", difficulty: "advanced", mode: "Focused" },
    "1-month": { sessions: 12, focus: "Full technical mastery", difficulty: "advanced", mode: "Comprehensive" },
    "3-months": { sessions: 20, focus: "Expert-level preparation", difficulty: "expert", mode: "Mastery" },
  },
  behavioral: {
    "3-days": { sessions: 2, focus: "STAR method basics", difficulty: "beginner", mode: "Emergency sprint" },
    "1-week": { sessions: 4, focus: "Leadership scenarios", difficulty: "intermediate", mode: "Intensive" },
    "2-weeks": { sessions: 6, focus: "Advanced behavioral skills", difficulty: "intermediate", mode: "Focused" },
    "1-month": { sessions: 10, focus: "Executive presence", difficulty: "advanced", mode: "Comprehensive" },
    "3-months": { sessions: 15, focus: "Leadership mastery", difficulty: "expert", mode: "Mastery" },
  },
  "system-design": {
    "3-days": { sessions: 2, focus: "Basic system concepts", difficulty: "intermediate", mode: "Emergency sprint" },
    "1-week": { sessions: 4, focus: "Scalability patterns", difficulty: "intermediate", mode: "Intensive" },
    "2-weeks": { sessions: 7, focus: "Complex system design", difficulty: "advanced", mode: "Focused" },
    "1-month": { sessions: 12, focus: "Enterprise architecture", difficulty: "advanced", mode: "Comprehensive" },
    "3-months": { sessions: 18, focus: "System design mastery", difficulty: "expert", mode: "Mastery" },
  },
};

const fallbackQuestions: Record<string, string> = {
  "tech-interview": "Implement a function that finds two numbers in an array that add up to a target sum. Explain your complexity and edge cases.",
  behavioral: "Tell me about a time you worked with a difficult team member. What did you do, and what was the measurable outcome?",
  "system-design": "Design a globally available URL-shortening service. Clarify requirements, estimate scale, and explain your trade-offs.",
};

async function callOpenRouter(system: string, user: string): Promise<JsonRecord> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL || "https://global-ai-coach.manus.space",
      "X-Title": "Global AI Coach",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.4,
      max_tokens: 1600,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`OpenRouter returned ${response.status}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }> };
  let content = payload.choices?.[0]?.message?.content;
  if (Array.isArray(content)) content = content.map((part) => part.text || "").join("");
  if (!content) throw new Error("OpenRouter returned empty content");
  const normalized = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(normalized) as JsonRecord;
}

async function generateQuestion(interviewType: string, difficulty: string, focus: string) {
  try {
    const result = await callOpenRouter(
      "You are a precise, encouraging global interview coach. Return valid JSON only.",
      `Create one ${difficulty} ${interviewType} practice question focused on ${focus}. Return JSON with question, context, hints, expectedApproach, evaluationCriteria, estimatedMinutes, and followUps. Keep it culturally respectful and practical.`,
    );
    return { ...result, coachType: "ai", model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash" };
  } catch (error) {
    console.warn("[Coach] Question fallback:", error instanceof Error ? error.message : error);
    return {
      question: fallbackQuestions[interviewType] || fallbackQuestions["tech-interview"],
      context: "This exercise tests structured thinking, communication, and practical judgment.",
      hints: ["Clarify assumptions first.", "Explain your reasoning aloud.", "Reserve time to review edge cases."],
      expectedApproach: "State assumptions, work through a clear structure, explain trade-offs, and close with a concise summary.",
      evaluationCriteria: ["Correctness", "Clarity", "Trade-offs", "Time management"],
      estimatedMinutes: interviewType === "behavioral" ? 5 : 15,
      followUps: ["What would you improve with more time?", "How would you adapt this to a different context?"],
      coachType: "fallback",
    };
  }
}

async function evaluateAnswer(question: string, answer: string, interviewType: string, timeTaken: number) {
  try {
    const result = await callOpenRouter(
      "You are a supportive but rigorous interview evaluator. Return valid JSON only with scores from 0 to 10.",
      `Evaluate this ${interviewType} answer. Question: ${question}\nAnswer: ${answer}\nTime taken: ${timeTaken} minutes. Return JSON with overallScore, technicalScore, communicationScore, confidenceScore, timeManagementScore, strengths, improvements, detailedFeedback, nextSteps, and improvementPriority.`,
    );
    return { ...result, coachType: "ai" };
  } catch (error) {
    console.warn("[Coach] Evaluation fallback:", error instanceof Error ? error.message : error);
    return {
      overallScore: 5,
      technicalScore: interviewType === "behavioral" ? 5 : 5,
      communicationScore: answer.trim().length > 120 ? 6 : 4,
      confidenceScore: 5,
      timeManagementScore: timeTaken <= 20 ? 6 : 4,
      strengths: ["Engaged with the question", "Provided a starting point for feedback"],
      improvements: ["Add specific evidence", "Make the structure easier to follow", "State the outcome or trade-off explicitly"],
      detailedFeedback: "Your answer is a useful starting point. Add a clear structure, concrete evidence, and a measurable result.",
      nextSteps: ["Rewrite the answer using STAR or a step-by-step technical structure", "Practice once under a timer"],
      improvementPriority: "communication",
      coachType: "fallback",
    };
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  coach: router({
    start: publicProcedure.input(z.object({ interviewType: interviewTypes, timeline: timelines })).mutation(({ input }) => {
      const plan = plans[input.interviewType][input.timeline];
      return { sessionId: `session-${Date.now()}`, ...plan, interviewType: input.interviewType, timeline: input.timeline };
    }),
    question: publicProcedure.input(z.object({ interviewType: interviewTypes, difficulty: z.string(), focus: z.string().min(1) })).mutation(({ input }) => generateQuestion(input.interviewType, input.difficulty, input.focus)),
    evaluate: publicProcedure.input(z.object({ question: z.string().min(1), answer: z.string().min(1), interviewType: interviewTypes, timeTaken: z.number().min(0).max(240) })).mutation(({ input }) => evaluateAnswer(input.question, input.answer, input.interviewType, input.timeTaken)),
  }),
});

export type AppRouter = typeof appRouter;
