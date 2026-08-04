"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Question } from "@/types/quiz";

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
    <main className="py-8 space-y-6">
      <h1 className="text-xl font-bold">問題を作成</h1>
      {!result ? (
        <div className="space-y-4">
          <textarea
            className="w-full min-h-48 p-4 rounded-xl border border-border bg-transparent text-base"
            placeholder="ナレッジを入力してください..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            onClick={handleCreate}
            disabled={loading || !text.trim()}
            className="w-full py-4 bg-primary text-white rounded-xl font-bold min-h-12 disabled:opacity-50"
          >
            {loading ? "問題を生成中..." : "この内容から1問作る"}
          </button>
          {loading && <p className="text-sm text-center text-text/60">数秒〜数十秒かかる場合があります</p>}
          {error && <p className="text-error">{error}</p>}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-6 bg-border/20 rounded-xl space-y-4">
            <h2 className="font-bold">{result.question}</h2>
            <div className="space-y-2">
              {result.choices.map((c: string, i: number) => (
                <div key={i} className={`p-3 rounded-lg ${i === result.correctIndex ? "bg-success/20" : "bg-white/5"}`}>
                  {String.fromCharCode(65 + i)}. {c}
                </div>
              ))}
            </div>
            <p className="text-sm text-text/70 italic">解説: {result.explanation}</p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => { setResult(null); setText(""); }}
              className="py-3 bg-white/10 rounded-lg font-bold"
            >
              続けてもう1問作る
            </button>
            <button
              onClick={() => router.push("/answer")}
              className="py-3 bg-primary text-white rounded-lg font-bold"
            >
              問題を解きに行く
            </button>
            <button
              onClick={() => router.push("/")}
              className="py-3 text-text/60 underline"
            >
              ホームへ
            </button>
          </div>
        </div>
      )}
    </main>
  );
}