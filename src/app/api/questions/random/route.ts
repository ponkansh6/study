import { NextResponse } from "next/server";
import { pickWeightedRandomQuestion } from "@/lib/db/repository/question-repository";

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
      return NextResponse.json({ error: "No questions available" }, { status: 404 });
    }

    return NextResponse.json(question, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/questions/random:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
