"use client";

import { useRouter } from "next/navigation";
import { useQuizSession } from "./use-quiz-session";
import ChoiceButton from "@/components/ChoiceButton";
import ResultBanner from "@/components/ResultBanner";
import { choiceLabel } from "@/lib/choice-label";
import { choiceVariant } from "./choice-state";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Button } from "@/components/Button";
import { ProgressBar } from "@/components/ProgressBar";

export default function QuizRunner() {
  const router = useRouter();
  const { phase, score, loadNext, select, loading } = useQuizSession();

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
    return (
      <ErrorMessage message={phase.message} onRetry={() => void loadNext()} loading={loading} />
    );
  }

  const isPending = phase.kind === "submitting";
  const isGraded = phase.kind === "graded";
  const quiz = phase.quiz;
  const selectedIndex = isPending || isGraded ? phase.selectedIndex : undefined;
  const result = isGraded ? phase.result : undefined;

  return (
    <main className="flex-1 flex flex-col relative py-6">
      <header className="mb-4">
        <div className="flex items-center justify-between text-sm font-bold tracking-wide mb-1.5">
          <span>スコア</span>
          <span>
            正解 {score.correct} / {score.total}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
          <ProgressBar value={score.total > 0 ? score.correct / score.total : 0} />
        </div>
      </header>

      <div key={quiz.question.id} className="flex-1 space-y-6 motion-safe:animate-rise pb-24">
        <h2 className="text-xl font-bold tracking-tight leading-snug">{quiz.question.question}</h2>
        <div className="space-y-3">
          {(() => {
            const correctShuffledIndex =
              isGraded && result
                ? quiz.shuffled.choiceIndices.indexOf(result.correctIndex)
                : undefined;
            return quiz.shuffled.choices.map((c, i) => {
              const variant = choiceVariant({
                isPending,
                isGraded,
                index: i,
                selectedIndex,
                correctShuffledIndex,
              });

              return (
                <ChoiceButton
                  key={i}
                  label={choiceLabel(i)}
                  text={c}
                  variant={variant}
                  onClick={() => void select(i)}
                  disabled={isPending || isGraded}
                />
              );
            });
          })()}
        </div>

        {isGraded && result && (
          <div className="space-y-4 pt-2">
            <ResultBanner isCorrect={result.isCorrect} />
            {result.explanation && (
              <div className="p-4 bg-surface-2 rounded-card text-sm italic border border-border/60 shadow-sm leading-relaxed">
                解説: {result.explanation}
              </div>
            )}
          </div>
        )}
      </div>

      {isGraded && (
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-bg/85 backdrop-blur-md border-t border-border z-20">
          <div className="max-w-2xl mx-auto w-full">
            <Button onClick={() => void loadNext()} loading={loading}>
              次の問題へ
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
