"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createQuestion,
  deleteQuestion,
  regenerateQuestion,
  CreatedQuestion,
} from "@/lib/api/client";
import { QuestionCard } from "@/components/QuestionCard";
import { Button } from "@/components/Button";
import { ErrorMessage } from "@/components/ErrorMessage";
import { errorMessage } from "@/lib/error-message";
import { QUIZ_MIN_DIFFICULTY, QUIZ_MAX_DIFFICULTY } from "@/lib/constants";

export function CreateForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isNavigating, startTransition] = useTransition();
  const [result, setResult] = useState<CreatedQuestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState(QUIZ_MIN_DIFFICULTY);
  const [busy, setBusy] = useState<"regenerate" | "discard" | null>(null);
  const [announceMsg, setAnnounceMsg] = useState("");

  const handleCreate = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setDifficulty(QUIZ_MIN_DIFFICULTY);
    try {
      const data = await createQuestion(text);
      setResult(data);
    } catch (e) {
      setError(errorMessage(e, "生成に失敗しました"));
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!result || busy || difficulty >= QUIZ_MAX_DIFFICULTY) return;
    const next = difficulty + 1;
    setBusy("regenerate");
    setError(null);
    try {
      const data = await regenerateQuestion(result.id, next);
      setResult(data);
      setDifficulty(next);
      setAnnounceMsg(`難易度 Lv.${next} で再作成しました`);
    } catch (e) {
      setError(errorMessage(e, "再作成に失敗しました"));
    } finally {
      setBusy(null);
    }
  };

  const handleDiscard = async () => {
    if (!result || busy) return;
    setBusy("discard");
    setError(null);
    try {
      await deleteQuestion(result.id);
      setResult(null);
      setDifficulty(QUIZ_MIN_DIFFICULTY);
    } catch (e) {
      setError(errorMessage(e, "破棄に失敗しました"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="py-8 space-y-6 flex-1 flex flex-col motion-safe:animate-rise">
      <div className="sr-only" role="status" aria-live="polite">
        {announceMsg}
      </div>
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
            {difficulty > 1 && (
              <div className="inline-block px-3 py-1 rounded-card bg-surface-2 text-muted text-sm font-medium">
                難易度 Lv.{difficulty}
              </div>
            )}
            <QuestionCard
              question={result.question}
              choices={result.choices}
              correctIndex={result.correctIndex}
            />
            {result.explanation && (
              <p className="text-sm text-muted italic px-2">解説: {result.explanation}</p>
            )}
          </div>
          {error && <ErrorMessage message={error} />}
          <div className="grid grid-cols-1 gap-3">
            <Button
              variant="outline"
              onClick={handleRegenerate}
              disabled={busy !== null || difficulty >= QUIZ_MAX_DIFFICULTY}
              loading={busy === "regenerate"}
            >
              難易度を上げて再作成
            </Button>
            {difficulty >= QUIZ_MAX_DIFFICULTY && (
              <p className="text-sm text-muted text-center">これ以上は難易度を上げられません</p>
            )}
            <Button
              variant="danger"
              onClick={handleDiscard}
              disabled={busy !== null}
              loading={busy === "discard"}
            >
              破棄
            </Button>
            <hr className="border-border/60 my-1" />
            <Button
              variant="ghost"
              onClick={() => {
                setResult(null);
                setDifficulty(QUIZ_MIN_DIFFICULTY);
                setError(null);
              }}
              disabled={busy !== null}
            >
              続けてもう1問作る
            </Button>
            <Button
              onClick={() => startTransition(() => router.push("/answer"))}
              loading={isNavigating}
              disabled={busy !== null}
            >
              問題を解きに行く
            </Button>
            <Button
              variant="ghost"
              onClick={() => startTransition(() => router.push("/"))}
              loading={isNavigating}
              disabled={busy !== null}
            >
              ホームへ
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
