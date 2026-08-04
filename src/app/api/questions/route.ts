import { NextResponse } from "next/server";
import { generateQuestion } from "@/lib/llm/quiz";
import { createKnowledgeWithQuestion } from "@/lib/db/repository/question-repository";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sourceText = typeof body.sourceText === "string" ? body.sourceText.trim() : "";

    if (!sourceText) {
      return NextResponse.json({ error: "sourceText is required" }, { status: 400 });
    }

    const generatedQuestion = await generateQuestion(sourceText);
    if (!generatedQuestion) {
      return NextResponse.json({ error: "Failed to generate question from LLM" }, { status: 500 });
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

    return NextResponse.json(
      {
        id: result.questionId,
        knowledgeId: result.knowledgeId,
        question: generatedQuestion.question,
        choices: generatedQuestion.choices,
        correctIndex: generatedQuestion.correctIndex,
        explanation: generatedQuestion.explanation,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in POST /api/questions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
