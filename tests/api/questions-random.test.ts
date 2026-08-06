import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/questions/random/route";
import { pickWeightedRandomQuestion } from "@/lib/db/repository/question-repository";

vi.mock("@/lib/db/repository/question-repository", () => ({
  pickWeightedRandomQuestion: vi.fn(),
}));

describe("GET /api/questions/random", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Normal: pickWeightedRandomQuestion resolves a question -> status 200 and body matches", async () => {
    const mockQuestion = {
      id: 1,
      question: "What is TypeScript?",
      choices: ["A", "B", "C", "D"],
    };
    vi.mocked(pickWeightedRandomQuestion).mockResolvedValueOnce(mockQuestion);

    const request = new Request("http://localhost/api/questions/random");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockQuestion);
    expect(pickWeightedRandomQuestion).toHaveBeenCalledWith([]);
  });

  it("2. No question available -> status 404", async () => {
    vi.mocked(pickWeightedRandomQuestion).mockResolvedValueOnce(null);

    const request = new Request("http://localhost/api/questions/random");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toHaveProperty("error", "No questions available");
  });

  it("3. exclude query param parsing: valid numbers >0 -> passed to repo", async () => {
    vi.mocked(pickWeightedRandomQuestion).mockResolvedValueOnce({
      id: 2,
      question: "Q",
      choices: ["1", "2", "3", "4"],
    });

    const request = new Request("http://localhost/api/questions/random?exclude=1,2");
    await GET(request);

    expect(pickWeightedRandomQuestion).toHaveBeenCalledWith([1, 2]);
  });

  it("4. exclude query param parsing: filters out non-numbers, negative, or zero -> parsed correctly", async () => {
    vi.mocked(pickWeightedRandomQuestion).mockResolvedValueOnce({
      id: 2,
      question: "Q",
      choices: ["1", "2", "3", "4"],
    });

    const request = new Request("http://localhost/api/questions/random?exclude=abc,3,-1,0");
    await GET(request);

    expect(pickWeightedRandomQuestion).toHaveBeenCalledWith([3]);
  });

  it("5. Repository throws -> status 500", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(pickWeightedRandomQuestion).mockRejectedValueOnce(new Error("DB error"));

    const request = new Request("http://localhost/api/questions/random");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("error", "Internal server error");
    consoleErrorSpy.mockRestore();
  });
});
