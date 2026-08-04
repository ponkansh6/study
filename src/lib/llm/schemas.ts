import { z } from "zod";

export const QuizQuestionSchema = z.object({
  question: z.string().min(1),
  choices: z.array(z.string()).length(4),
  correctIndex: z.number().min(0).max(3),
  explanation: z.string().optional(),
});

export const QuizGenerationSchema = z.array(QuizQuestionSchema).length(10);

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type QuizGeneration = z.infer<typeof QuizGenerationSchema>;
