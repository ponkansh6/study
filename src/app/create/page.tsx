"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Question } from "@/types/quiz";
import { QuestionCard } from "@/components/QuestionCard";
import { Button } from "@/components/Button";
import { LoadingState } from "@/components/LoadingState";
import { ErrorMessage } from "@/components/ErrorMessage";

export default function CreatePage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Question | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText: text }),
      });
      if (!res.ok) throw new Error("生成に失敗しました");
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="py-8 space-y-6 flex-1 flex flex-col">
      <h1 className="text-xl font-bold">問題を作成</h1>
      {!result ? (
        <div className="space-y-4">
          <textarea
            className="w-full min-h-48 p-4 rounded-xl border border-border bg-transparent text-base"
            placeholder="ナレッジを入力してください..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {loading ? (
            <LoadingState label="数秒〜数十秒かかる場合があります" />
          ) : (
            <Button
              onClick={handleCreate}
              disabled={!text.trim()}
            >
              この内容から1問作る
            </Button>
          )}
          {error && <ErrorMessage message={error} />}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            <QuestionCard
              question={result.question}
              choices={result.choices}
              correctIndex={result.correctIndex}
            />
            {result.explanation && (
              <p className="text-sm text-text/70 italic px-2">解説: {result.explanation}</p>
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
              onClick={() => router.push("/answer")}
            >
              問題を解きに行く
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push("/")}
            >
              ホームへ
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
