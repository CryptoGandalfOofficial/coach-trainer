import { describe, expect, it } from "vitest";

describe("OpenRouter live configuration", () => {
  it("accepts the configured server-side key without exposing it", async () => {
    const key = process.env.OPENROUTER_API_KEY;
    expect(key, "OPENROUTER_API_KEY must be configured for this live test").toBeTruthy();
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000),
    });
    expect(response.ok).toBe(true);
    const payload = await response.json() as { data?: Array<{ id?: string }> };
    expect(payload.data?.some((model) => model.id === "google/gemini-2.5-flash")).toBe(true);
  }, 20000);
});
