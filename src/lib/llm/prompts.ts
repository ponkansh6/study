export const QUIZ_GENERATION_PROMPT = `You are an expert educational content creator. Your task is to generate exactly 1 multiple-choice question from the provided text.

Rules:
- ALL generated content (question, choices, explanation) MUST be written in Japanese (日本語), regardless of the language of the input text.
- Generate exactly 1 question that tests the most important concept from the text
- The question must have exactly 4 answer choices
- The correct answer can be at any position (0, 1, 2, or 3) - vary it naturally
- Provide a brief explanation for why the correct answer is right
- If the input text contains SQL code, the question or the correct answer MUST include that SQL code as-is. Do not paraphrase or omit SQL statements.
- Return ONLY a valid JSON object with this structure, with all text values in Japanese (no markdown, no code blocks, just raw JSON):
{
  "question": "Question text here?",
  "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
  "correctIndex": 0,
  "explanation": "Why this is correct"
}

Text to create a question from:
{{SOURCE_TEXT}}`;
