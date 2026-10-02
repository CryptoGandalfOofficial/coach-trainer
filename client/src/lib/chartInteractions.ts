export type SavedRange = { name: string; startDate: string; endDate: string };

export function calculateSwipeSteps(deltaX: number, elapsedMs: number, maxSteps: number) {
  if (Math.abs(deltaX) < 45 || maxSteps <= 0) return 0;
  const velocity = Math.abs(deltaX) / Math.max(1, elapsedMs);
  return Math.min(maxSteps, Math.max(1, Math.round(Math.abs(deltaX) / 100 + velocity * 180)));
}

export function swipeDirection(deltaX: number) {
  return deltaX < 0 ? 1 : -1;
}

export function easeOutCubic(progress: number) {
  const clamped = Math.min(1, Math.max(0, progress));
  return 1 - Math.pow(1 - clamped, 3);
}

export function boundedWindowStart(current: number, delta: number, maxStart: number) {
  return Math.max(0, Math.min(maxStart, current + delta));
}

export function confidenceForSampleSize(sampleSize: number) {
  if (sampleSize >= 10) return "high";
  if (sampleSize >= 5) return "medium";
  return "low";
}

export function undoRangePayload(range: SavedRange | null) {
  return range ? { ...range } : null;
}
