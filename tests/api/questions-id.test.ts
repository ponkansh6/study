import { describe, it, expect, vi } from "vitest";
import { DELETE } from "@/app/api/questions/[id]/route";
import { deleteQuestion } from "@/lib/db/repository/question-repository";

vi.mock("@/lib/db/repository/question-repository", () => ({
  deleteQuestion: vi.fn(),
}));

describe("DELETE /api/questions/[id]", () => {
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

  it("1. Normal: valid id and deleteQuestion resolves true -> status 200 and { ok: true }", async () => {
    vi.mocked(deleteQuestion).mockResolvedValueOnce(true);

    const request = new Request("http://localhost/api/questions/1", { method: "DELETE" });
    const response = await DELETE(request, ctx("1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(deleteQuestion).toHaveBeenCalledWith(1);
  });

  it("2. Not found: deleteQuestion resolves false -> status 404", async () => {
    vi.mocked(deleteQuestion).mockResolvedValueOnce(false);

    const request = new Request("http://localhost/api/questions/999", { method: "DELETE" });
    const response = await DELETE(request, ctx("999"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toHaveProperty("error", "Question not found");
    expect(deleteQuestion).toHaveBeenCalledWith(999);
  });

  it.each([["abc"], ["0"], ["-1"]])(
    "3. Invalid id (%s) -> status 400 and repository not called",
    async (invalidId) => {
      vi.mocked(deleteQuestion).mockClear();

      const request = new Request(`http://localhost/api/questions/${invalidId}`, {
        method: "DELETE",
      });
      const response = await DELETE(request, ctx(invalidId));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toHaveProperty("error", "Invalid question id");
      expect(deleteQuestion).not.toHaveBeenCalled();
    },
  );

  it("4. Repository rejects -> status 500", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(deleteQuestion).mockRejectedValueOnce(new Error("DB error"));

    const request = new Request("http://localhost/api/questions/1", { method: "DELETE" });
    const response = await DELETE(request, ctx("1"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("error", "Internal server error");
    consoleErrorSpy.mockRestore();
  });
});
