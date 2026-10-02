import { describe, expect, it } from "vitest";
import { boundedWindowStart, calculateSwipeSteps, confidenceForSampleSize, easeOutCubic, swipeDirection, undoRangePayload } from "./chartInteractions";

describe("chart touch interactions", () => {
  it("turns a fast swipe into multiple bounded navigation steps", () => {
    expect(calculateSwipeSteps(-360, 120, 8)).toBeGreaterThan(1);
    expect(calculateSwipeSteps(-360, 120, 2)).toBe(2);
    expect(swipeDirection(-120)).toBe(1);
    expect(swipeDirection(120)).toBe(-1);
    expect(calculateSwipeSteps(20, 10, 8)).toBe(0);
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    expect(boundedWindowStart(2, 4, 5)).toBe(5);
    expect(boundedWindowStart(2, -4, 5)).toBe(0);
  });

  it("explains peer confidence at the configured sample thresholds", () => {
    expect(confidenceForSampleSize(1)).toBe("low");
    expect(confidenceForSampleSize(5)).toBe("medium");
    expect(confidenceForSampleSize(10)).toBe("high");
  });
});

describe("saved-range undo", () => {
  it("preserves the exact deleted range for restoration", () => {
    const deleted = { name: "Interview sprint", startDate: "2026-09-01", endDate: "2026-09-23" };
    expect(undoRangePayload(deleted)).toEqual(deleted);
    expect(undoRangePayload(null)).toBeNull();
  });
});
