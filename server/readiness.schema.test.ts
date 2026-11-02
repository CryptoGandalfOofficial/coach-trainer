import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
});
