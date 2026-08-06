import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { backoffMs, callGemini } from "@/lib/llm/client";
import { setEnv } from "../helpers/env";

const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn(() => ({
  generateContent: mockGenerateContent,
}));

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: function () {
      return {
        getGenerativeModel: mockGetGenerativeModel,
      };
    },
  };
});

vi.mock("@/lib/sleep", () => ({
  sleep: vi.fn(async () => {}),
}));

describe("llm/client", () => {
  const originalEnv = process.env.GOOGLE_API_KEY;

  beforeEach(() => {
    setEnv("GOOGLE_API_KEY", "test-api-key");
  });

  afterEach(() => {
    setEnv("GOOGLE_API_KEY", originalEnv);
  });

  describe("backoffMs", () => {
    it("should calculate backoff with default baseMs", () => {
      const val0 = backoffMs(0, 2000);
      expect(val0).toBeGreaterThanOrEqual(2000);
      expect(val0).toBeLessThan(4000);

      const val2 = backoffMs(2, 100);
      expect(val2).toBeGreaterThanOrEqual(400);
      expect(val2).toBeLessThan(500);
    });
  });

  describe("callGemini", () => {
    it("1. GOOGLE_API_KEY unset -> throws error", async () => {
      setEnv("GOOGLE_API_KEY", undefined);
      await expect(callGemini("prompt", 100, 1000)).rejects.toThrow(
        "GOOGLE_API_KEY environment variable is not set",
      );
    });

    it("2. Normal success -> returns text", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => "success response",
        },
      });

      const res = await callGemini("prompt", 100, 1000);
      expect(res).toBe("success response");
      expect(mockGetGenerativeModel).toHaveBeenCalled();
    });

    it("3. 429 rate limit then success -> retries and returns text", async () => {
      mockGenerateContent
        .mockRejectedValueOnce({ status: 429, message: "Rate limited" })
        .mockResolvedValueOnce({
          response: {
            text: () => "success after 429",
          },
        });

      const res = await callGemini("prompt", 100, 1000, 2);
      expect(res).toBe("success after 429");
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("4. Transient 5xx then success -> retries and returns text", async () => {
      mockGenerateContent
        .mockRejectedValueOnce({ message: "500 Internal Server Error" })
        .mockResolvedValueOnce({
          response: {
            text: () => "success after 500",
          },
        });

      const res = await callGemini("prompt", 100, 1000, 2);
      expect(res).toBe("success after 500");
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("5. Transient overloaded/timeout message then success -> retries and returns text", async () => {
      mockGenerateContent
        .mockRejectedValueOnce({ message: "Model is overloaded" })
        .mockResolvedValueOnce({
          response: {
            text: () => "success after overload",
          },
        });

      const res = await callGemini("prompt", 100, 1000, 2);
      expect(res).toBe("success after overload");
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("6. Always failing rate limit -> throws error after retries", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockGenerateContent.mockRejectedValue({ status: 429, message: "Rate limited" });

      await expect(callGemini("prompt", 100, 1000, 1)).rejects.toThrow();
      consoleWarnSpy.mockRestore();
    });

    it("7. Non-transient error (status 400) -> throws immediately without retrying", async () => {
      mockGenerateContent.mockRejectedValueOnce({ status: 400, message: "Bad Request" });

      await expect(callGemini("prompt", 100, 1000, 3)).rejects.toThrow(
        "Gemini API error: Bad Request (status: 400)",
      );
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });
});
