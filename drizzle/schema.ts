import { int, mysqlEnum, mysqlTable, text, timestamp, unique, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const coachProfiles = mysqlTable("coach_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  preferredLanguage: varchar("preferredLanguage", { length: 32 }).default("en").notNull(),
  country: varchar("country", { length: 64 }),
  targetRole: varchar("targetRole", { length: 128 }),
  experienceLevel: varchar("experienceLevel", { length: 32 }),
  weeklyMinutes: int("weeklyMinutes"),
  preferredModuleDifficulty: varchar("preferredModuleDifficulty", { length: 32 }).default("intermediate").notNull(),
  preferredModuleDuration: int("preferredModuleDuration").default(30).notNull(),
  savedDateRanges: text("savedDateRanges"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const coachingSessions = mysqlTable("coaching_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  interviewType: varchar("interviewType", { length: 64 }).notNull(),
  timeline: varchar("timeline", { length: 32 }).notNull(),
  focus: varchar("focus", { length: 160 }).notNull(),
  difficulty: varchar("difficulty", { length: 32 }).notNull(),
  mode: varchar("mode", { length: 64 }).notNull(),
  plannedSessions: int("plannedSessions").notNull(),
  completedSessions: int("completedSessions").default(0).notNull(),
  overallScore: int("overallScore").default(0).notNull(),
  status: varchar("status", { length: 32 }).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const practiceAttempts = mysqlTable("practice_attempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: int("sessionId").notNull().references(() => coachingSessions.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  overallScore: int("overallScore").notNull(),
  technicalScore: int("technicalScore"),
  communicationScore: int("communicationScore"),
  confidenceScore: int("confidenceScore"),
  timeManagementScore: int("timeManagementScore"),
  coachType: varchar("coachType", { length: 32 }).notNull(),
  timeTaken: int("timeTaken").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const interactionEvents = mysqlTable("interaction_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  sessionId: int("sessionId").references(() => coachingSessions.id, { onDelete: "set null" }),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  path: varchar("path", { length: 64 }).notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const weeklySummaries = mysqlTable("weekly_summaries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  weekStart: timestamp("weekStart").notNull(),
  attempts: int("attempts").default(0).notNull(),
  averageScore: int("averageScore").default(0).notNull(),
  minutesPracticed: int("minutesPracticed").default(0).notNull(),
  summaryText: text("summaryText").notNull(),
  skillTrends: text("skillTrends"),
  retentionRate: int("retentionRate"),
  recommendedModules: text("recommendedModules"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ userWeekUnique: unique("weekly_summaries_user_week_unique").on(table.userId, table.weekStart) }));

export type CoachProfile = typeof coachProfiles.$inferSelect;
export type CoachingSession = typeof coachingSessions.$inferSelect;
export type PracticeAttempt = typeof practiceAttempts.$inferSelect;
export type InteractionEvent = typeof interactionEvents.$inferSelect;
export type WeeklySummary = typeof weeklySummaries.$inferSelect;
