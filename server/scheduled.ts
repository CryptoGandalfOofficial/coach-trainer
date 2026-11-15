import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { createWeeklySummaries } from "./db";
import { refreshApprovedTargetSources } from "./db";
import { notifyOwner } from "./_core/notification";

export async function weeklySummariesHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid)
      return res.status(403).json({ error: "cron-only" });
    const result = await createWeeklySummaries();
    return res.json({ ok: true, taskUid: user.taskUid, ...result });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context: { url: req.originalUrl, timestamp: new Date().toISOString() },
    });
  }
}

export async function targetSourceRefreshHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid)
      return res.status(403).json({ error: "cron-only" });
    const result = await refreshApprovedTargetSources("cron");
    let notified = false;
    if (result.changed > 0) {
      notified = await notifyOwner({
        title: "Atlas Readiness source changes detected",
        content: [
          `${result.changed} approved official source(s) changed and were moved to pending review.`,
          `Run: ${result.runId}; checked: ${result.checked}; errors: ${result.errors}.`,
          ...result.changes.map(change => `• ${change.title}: ${change.url}`),
        ].join("\n"),
      }).catch(error => {
        console.warn("[SourceRefresh] Owner notification failed:", error);
        return false;
      });
    }
    return res.json({ ok: true, taskUid: user.taskUid, notified, ...result });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context: { url: req.originalUrl, timestamp: new Date().toISOString() },
    });
  }
}
