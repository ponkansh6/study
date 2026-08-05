"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { QuizQuestion, AnswerResult } from "@/types/quiz";
import { shuffleChoices, ShuffledChoices } from "@/lib/shuffle";
import { fetchRandomQuestion, submitAnswer } from "@/lib/api/client";

export type LoadedQuiz = { question: QuizQuestion; shuffled: ShuffledChoices };

export type Phase =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "question"; quiz: LoadedQuiz }
  | { kind: "submitting"; quiz: LoadedQuiz; selectedIndex: number }
  | { kind: "graded"; quiz: LoadedQuiz; selectedIndex: number; result: AnswerResult };

export function useQuizSession() {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const excludeRef = useRef<number[]>([]);
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);

  const loadNext = useCallback(async (isInitial = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (!isInitial) setLoading(true);
    try {
      const question = await fetchRandomQuestion(excludeRef.current);
      if (!mountedRef.current) return;
      if (!question) {
        setPhase({ kind: "empty" });
        return;
      }
      const shuffled = shuffleChoices(question.choices);
      if (!mountedRef.current) return;
      setPhase({ kind: "question", quiz: { question, shuffled } });
    } catch (e) {
      if (!mountedRef.current) return;
      setPhase({
        kind: "error",
        message: e instanceof Error ? e.message : "予期せぬエラーが発生しました",
      });
    } finally {
      loadingRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const select = useCallback(
    async (shuffledIdx: number) => {
      if (phase.kind !== "question") return;
      const { quiz } = phase;
      setPhase({ kind: "submitting", quiz, selectedIndex: shuffledIdx });
      const originalIdx = quiz.shuffled.choiceIndices[shuffledIdx];
      try {
        const result = await submitAnswer(quiz.question.id, originalIdx);
        if (!mountedRef.current) return;
        excludeRef.current = [...excludeRef.current, quiz.question.id].slice(-10);
        setScore((s) => ({
          correct: s.correct + (result.isCorrect ? 1 : 0),
          total: s.total + 1,
        }));
        setPhase({
          kind: "graded",
          quiz,
          selectedIndex: shuffledIdx,
          result,
        });
      } catch (e) {
        if (!mountedRef.current) return;
        setPhase({
          kind: "error",
          message: e instanceof Error ? e.message : "回答の送信に失敗しました",
        });
      }
    },
    [phase],
  );

  useEffect(() => {
    mountedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadNext(true);
    return () => {
      mountedRef.current = false;
    };
  }, [loadNext]);

  return { phase, score, loadNext, select, loading };
}
