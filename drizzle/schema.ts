import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";

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
  userId: int("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  preferredLanguage: varchar("preferredLanguage", { length: 32 })
    .default("en")
    .notNull(),
  country: varchar("country", { length: 64 }),
  targetRole: varchar("targetRole", { length: 128 }),
  experienceLevel: varchar("experienceLevel", { length: 32 }),
  weeklyMinutes: int("weeklyMinutes"),
  preferredModuleDifficulty: varchar("preferredModuleDifficulty", {
    length: 32,
  })
    .default("intermediate")
    .notNull(),
  preferredModuleDuration: int("preferredModuleDuration").default(30).notNull(),
  savedDateRanges: text("savedDateRanges"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const targetStandards = mysqlTable("target_standards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  outcomeType: varchar("outcomeType", { length: 64 }).notNull(),
  targetName: varchar("targetName", { length: 160 }).notNull(),
  evaluator: varchar("evaluator", { length: 160 }),
  jurisdiction: varchar("jurisdiction", { length: 96 }),
  targetDate: timestamp("targetDate"),
  language: varchar("language", { length: 32 }).default("en").notNull(),
  format: varchar("format", { length: 96 }),
  sourceUrl: varchar("sourceUrl", { length: 512 }),
  notes: text("notes"),
  version: varchar("version", { length: 32 }).default("v1").notNull(),
  rubricCriteria: text("rubricCriteria").notNull(),
  reviewStatus: varchar("reviewStatus", { length: 32 })
    .default("draft")
    .notNull(),
  rubricModules: text("rubricModules"),
  lastReviewedAt: timestamp("lastReviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const targetStandardVersions = mysqlTable("target_standard_versions", {
  id: int("id").autoincrement().primaryKey(),
  targetStandardId: int("targetStandardId")
    .notNull()
    .references(() => targetStandards.id, { onDelete: "cascade" }),
  versionNumber: int("versionNumber").notNull(),
  snapshot: text("snapshot").notNull(),
  changeNote: varchar("changeNote", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const targetSources = mysqlTable("target_sources", {
  id: int("id").autoincrement().primaryKey(),
  targetStandardId: int("targetStandardId")
    .notNull()
    .references(() => targetStandards.id, { onDelete: "cascade" }),
  jurisdiction: varchar("jurisdiction", { length: 96 }),
  url: varchar("url", { length: 512 }).notNull(),
  title: varchar("title", { length: 240 }),
  publisher: varchar("publisher", { length: 160 }),
  sourceType: varchar("sourceType", { length: 64 })
    .default("official")
    .notNull(),
  contentExcerpt: text("contentExcerpt"),
  contentHash: varchar("contentHash", { length: 64 }),
  status: varchar("status", { length: 32 }).default("pending_review").notNull(),
  changeStatus: varchar("changeStatus", { length: 32 })
    .default("stable")
    .notNull(),
  lastChangedAt: timestamp("lastChangedAt"),
  reviewNotes: varchar("reviewNotes", { length: 512 }),
  fetchedAt: timestamp("fetchedAt"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const targetSourceRefreshRuns = mysqlTable(
  "target_source_refresh_runs",
  {
    id: int("id").autoincrement().primaryKey(),
    runId: varchar("runId", { length: 64 }).notNull().unique(),
    triggerType: varchar("triggerType", { length: 32 }).notNull(),
    status: varchar("status", { length: 32 }).notNull(),
    startedAt: timestamp("startedAt").defaultNow().notNull(),
    completedAt: timestamp("completedAt"),
    checked: int("checked").default(0).notNull(),
    changed: int("changed").default(0).notNull(),
    errors: int("errors").default(0).notNull(),
    skipped: int("skipped").default(0).notNull(),
    errorMessage: text("errorMessage"),
    lastSuccessfulRefreshAt: timestamp("lastSuccessfulRefreshAt"),
  }
);

export const targetSourceRefreshLocks = mysqlTable(
  "target_source_refresh_locks",
  {
    lockKey: varchar("lockKey", { length: 64 }).primaryKey(),
    runId: varchar("runId", { length: 64 }),
    lockedUntil: timestamp("lockedUntil"),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  }
);

export const targetSourceReviews = mysqlTable("target_source_reviews", {
  id: int("id").autoincrement().primaryKey(),
  sourceId: int("sourceId")
    .notNull()
    .references(() => targetSources.id, { onDelete: "cascade" }),
  reviewerUserId: int("reviewerUserId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  previousStatus: varchar("previousStatus", { length: 32 }),
  status: varchar("status", { length: 32 }).notNull(),
  reviewNotes: varchar("reviewNotes", { length: 512 }),
  reviewedAt: timestamp("reviewedAt").defaultNow().notNull(),
});

export const readinessScoreHistory = mysqlTable("readiness_score_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetStandardId: int("targetStandardId")
    .notNull()
    .references(() => targetStandards.id, { onDelete: "cascade" }),
  version: varchar("version", { length: 32 }).notNull(),
  score: int("score").notNull(),
  overallPracticeScore: int("overallPracticeScore").notNull(),
  attempts: int("attempts").notNull(),
  confidence: varchar("confidence", { length: 16 }).notNull(),
  breakdown: text("breakdown").notNull(),
  forecast: text("forecast"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const readinessForecastOutcomes = mysqlTable(
  "readiness_forecast_outcomes",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetStandardId: int("targetStandardId")
      .notNull()
      .references(() => targetStandards.id, { onDelete: "cascade" }),
    historyId: int("historyId")
      .notNull()
      .references(() => readinessScoreHistory.id, { onDelete: "cascade" }),
    actualOutcome: varchar("actualOutcome", { length: 32 }).notNull(),
    actualScore: int("actualScore"),
    notes: varchar("notes", { length: 512 }),
    observedAt: timestamp("observedAt").defaultNow().notNull(),
  }
);

export const coachingSessions = mysqlTable("coaching_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
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
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionId: int("sessionId")
    .notNull()
    .references(() => coachingSessions.id, { onDelete: "cascade" }),
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
  sessionId: int("sessionId").references(() => coachingSessions.id, {
    onDelete: "set null",
  }),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  path: varchar("path", { length: 64 }).notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const weeklySummaries = mysqlTable(
  "weekly_summaries",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekStart: timestamp("weekStart").notNull(),
    attempts: int("attempts").default(0).notNull(),
    averageScore: int("averageScore").default(0).notNull(),
    minutesPracticed: int("minutesPracticed").default(0).notNull(),
    summaryText: text("summaryText").notNull(),
    skillTrends: text("skillTrends"),
    retentionRate: int("retentionRate"),
    recommendedModules: text("recommendedModules"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    userWeekUnique: unique("weekly_summaries_user_week_unique").on(
      table.userId,
      table.weekStart
    ),
  })
);

export type CoachProfile = typeof coachProfiles.$inferSelect;
export type CoachingSession = typeof coachingSessions.$inferSelect;
export type PracticeAttempt = typeof practiceAttempts.$inferSelect;
export type InteractionEvent = typeof interactionEvents.$inferSelect;
export type WeeklySummary = typeof weeklySummaries.$inferSelect;
