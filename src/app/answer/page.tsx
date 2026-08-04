"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { shuffleChoices, ShuffledChoices } from "@/lib/shuffle";
import { QuestionForAnswering } from "@/types/quiz";

export default function AnswerPage() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "question" | "feedback">("loading");
  const [question, setQuestion] = useState<QuestionForAnswering | null>(null);
  const [session, setSession] = useState({ correct: 0, total: 0, ids: [] as number[] });
  const [shuffled, setShuffled] = useState<ShuffledChoices | null>(null);

  const fetchQuestion = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch(`/api/questions/random?exclude=${session.ids.join(",")}`);
      if (res.status === 404) {
        setQuestion(null);
        return;
      }
      const data = await res.json();
      setQuestion(data);
      setShuffled(shuffleChoices(data.choices));
      setState("question");
    } catch (e) {
      console.error(e);
      router.push("/");
    }
  }, [session.ids, router]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    fetchQuestion();
  }, [fetchQuestion]);

  const handleSelect = async (shuffledIdx: number) => {
    if (!question || !shuffled) return;
    const originalIdx = shuffled.choiceIndices[shuffledIdx];
    const res = await fetch("/api/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, selectedIndex: originalIdx }),
    });
    const result = await res.json();
    setQuestion({ ...question, ...result });
    setSession(s => ({ 
      correct: s.correct + (result.isCorrect ? 1 : 0), 
      total: s.total + 1,
      ids: [...s.ids, question.id].slice(-10)
    }));
    setState("feedback");
  };

  if (state === "loading") return <div className="p-8 text-center">読み込み中...</div>;
  if (!question) return (
    <div className="p-8 text-center space-y-4">
      <p>問題がまだありません。</p>
      <button onClick={() => router.push("/create")} className="text-primary underline">問題作成へ</button>
    </div>
  );

  return (
    <main className="min-h-dvh flex flex-col relative">
      <header className="p-4 border-b border-border text-center font-bold">
        正解 {session.correct} / {session.total}
      </header>
      
      <div className="flex-1 p-4 space-y-6">
        <p className="text-lg font-bold">{question.question}</p>
        <div className="space-y-3">
          {shuffled?.choices.map((c, i) => {
            const isCorrect = state === "feedback" && i === shuffled.choiceIndices.indexOf(question.correctIndex!);
            return (
              <button
                key={i}
                onClick={() => state === "question" && handleSelect(i)}
                className={`w-full p-4 text-left rounded-xl border-2 transition min-h-14 flex items-start focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                  state === "question" ? "border-border hover:border-primary" :
                  isCorrect ? "border-success bg-success/10" : "border-border"
                }`}
              >
                {String.fromCharCode(65 + i)}. {c}
              </button>
            );
          })}
        </div>
        {state === "feedback" && (
          <div className="p-4 bg-border/20 rounded-xl text-sm italic">
            解説: {question.explanation}
          </div>
        )}
      </div>

      {state === "feedback" && (
        <div className="sticky bottom-0 p-4 pb-[env(safe-area-inset-bottom)] bg-bg border-t border-border">
          <button 
            onClick={fetchQuestion} 
            className="w-full py-3 bg-primary text-white rounded-xl font-bold min-h-12 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            次の問題へ
          </button>
        </div>
      )}
    </main>
  );
}