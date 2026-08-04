import { NextRequest, NextResponse } from "next/server";
import { generateQuizQuestions } from "@/lib/llm/quiz";
import { createQuizSet, listQuizSets } from "@/lib/db/repository/quiz-repository";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceText } = body as { sourceText?: string };

    if (!sourceText || sourceText.trim().length === 0) {
      return NextResponse.json({ error: "sourceText is required" }, { status: 400 });
    }

    const questions = await generateQuizQuestions(sourceText);
    if (!questions || questions.length !== 10) {
      return NextResponse.json(
        { error: "Failed to generate exactly 10 questions" },
        { status: 500 },
      );
    }

    const title = sourceText.slice(0, 100).trim().replace(/\n/g, " ");
    const quizSetId = await createQuizSet({
      title,
      sourceText,
      questions,
    });

    return NextResponse.json({ id: quizSetId }, { status: 201 });
  } catch (error) {
    console.error("Error creating quiz set:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const quizSets = await listQuizSets(50);
    return NextResponse.json(quizSets);
  } catch (error) {
    console.error("Error listing quiz sets:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
