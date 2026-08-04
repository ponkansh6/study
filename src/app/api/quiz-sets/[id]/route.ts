import { NextRequest, NextResponse } from "next/server";
import { getQuizSet } from "@/lib/db/repository/quiz-repository";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid quiz set ID" }, { status: 400 });
    }

    const quizSet = await getQuizSet(id);
    if (!quizSet) {
      return NextResponse.json({ error: "Quiz set not found" }, { status: 404 });
    }

    return NextResponse.json(quizSet);
  } catch (error) {
    console.error("Error fetching quiz set:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
