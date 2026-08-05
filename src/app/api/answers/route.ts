import { getQuestionById } from "@/lib/db/repository/question-repository";
import { recordAnswer } from "@/lib/db/repository/answer-repository";
import { submitAnswerSchema } from "@/lib/api/schemas";
import { ok, fail } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = submitAnswerSchema.safeParse(json);

    if (!parsed.success) {
      return fail("Invalid parameters", 400);
    }

    const { questionId, selectedIndex } = parsed.data;

    const question = await getQuestionById(questionId);
    if (!question) {
      return fail("Question not found", 404);
    }

    const isCorrect = selectedIndex === question.correctIndex;

    await recordAnswer({
      questionId,
      selectedIndex,
      isCorrect,
    });

    return ok({
      isCorrect,
      correctIndex: question.correctIndex,
      explanation: question.explanation,
    });
  } catch (error) {
    console.error("Error in POST /api/answers:", error);
    return fail("Internal server error", 500);
  }
}
