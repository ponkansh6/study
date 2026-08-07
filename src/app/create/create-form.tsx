"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createQuestion, CreatedQuestion } from "@/lib/api/client";
import { QuestionCard } from "@/components/QuestionCard";
import { Button } from "@/components/Button";
import { ErrorMessage } from "@/components/ErrorMessage";
import { errorMessage } from "@/lib/error-message";

export function CreateForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isNavigating, startTransition] = useTransition();
  const [result, setResult] = useState<CreatedQuestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const data = await createQuestion(text);
      setResult(data);
    } catch (e) {
      setError(errorMessage(e, "生成に失敗しました"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="py-8 space-y-6 flex-1 flex flex-col motion-safe:animate-rise">
      <h1 className="text-2xl font-bold tracking-tight">問題を作成</h1>
      {!result ? (
        <div className="space-y-4">
          <textarea
            className="w-full min-h-48 p-4 rounded-card border border-border bg-surface shadow-sm text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition"
            placeholder="ナレッジを入力してください..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="space-y-2">
            <Button onClick={handleCreate} disabled={!text.trim()} loading={loading}>
              この内容から1問作る
            </Button>
            {loading && (
              <p className="text-sm text-muted text-center font-medium">
                数秒〜数十秒かかる場合があります
              </p>
            )}
          </div>
          {error && <ErrorMessage message={error} />}
        </div>
      ) : (
        <div className="space-y-6 motion-safe:animate-rise">
          <div className="space-y-4">
            <QuestionCard
              question={result.question}
              choices={result.choices}
              correctIndex={result.correctIndex}
            />
            {result.explanation && (
              <p className="text-sm text-muted italic px-2">解説: {result.explanation}</p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setText("");
              }}
            >
              続けてもう1問作る
            </Button>
            <Button
              onClick={() => startTransition(() => router.push("/answer"))}
              loading={isNavigating}
            >
              問題を解きに行く
            </Button>
            <Button
              variant="ghost"
              onClick={() => startTransition(() => router.push("/"))}
              loading={isNavigating}
            >
              ホームへ
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
