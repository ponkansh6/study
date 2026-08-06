import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateQuestion } from "@/lib/llm/quiz";
import { validLlmJson } from "../fixtures/llm";
import { QUIZ_GENERATION_PROMPT } from "@/lib/llm/prompts";

const mockCallGemini = vi.fn();

vi.mock("@/lib/llm/client", () => ({
  callGemini: (...args: unknown[]) => mockCallGemini(...args),
  backoffMs: vi.fn(() => 0),
}));

vi.mock("@/lib/sleep", () => ({
  sleep: vi.fn(async () => {}),
}));

describe("generateQuestion", () => {
  beforeEach(() => {
    mockCallGemini.mockReset();
  });

  it("parses valid LLM JSON into a GeneratedQuestion", async () => {
    mockCallGemini.mockResolvedValueOnce(validLlmJson);

    const result = await generateQuestion("フランスの首都は？");

    expect(result).toEqual({
      question: "What is 2+2?",
      choices: ["1", "2", "3", "4"],
      correctIndex: 3,
      explanation: "2 + 2 = 4",
    });
    expect(mockCallGemini).toHaveBeenCalledTimes(1);
  });

  it("returns null when callGemini returns null", async () => {
    mockCallGemini.mockResolvedValueOnce(null);

    expect(await generateQuestion("source")).toBeNull();
  });

  it("returns null when the LLM output is invalid JSON", async () => {
    mockCallGemini.mockResolvedValueOnce("not json");

    expect(await generateQuestion("source")).toBeNull();
  });

  it("injects the source text into the prompt", async () => {
    mockCallGemini.mockResolvedValueOnce(validLlmJson);

    await generateQuestion("独自のナレッジ文");

    const prompt = mockCallGemini.mock.calls[0][0] as string;
    expect(prompt).toContain("独自のナレッジ文");
    expect(prompt).toContain(QUIZ_GENERATION_PROMPT.slice(0, 50));
  });
});