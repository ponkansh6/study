import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateQuestion } from "@/lib/llm/quiz";
import { validLlmJson } from "../fixtures/llm";
import { QUIZ_GENERATION_PROMPT, buildQuizPrompt } from "@/lib/llm/prompts";
import { LLM_QUIZ_MAX_TOKENS, LLM_QUIZ_MAX_TOKENS_HARD } from "@/lib/constants";

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
    // Default difficulty omitted -> maxTokens = 512
    expect(mockCallGemini.mock.calls[0][1]).toBe(LLM_QUIZ_MAX_TOKENS);
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

  it("uses difficulty 3 prompt and maxTokens 1024 when difficulty=3 is passed", async () => {
    mockCallGemini.mockResolvedValueOnce(validLlmJson);

    await generateQuestion("ソース文", 3);

    const [prompt, maxTokens] = mockCallGemini.mock.calls[0];
    expect(prompt).toBe(buildQuizPrompt("ソース文", 3));
    expect(maxTokens).toBe(LLM_QUIZ_MAX_TOKENS_HARD);
  });
});
