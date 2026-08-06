import { generateQuestion } from "@/lib/llm/quiz";
import { createKnowledgeWithQuestion } from "@/lib/db/repository/question-repository";
import { createQuestionSchema } from "@/lib/api/schemas";
import { ok, fail, withErrorHandling } from "@/lib/api/response";

export const maxDuration = 300;

export const POST = withErrorHandling(async function (request: Request) {
  const json = await request.json();
  const parsed = createQuestionSchema.safeParse(json);

  if (!parsed.success) {
    return fail("sourceText is required", 400);
  }

  const { sourceText } = parsed.data;

  const generatedQuestion = await generateQuestion(sourceText);
  if (!generatedQuestion) {
    return fail("Failed to generate question from LLM", 500);
  }

  const title = sourceText
    .slice(0, 100)
    .replace(/[\n\r\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const result = await createKnowledgeWithQuestion({
    title,
    sourceText,
    question: generatedQuestion,
  });

  return ok(
    {
      id: result.questionId,
      knowledgeId: result.knowledgeId,
      question: generatedQuestion.question,
      choices: generatedQuestion.choices,
      correctIndex: generatedQuestion.correctIndex,
      explanation: generatedQuestion.explanation,
    },
    201,
  );
}, "POST /api/questions");
