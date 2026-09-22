import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { ENV } from "./_core/env";
import { coachingSessions, coachProfiles, interactionEvents, practiceAttempts, users, weeklySummaries, type InsertUser } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
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

export async function getLatestWeeklySummary(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(weeklySummaries).where(eq(weeklySummaries.userId, userId)).orderBy(desc(weeklySummaries.weekStart)).limit(1);
  return result[0] ?? null;
}

function currentWeekStart() {
  const result = new Date();
  result.setUTCHours(0, 0, 0, 0);
  result.setUTCDate(result.getUTCDate() - result.getUTCDay());
  return result;
}

export async function createWeeklySummaries() {
  const db = await getDb();
  if (!db) return { created: 0, weekStart: currentWeekStart() };
  const weekStart = currentWeekStart();
  const [allUsers, attempts] = await Promise.all([
    db.select().from(users).limit(10000),
    db.select().from(practiceAttempts).limit(10000),
  ]);
  const thisWeek = attempts.filter((attempt) => attempt.createdAt >= weekStart);
  let created = 0;
  for (const user of allUsers) {
    const userAttempts = thisWeek.filter((attempt) => attempt.userId === user.id);
    const minutes = userAttempts.reduce((sum, attempt) => sum + attempt.timeTaken, 0);
    const average = userAttempts.length ? Math.round(userAttempts.reduce((sum, attempt) => sum + attempt.overallScore, 0) / userAttempts.length) : 0;
    const summaryText = userAttempts.length
      ? `You completed ${userAttempts.length} practice ${userAttempts.length === 1 ? "attempt" : "attempts"} this week, practiced for ${minutes} minutes, and averaged ${average}/10. Keep the streak by choosing one focused drill next.`
      : "No practice attempts were recorded this week. Start with one focused drill to keep your preparation moving.";
    await db.insert(weeklySummaries).values({ userId: user.id, weekStart, attempts: userAttempts.length, averageScore: average, minutesPracticed: minutes, summaryText }).onDuplicateKeyUpdate({ set: { attempts: userAttempts.length, averageScore: average, minutesPracticed: minutes, summaryText, createdAt: new Date() } });
    created += 1;
  }
  return { created, weekStart };
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

function weekStart(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  result.setDate(result.getDate() - day);
  return result;
}

function weekKey(date: Date) { return weekStart(date).toISOString().slice(0, 10); }
function weekDelta(start: Date, end: Date) { return Math.max(0, Math.floor((weekStart(end).getTime() - weekStart(start).getTime()) / 604800000)); }

type ScoreBucket = { count: number; total: number; technical: number; communication: number; confidence: number; time: number };
function addScore(bucket: ScoreBucket | undefined, attempt: typeof practiceAttempts.$inferSelect) {
  const next = bucket || { count: 0, total: 0, technical: 0, communication: 0, confidence: 0, time: 0 };
  next.count += 1; next.total += attempt.overallScore; next.technical += attempt.technicalScore || 0; next.communication += attempt.communicationScore || 0; next.confidence += attempt.confidenceScore || 0; next.time += attempt.timeManagementScore || 0;
  return next;
}
function avg(value: number, count: number) { return count ? Math.round((value / count) * 10) / 10 : 0; }

export async function getAnalyticsSummary() {
  const db = await getDb();
  if (!db) return { totalEvents: 0, uniqueUsers: 0, byPath: [], byEvent: [], completionRate: 0, retentionCohorts: [], skillTrends: [], coachQuality: [] };
  const [events, allUsers, attempts, sessions] = await Promise.all([
    db.select().from(interactionEvents).orderBy(desc(interactionEvents.createdAt)).limit(10000),
    db.select().from(users).limit(10000),
    db.select().from(practiceAttempts).orderBy(desc(practiceAttempts.createdAt)).limit(10000),
    db.select().from(coachingSessions).limit(10000),
  ]);
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

  const activeWeeks = new Map<number, Set<number>>();
  for (const event of events) {
    if (!event.userId) continue;
    const user = allUsers.find((item) => item.id === event.userId);
    if (!user) continue;
    const cohort = weekStart(user.createdAt);
    const weeks = activeWeeks.get(event.userId) || new Set<number>();
    weeks.add(weekDelta(cohort, event.createdAt));
    activeWeeks.set(event.userId, weeks);
  }
  const cohortBuckets = new Map<string, { users: Set<number>; retained: Map<number, Set<number>> }>();
  for (const user of allUsers) {
    const cohort = weekKey(user.createdAt);
    const bucket = cohortBuckets.get(cohort) || { users: new Set<number>(), retained: new Map<number, Set<number>>() };
    bucket.users.add(user.id);
    const weeks = activeWeeks.get(user.id) || new Set<number>();
    for (const week of Array.from(weeks)) { const set = bucket.retained.get(week) || new Set<number>(); set.add(user.id); bucket.retained.set(week, set); }
    cohortBuckets.set(cohort, bucket);
  }
  const retentionCohorts = Array.from(cohortBuckets.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([cohort, bucket]) => ({ cohort, users: bucket.users.size, weeks: [0, 1, 2, 3, 4].map((week) => ({ week, retained: bucket.retained.get(week)?.size || 0, rate: avg((bucket.retained.get(week)?.size || 0) * 100, bucket.users.size) })) }));

  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const skillBuckets = new Map<string, Map<string, ScoreBucket>>();
  const qualityBuckets = new Map<string, ScoreBucket>();
  for (const attempt of attempts) {
    const session = sessionById.get(attempt.sessionId);
    const skill = session?.interviewType || "unknown";
    const key = weekKey(attempt.createdAt);
    const skillMap = skillBuckets.get(skill) || new Map<string, ScoreBucket>();
    skillMap.set(key, addScore(skillMap.get(key), attempt));
    skillBuckets.set(skill, skillMap);
    qualityBuckets.set(attempt.coachType, addScore(qualityBuckets.get(attempt.coachType), attempt));
  }
  const skillTrends = Array.from(skillBuckets.entries()).flatMap(([skill, weeks]) => Array.from(weeks.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([week, bucket]) => ({ skill, week, attempts: bucket.count, overall: avg(bucket.total, bucket.count), communication: avg(bucket.communication, bucket.count), confidence: avg(bucket.confidence, bucket.count), technical: avg(bucket.technical, bucket.count), timeManagement: avg(bucket.time, bucket.count) })));
  const coachQuality = Array.from(qualityBuckets.entries()).map(([coachType, bucket]) => ({ coachType, attempts: bucket.count, overall: avg(bucket.total, bucket.count), communication: avg(bucket.communication, bucket.count), confidence: avg(bucket.confidence, bucket.count), technical: avg(bucket.technical, bucket.count), timeManagement: avg(bucket.time, bucket.count) })).sort((a, b) => b.overall - a.overall);

  return { totalEvents: events.length, uniqueUsers: usersSeen.size, byPath: Array.from(paths, ([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count), byEvent: Array.from(eventTypes, ([eventType, count]) => ({ eventType, count })).sort((a, b) => b.count - a.count), completionRate: starts ? Math.round((completions / starts) * 100) : 0, retentionCohorts, skillTrends, coachQuality };
}
