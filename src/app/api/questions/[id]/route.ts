import { withErrorHandling, ok, fail } from "@/lib/api/response";
import { questionIdParamSchema } from "@/lib/api/schemas";
import { deleteQuestion } from "@/lib/db/repository/question-repository";

type QuestionRouteContext = { params: Promise<{ id: string }> };

export const DELETE = withErrorHandling(async function (_req: Request, context?: unknown) {
  const raw = await (context as QuestionRouteContext).params;
  const parsed = questionIdParamSchema.safeParse(raw);
  if (!parsed.success) return fail("Invalid question id", 400);
  if (!(await deleteQuestion(parsed.data.id))) return fail("Question not found", 404);
  return ok({ ok: true });
}, "DELETE /api/questions/[id]");
