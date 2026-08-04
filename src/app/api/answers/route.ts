import { NextResponse } from "next/server";
import { getQuestionById, recordAnswer } from "@/lib/db/repository/question-repository";
import { QUIZ_CHOICES_PER_QUESTION } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const questionId = Number(body.questionId);
    const selectedIndex = Number(body.selectedIndex);

    if (
      isNaN(questionId) ||
      isNaN(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex >= QUIZ_CHOICES_PER_QUESTION
    ) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const question = await getQuestionById(questionId);
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const isCorrect = selectedIndex === question.correctIndex;

    await recordAnswer({
      questionId,
      selectedIndex,
      isCorrect,
    });

    return NextResponse.json(
      {
        isCorrect,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in POST /api/answers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
