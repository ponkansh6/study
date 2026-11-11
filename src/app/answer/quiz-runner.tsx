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
    <main className="flex-1 flex flex-col relative py-7">
      <header className="mb-8 border-b border-border pb-4">
        <div className="flex items-end justify-between gap-4 mb-3">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-primary mb-1">STUDY / REVIEW</p>
            <h1 className="text-2xl font-bold tracking-tight">問題に答える</h1>
          </div>
          <p className="text-sm tabular-nums text-muted shrink-0">
            <span className="font-bold text-text">{score.correct}</span> 正解{" "}
            <span className="mx-1">/</span> {score.total} 問
          </p>
        </div>
        <ProgressBar value={score.total > 0 ? score.correct / score.total : 0} />
      </header>

      <div key={quiz.question.id} className="flex-1 space-y-7 motion-safe:animate-rise pb-28">
        <section aria-labelledby="current-question" className="space-y-5">
          <p className="text-xs font-bold tracking-wide text-muted">次の問いを考えてください</p>
          <h2 id="current-question" className="text-2xl font-bold tracking-tight leading-relaxed">
            {quiz.question.question}
          </h2>
        </section>
        <div className="space-y-3" role="group" aria-labelledby="current-question">
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
              <div className="border-l-2 border-primary pl-4 py-1 text-sm leading-relaxed">
                <p className="mb-1 text-xs font-bold tracking-wide">解説</p>
                <p className="text-muted">{result.explanation}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {isGraded && (
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-bg border-t border-border z-20">
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
