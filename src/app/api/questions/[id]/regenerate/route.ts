import { withErrorHandling, ok, fail } from "@/lib/api/response";
import { questionIdParamSchema, regenerateQuestionSchema } from "@/lib/api/schemas";
import {
  getQuestionSource,
  replaceKnowledgeWithQuestion,
} from "@/lib/db/repository/question-repository";
import { generateQuestion } from "@/lib/llm/quiz";

type RegenerateRouteContext = { params: Promise<{ id: string }> };

export const maxDuration = 300;

export const POST = withErrorHandling(async function (request: Request, context?: unknown) {
  const raw = await (context as RegenerateRouteContext).params;
  const parsedId = questionIdParamSchema.safeParse(raw);
  if (!parsedId.success) return fail("Invalid question id", 400);

  const json = await request.json();
  const parsedBody = regenerateQuestionSchema.safeParse(json);
  if (!parsedBody.success) return fail("Invalid difficulty", 400);

  const questionId = parsedId.data.id;
  const { difficulty } = parsedBody.data;

  const source = await getQuestionSource(questionId);
  if (!source) return fail("Question not found", 404);

  const generatedQuestion = await generateQuestion(source.sourceText, difficulty);
  if (!generatedQuestion) return fail("Failed to generate question from LLM", 500);

  const result = await replaceKnowledgeWithQuestion({
    replaceQuestionId: questionId,
    title: source.title,
    sourceText: source.sourceText,
    question: generatedQuestion,
  });

  if (!result) return fail("Question not found", 404);

  return ok(
    {
      id: result.questionId,
      knowledgeId: result.knowledgeId,
      question: generatedQuestion.question,
      choices: generatedQuestion.choices,
      correctIndex: generatedQuestion.correctIndex,
      explanation: generatedQuestion.explanation,
    },
    200,
  );
}, "POST /api/questions/[id]/regenerate");
