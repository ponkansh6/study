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
    <main className="py-8 space-y-7 flex-1 flex flex-col motion-safe:animate-rise">
      <div className="sr-only" role="status" aria-live="polite">
        {announceMsg}
      </div>
      <header className="space-y-2 border-b border-border pb-5">
        <p className="text-xs font-bold tracking-[0.16em] text-primary">STUDY / CREATE</p>
        <h1 className="text-3xl font-bold tracking-tight">問題を作成</h1>
        <p className="text-sm text-muted leading-relaxed">
          学びたい内容から、復習に使う問題を作ります。
        </p>
      </header>
      {!result ? (
        <div className="space-y-5">
          <label htmlFor="knowledge" className="block text-sm font-semibold">
            問題にしたい内容
          </label>
          <textarea
            id="knowledge"
            className="w-full min-h-56 p-4 rounded-card border border-border bg-surface text-base leading-relaxed focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition"
            aria-describedby="knowledge-help"
            placeholder="学びたい内容を入力してください"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <p id="knowledge-help" className="-mt-3 text-xs text-muted">
            要点や説明文を貼り付けてください。内容から選択式の問題を1問作成します。
          </p>
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
            <p className="text-xs font-bold tracking-[0.16em] text-primary">PREVIEW / QUESTION</p>
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
              <div className="border-l-2 border-primary pl-4 py-1 text-sm text-muted leading-relaxed">
                <p className="mb-1 text-xs font-bold tracking-wide text-text">解説</p>
                <p>{result.explanation}</p>
              </div>
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
