import { pickWeightedRandomQuestion } from "@/lib/db/repository/question-repository";
import { ok, fail } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const excludeParam = url.searchParams.get("exclude");
    let excludeIds: number[] = [];

    if (excludeParam) {
      excludeIds = excludeParam
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n) && n > 0);
    }

    const question = await pickWeightedRandomQuestion(excludeIds);

    if (!question) {
      return fail("No questions available", 404);
    }

    return ok(question);
  } catch (error) {
    console.error("Error in GET /api/questions/random:", error);
    return fail("Internal server error", 500);
  }
}
