export const QUIZ_GENERATION_PROMPT = `You are an expert educational content creator. Your task is to generate exactly 10 multiple-choice questions from the provided text.

Rules:
- Generate exactly 10 questions
- Each question must have exactly 4 answer choices
- The correct answer can be at any position (0, 1, 2, or 3) - vary it naturally, don't always put it in the same position
- Provide a brief explanation for why the correct answer is right
- Questions should test comprehension and key concepts from the text
- Ensure questions are diverse and cover different parts of the text

Return ONLY a valid JSON array with this structure (no markdown, no code blocks, just raw JSON):
[
  {
    "question": "Question text here?",
    "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
    "correctIndex": 0,
    "explanation": "Why this is correct"
  },
  ...
]

Text to create questions from:
{{SOURCE_TEXT}}`;
