import { z } from "zod";
import { QUIZ_CHOICES_PER_QUESTION } from "@/lib/constants";

export const QuizQuestionSchema = z.object({
  question: z.string().min(1),
  choices: z.array(z.string()).length(QUIZ_CHOICES_PER_QUESTION),
  correctIndex: z.number().min(0).max(QUIZ_CHOICES_PER_QUESTION - 1),
  explanation: z.string().optional(),
});

export type GeneratedQuestion = z.infer<typeof QuizQuestionSchema>;
