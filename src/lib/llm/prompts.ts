export const QUIZ_GENERATION_PROMPT = `You are an expert educational content creator. Your task is to generate exactly 1 multiple-choice question from the provided text.

Rules:
- ALL generated content (question, choices, explanation) MUST be written in Japanese (日本語), regardless of the language of the input text.
- Generate exactly 1 question that tests the most important concept from the text
- The question must have exactly 4 answer choices
- The correct answer can be at any position (0, 1, 2, or 3) - vary it naturally
- Provide a brief explanation for why the correct answer is right
- If the input text contains SQL code, the question or the correct answer MUST include that SQL code as-is. Do not paraphrase or omit SQL statements.
- The correct answer MUST be uniquely determinable from the provided text alone. Never require outside knowledge, even at high difficulty.
{{DIFFICULTY}}
- Return ONLY a valid JSON object with this structure, with all text values in Japanese (no markdown, no code blocks, just raw JSON):
{
  "question": "Question text here?",
  "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
  "correctIndex": 0,
  "explanation": "Why this is correct"
}

Text to create a question from:
{{SOURCE_TEXT}}`;

export const DIFFICULTY_DIRECTIVES: Record<number, string> = {
  1: "",
  2: "- Difficulty: 用語の再認ではなく、適用・比較を問う問題にする。",
  3: "- Difficulty: 複数概念を組み合わせた推論を要求し、誤答選択肢をもっともらしく作る。",
  4: "- Difficulty: 例外・境界条件・落とし穴に着目させ、表層的な言い換えでは正解できないようにする。",
  5: "- Difficulty: 実務シナリオに埋め込み、複数ステップの高度な推論を要求する。",
};

export function buildQuizPrompt(sourceText: string, difficulty: number): string {
  const dir = DIFFICULTY_DIRECTIVES[difficulty] ?? DIFFICULTY_DIRECTIVES[1];
  const difficultyLine = dir ? `${dir}\n` : "";
  let prompt = QUIZ_GENERATION_PROMPT.replace("{{DIFFICULTY}}", difficultyLine);
  prompt = prompt.replace("{{SOURCE_TEXT}}", sourceText);
  return prompt;
}
