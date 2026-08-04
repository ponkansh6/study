// ── LLM (Gemini quiz generation) ──
export const LLM_MODEL = "gemini-3.1-flash-lite";
export const LLM_QUIZ_MAX_TOKENS = 2000;
export const LLM_QUIZ_TIMEOUT_MS = 45_000;
export const LLM_GEN_TEMPERATURE = 0.1;
export const LLM_MAX_RETRIES = 3;
export const LLM_MAX_PARSE_RETRIES = 2;
export const LLM_BACKOFF_BASE_MS = 2000;

// ── Quiz defaults ──
export const QUIZ_QUESTIONS_PER_SET = 10;
export const QUIZ_CHOICES_PER_QUESTION = 4;

// ── Debug / Log ──
export const DEBUG_LOG_TRUNCATE_LENGTH = 100;
