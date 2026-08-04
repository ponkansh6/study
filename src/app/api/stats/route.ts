import { NextResponse } from "next/server";
import { getStats } from "@/lib/db/repository/question-repository";

export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
