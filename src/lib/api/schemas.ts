import { z } from "zod";
import {
  QUIZ_CHOICES_PER_QUESTION,
  QUIZ_MIN_DIFFICULTY,
  QUIZ_MAX_DIFFICULTY,
} from "@/lib/constants";

export const submitAnswerSchema = z.object({
  questionId: z.number().int().positive(),
  selectedIndex: z
    .number()
    .int()
    .min(0)
    .max(QUIZ_CHOICES_PER_QUESTION - 1),
});

export const createQuestionSchema = z.object({
  sourceText: z.string().trim().min(1),
});

export const regenerateQuestionSchema = z.object({
  difficulty: z
    .number()
    .int()
    .min(QUIZ_MIN_DIFFICULTY + 1)
    .max(QUIZ_MAX_DIFFICULTY),
});

export const questionIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
