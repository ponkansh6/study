"use client";

import { useRouter } from "next/navigation";
import { useQuizSession } from "./use-quiz-session";
import ChoiceButton from "@/components/ChoiceButton";
import ResultBanner from "@/components/ResultBanner";
import { choiceLabel } from "@/lib/choice-label";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Button } from "@/components/Button";

export default function QuizRunner() {
  const router = useRouter();
  const { phase, score, loadNext, select } = useQuizSession();

  if (phase.kind === "loading") {
    return <LoadingState />;
  }

  if (phase.kind === "empty") {
    return (
      <EmptyState
        title="問題がまだありません。"
        description="まず問題を作ってください。"
        actionLabel="問題作成へ"
        onAction={() => router.push("/create")}
      />
    );
  }

  if (phase.kind === "error") {
    return <ErrorMessage message={phase.message} onRetry={() => void loadNext()} />;
  }

  const isGraded = phase.kind === "graded";
  const quiz = phase.quiz;
  const selectedIndex = isGraded ? phase.selectedIndex : undefined;
  const result = isGraded ? phase.result : undefined;

  return (
    <main className="min-h-dvh flex flex-col relative py-4">
      <header className="p-4 border-b border-border text-center font-bold">
        正解 {score.correct} / {score.total}
      </header>

      <div className="flex-1 p-4 space-y-6">
        <p className="text-lg font-bold">{quiz.question.question}</p>
        <div className="space-y-3">
          {quiz.shuffled.choices.map((c, i) => {
            let variant: "idle" | "correct" | "selectedWrong" | "muted" = "idle";
            if (isGraded && result) {
              const correctShuffledIdx = quiz.shuffled.choiceIndices.indexOf(result.correctIndex);
              if (i === correctShuffledIdx) {
                variant = "correct";
              } else if (i === selectedIndex) {
                variant = "selectedWrong";
              } else {
                variant = "muted";
              }
            }

            return (
              <ChoiceButton
                key={i}
                label={choiceLabel(i)}
                text={c}
                variant={variant}
                onClick={() => void select(i)}
                disabled={isGraded}
              />
            );
          })}
        </div>

        {isGraded && result && (
          <div className="space-y-4">
            <ResultBanner isCorrect={result.isCorrect} />
            {result.explanation && (
              <div className="p-4 bg-border/20 rounded-xl text-sm italic">
                解説: {result.explanation}
              </div>
            )}
          </div>
        )}
      </div>

      {isGraded && (
        <div className="sticky bottom-0 p-4 pb-[env(safe-area-inset-bottom)] bg-bg border-t border-border">
          <Button onClick={() => void loadNext()}>次の問題へ</Button>
        </div>
      )}
    </main>
  );
}
