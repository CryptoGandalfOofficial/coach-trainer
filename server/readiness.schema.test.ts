import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEFAULT_CALIBRATION_MINIMUM_SAMPLE_SIZE,
  forecastMatchesOutcome,
  getSourceRefreshStatusForCounts,
  isSourceRefreshLeaseAvailable,
  reconcileSourceRefreshCounts,
} from "./db";

describe("Atlas Readiness schema repair", () => {
  it("records the fields required by target, source, and history queries", () => {
    const migration = readFileSync(
      resolve(process.cwd(), "drizzle/0011_flaky_power_man.sql"),
      "utf8"
    );

    expect(migration).toContain("CREATE TABLE `readiness_score_history`");
    expect(migration).toContain("`contentHash` varchar(64)");
    expect(migration).toContain("`changeStatus` varchar(32)");
    expect(migration).toContain("`lastChangedAt` timestamp");
    expect(migration).toContain("`rubricModules` text");
    expect(migration).toContain("readiness_score_history_userId_users_id_fk");
    expect(migration).toContain(
      "readiness_score_history_targetStandardId_target_standards_id_fk"
    );
  });

  it("records review decisions and actual forecast outcomes", () => {
    const migration = readFileSync(
      resolve(process.cwd(), "drizzle/0012_petite_vertigo.sql"),
      "utf8"
    );

    expect(migration).toContain("CREATE TABLE `target_source_reviews`");
    expect(migration).toContain("`previousStatus` varchar(32)");
    expect(migration).toContain("CREATE TABLE `readiness_forecast_outcomes`");
    expect(migration).toContain("`actualOutcome` varchar(32) NOT NULL");
    expect(migration).toContain("rfo_standard_fk");
    expect(migration).toContain("tsr_source_fk");
  });

  it("only counts a forecast as correct when its risk signal matches reality", () => {
    expect(forecastMatchesOutcome("on-track", "passed")).toBe(true);
    expect(forecastMatchesOutcome("plausible", "passed")).toBe(true);
    expect(forecastMatchesOutcome("at-risk", "not-passed")).toBe(true);
    expect(forecastMatchesOutcome("at-risk", "passed")).toBe(false);
    expect(forecastMatchesOutcome("unknown", "passed")).toBe(false);
  });

  it("keeps source-change alerts and calibration dimensions wired", () => {
    const database = readFileSync(
      resolve(process.cwd(), "server/db.ts"),
      "utf8"
    );
    const scheduled = readFileSync(
      resolve(process.cwd(), "server/scheduled.ts"),
      "utf8"
    );

    expect(database).toContain(
      "const changes: Array<{ id: number; title: string; url: string }>"
    );
    expect(database).toContain(
      'outcomeType: standard?.outcomeType || "unknown"'
    );
    expect(database).toContain(
      'jurisdiction: standard?.jurisdiction || "Global / unspecified"'
    );
    expect(database).toContain(
      "accuracyPercent: Math.round((bucket.correct / bucket.total) * 100)"
    );
    expect(scheduled).toContain("result.changes.map(change =>");
    expect(scheduled).toContain("notified");
  });

  it("uses an honest configurable minimum sample default", () => {
    expect(DEFAULT_CALIBRATION_MINIMUM_SAMPLE_SIZE).toBe(30);
    const database = readFileSync(
      resolve(process.cwd(), "server/db.ts"),
      "utf8"
    );
    const home = readFileSync(
      resolve(process.cwd(), "client/src/pages/Home.tsx"),
      "utf8"
    );
    expect(database).toContain("READINESS_MIN_CALIBRATION_SAMPLE_SIZE");
    expect(database).toContain("lowSample: bucket.total < minimumSampleSize");
    expect(home).toContain("Directional estimate");
    expect(home).toContain("Low sample");
    expect(home).toContain("segment.minimumSampleSize");
  });

  it("protects source refreshes with a durable lock and unique run identity", () => {
    const migration = readFileSync(
      resolve(process.cwd(), "drizzle/0013_stale_hiroim.sql"),
      "utf8"
    );
    const database = readFileSync(
      resolve(process.cwd(), "server/db.ts"),
      "utf8"
    );
    const scheduled = readFileSync(
      resolve(process.cwd(), "server/scheduled.ts"),
      "utf8"
    );

    expect(migration).toContain("CREATE TABLE `target_source_refresh_locks`");
    expect(migration).toContain("CREATE TABLE `target_source_refresh_runs`");
    expect(migration).toContain("target_source_refresh_runs_runId_unique");
    expect(database).toContain("UPDATE target_source_refresh_locks");
    expect(database).toContain("eq(targetSourceRefreshLocks.runId, runId)");
    expect(database).toContain("lastSuccessfulRefreshAt");
    expect(scheduled).toContain('refreshApprovedTargetSources("cron")');
  });

  it("handles lease boundaries, reconciles counters, and labels partial runs", () => {
    const now = new Date("2026-11-15T18:00:00.000Z");
    expect(isSourceRefreshLeaseAvailable(null, now)).toBe(true);
    expect(
      isSourceRefreshLeaseAvailable(new Date("2026-11-15T17:59:59.000Z"), now)
    ).toBe(true);
    expect(
      isSourceRefreshLeaseAvailable(new Date("2026-11-15T18:00:01.000Z"), now)
    ).toBe(false);
    expect(reconcileSourceRefreshCounts(10, 7, 2)).toEqual({
      checked: 7,
      errors: 2,
      skipped: 1,
    });
    expect(reconcileSourceRefreshCounts(3, 5, 0).skipped).toBe(0);
    expect(getSourceRefreshStatusForCounts(10, 0)).toBe("succeeded");
    expect(getSourceRefreshStatusForCounts(8, 2)).toBe("partial");
  });
});
