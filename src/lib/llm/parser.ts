import { z } from "zod";
import { LLM_MAX_PARSE_RETRIES, DEBUG_LOG_TRUNCATE_LENGTH } from "../constants";
import { backoffMs } from "./client";
import { sleep } from "../sleep";

async function shouldRetry(
  attempt: number,
  maxRetries: number,
  deadlineAt?: number,
): Promise<boolean> {
  if (attempt < maxRetries) {
    const waitMs = backoffMs(attempt);
    if (deadlineAt === undefined) {
      await sleep(waitMs);
      return true;
    }
    const remainingMs = deadlineAt - performance.now();
    if (remainingMs <= 0) return false;
    await sleep(Math.min(waitMs, remainingMs));
    return true;
  }
  return false;
}

export async function parseWithRetry<T>(
  fetcher: () => Promise<string | null>,
  schema: z.ZodType<T>,
  contextName: string,
  deadlineAt?: number,
): Promise<T | null> {
  const maxParseRetries = LLM_MAX_PARSE_RETRIES;
  for (let attempt = 0; attempt <= maxParseRetries; attempt++) {
    if (deadlineAt !== undefined && deadlineAt - performance.now() <= 0) return null;
    let text: string | null;
    try {
      text = await fetcher();
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("GOOGLE_API_KEY")) {
        throw err;
      }
      console.error(`[llm] ${contextName} failed:`, err);
      return null;
    }
    if (deadlineAt !== undefined && deadlineAt - performance.now() <= 0) return null;
    if (!text) {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      console.warn(
        `[llm] ${contextName} invalid JSON (attempt ${attempt + 1}/${maxParseRetries + 1}):`,
        text.slice(0, DEBUG_LOG_TRUNCATE_LENGTH),
      );
      if (await shouldRetry(attempt, maxParseRetries, deadlineAt)) continue;
      return null;
    }

    try {
      return schema.parse(parsed);
    } catch (err) {
      if (err instanceof z.ZodError) {
        console.warn(
          `[llm] ${contextName} parse error (attempt ${attempt + 1}/${maxParseRetries + 1}):`,
          err.issues,
        );
      } else {
        console.warn(`[llm] ${contextName} unexpected parse error:`, err);
      }
      if (await shouldRetry(attempt, maxParseRetries, deadlineAt)) continue;
      return null;
    }
  }
  return null;
}
