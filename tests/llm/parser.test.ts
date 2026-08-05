import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { parseWithRetry } from "@/lib/llm/parser";

vi.mock("@/lib/llm/client", () => ({
  backoffMs: vi.fn(() => 0),
}));

vi.mock("@/lib/sleep", () => ({
  sleep: vi.fn(async () => {}),
}));

describe("parseWithRetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const schema = z.object({ ok: z.boolean() });

  it("1. Success: fetcher returns valid JSON -> returns parsed value", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(JSON.stringify({ ok: true }));
    const result = await parseWithRetry(fetcher, schema, "test-context");

    expect(result).toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("2. fetcher throws -> returns null and logs error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("Network error"));

    const result = await parseWithRetry(fetcher, schema, "test-context");

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("3. fetcher returns null -> returns null", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(null);
    const result = await parseWithRetry(fetcher, schema, "test-context");

    expect(result).toBeNull();
  });

  it("4. Invalid JSON then valid on retry -> returns parsed value", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce("not json")
      .mockResolvedValueOnce(JSON.stringify({ ok: true }));

    const result = await parseWithRetry(fetcher, schema, "test-context");

    expect(result).toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("5. Invalid JSON always -> returns null after exhausting retries", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetcher = vi.fn().mockResolvedValue("not json");

    const result = await parseWithRetry(fetcher, schema, "test-context");

    expect(result).toBeNull();
    // LLM_MAX_PARSE_RETRIES is 2, so attempts = 0, 1, 2 (3 calls total)
    expect(fetcher).toHaveBeenCalledTimes(3);
    consoleWarnSpy.mockRestore();
  });

  it("6. transform throws then retry succeeds -> returns parsed value", async () => {
    const fetcher = vi.fn().mockResolvedValue(JSON.stringify({ ok: true }));
    let callCount = 0;
    const transform = vi.fn((parsed: unknown) => {
      callCount++;
      if (callCount === 1) {
        throw new Error("Transform fail");
      }
      return parsed;
    });

    const result = await parseWithRetry(fetcher, schema, "test-context", transform);

    expect(result).toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(transform).toHaveBeenCalledTimes(2);
  });

  it("7. transform throws always -> returns null after retries", async () => {
    const fetcher = vi.fn().mockResolvedValue(JSON.stringify({ ok: true }));
    const transform = vi.fn(() => {
      throw new Error("Always fail transform");
    });

    const result = await parseWithRetry(fetcher, schema, "test-context", transform);

    expect(result).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("8. Schema validation fails then succeeds on retry -> returns parsed value", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify({ ok: "not-boolean" }))
      .mockResolvedValueOnce(JSON.stringify({ ok: true }));

    const result = await parseWithRetry(fetcher, schema, "test-context");

    expect(result).toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("9. Schema validation fails always -> returns null", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetcher = vi.fn().mockResolvedValue(JSON.stringify({ ok: "not-boolean" }));

    const result = await parseWithRetry(fetcher, schema, "test-context");

    expect(result).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(3);
    consoleWarnSpy.mockRestore();
  });
});
