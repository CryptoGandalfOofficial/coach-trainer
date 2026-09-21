import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { ENV } from "./_core/env";
import { coachingSessions, coachProfiles, interactionEvents, practiceAttempts, users, type InsertUser } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function upsertCoachProfile(userId: number, input: { preferredLanguage?: string; country?: string; targetRole?: string; experienceLevel?: string; weeklyMinutes?: number }) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(coachProfiles).values({ userId, ...input }).onDuplicateKeyUpdate({ set: { ...input, updatedAt: new Date() } });
  const result = await db.select().from(coachProfiles).where(eq(coachProfiles.userId, userId)).limit(1);
  return result[0];
}

export async function getCoachProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(coachProfiles).where(eq(coachProfiles.userId, userId)).limit(1);
  return result[0];
}

export async function createCoachingSession(userId: number, data: { interviewType: string; timeline: string; focus: string; difficulty: string; mode: string; plannedSessions: number }) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(coachingSessions).values({ userId, ...data });
  const result = await db.select().from(coachingSessions).where(and(eq(coachingSessions.userId, userId), eq(coachingSessions.interviewType, data.interviewType))).orderBy(desc(coachingSessions.id)).limit(1);
  return result[0];
}

export async function getUserProgress(userId: number) {
  const db = await getDb();
  if (!db) return { profile: undefined, sessions: [], attempts: [], totals: { sessions: 0, attempts: 0, averageScore: 0 } };
  const [profile, sessions, attempts] = await Promise.all([
    getCoachProfile(userId),
    db.select().from(coachingSessions).where(eq(coachingSessions.userId, userId)).orderBy(desc(coachingSessions.createdAt)).limit(20),
    db.select().from(practiceAttempts).where(eq(practiceAttempts.userId, userId)).orderBy(desc(practiceAttempts.createdAt)).limit(20),
  ]);
  const averageScore = attempts.length ? Math.round(attempts.reduce((sum, item) => sum + item.overallScore, 0) / attempts.length) : 0;
  return { profile, sessions, attempts, totals: { sessions: sessions.length, attempts: attempts.length, averageScore } };
}

export async function recordPracticeAttempt(userId: number, sessionId: number, data: { question: string; answer: string; overallScore: number; technicalScore?: number; communicationScore?: number; confidenceScore?: number; timeManagementScore?: number; coachType: string; timeTaken: number }) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(practiceAttempts).values({ userId, sessionId, ...data });
  const current = await db.select().from(coachingSessions).where(and(eq(coachingSessions.id, sessionId), eq(coachingSessions.userId, userId))).limit(1);
  if (current[0]) {
    const nextCount = current[0].completedSessions + 1;
    const nextScore = current[0].completedSessions === 0 ? data.overallScore : Math.round((current[0].overallScore * 0.7) + (data.overallScore * 0.3));
    await db.update(coachingSessions).set({ completedSessions: nextCount, overallScore: nextScore, updatedAt: new Date() }).where(eq(coachingSessions.id, sessionId));
  }
  return data;
}

export async function recordInteraction(userId: number | undefined, sessionId: number | undefined, data: { eventType: string; path: string; metadata?: Record<string, unknown> }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(interactionEvents).values({ userId, sessionId, eventType: data.eventType, path: data.path, metadata: data.metadata ? JSON.stringify(data.metadata) : null });
}

export async function getAnalyticsSummary() {
  const db = await getDb();
  if (!db) return { totalEvents: 0, uniqueUsers: 0, byPath: [], byEvent: [], completionRate: 0 };
  const events = await db.select().from(interactionEvents).orderBy(desc(interactionEvents.createdAt)).limit(10000);
  const usersSeen = new Set<number>();
  const paths = new Map<string, number>();
  const eventTypes = new Map<string, number>();
  for (const event of events) {
    if (event.userId) usersSeen.add(event.userId);
    paths.set(event.path, (paths.get(event.path) || 0) + 1);
    eventTypes.set(event.eventType, (eventTypes.get(event.eventType) || 0) + 1);
  }
  const starts = eventTypes.get("session_started") || 0;
  const completions = eventTypes.get("practice_completed") || 0;
  return {
    totalEvents: events.length,
    uniqueUsers: usersSeen.size,
    byPath: Array.from(paths, ([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count),
    byEvent: Array.from(eventTypes, ([eventType, count]) => ({ eventType, count })).sort((a, b) => b.count - a.count),
    completionRate: starts ? Math.round((completions / starts) * 100) : 0,
  };
}
