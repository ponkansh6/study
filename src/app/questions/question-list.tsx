"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { deleteQuestion } from "@/lib/api/client";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { errorMessage } from "@/lib/error-message";

interface QuestionListItem {
  id: number;
  question: string;
  createdAt: string;
}

interface QuestionListProps {
  initialItems: QuestionListItem[];
}

function QuestionRow({
  item,
  onDeleted,
}: {
  item: QuestionListItem;
  onDeleted: (id: number) => void;
}) {
  const [state, setState] = useState<"idle" | "confirming" | "deleting">("idle");
  const [error, setError] = useState<string | null>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const prevStateRef = useRef(state);

  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = state;
    if (prev === state) return;

    if (state === "confirming") {
      confirmRef.current?.focus();
    } else if (state === "idle") {
      deleteRef.current?.focus();
    }
  }, [state]);

  const handleDelete = async () => {
    if (state === "deleting") return;
    setState("deleting");
    setError(null);
    try {
      await deleteQuestion(item.id);
      onDeleted(item.id);
    } catch (e) {
      setError(errorMessage(e, "削除に失敗しました"));
      setState("confirming");
    }
  };

  return (
    <li
      className={`bg-surface rounded-card border shadow-card p-4 space-y-3 ${
        state === "confirming" ? "border-warning/30" : "border-border/60"
      }`}
      {...(state === "confirming"
        ? {
            role: "group",
            "aria-labelledby": `question-${item.id} confirm-${item.id}`,
          }
        : {})}
    >
      <div className="flex items-start justify-between gap-4">
        <div id={`question-${item.id}`} className="flex-1 min-w-0">
          <p className="font-bold break-words leading-snug">{item.question}</p>
          <p className="text-xs text-muted mt-0.5">{item.createdAt}</p>
        </div>
        {state === "confirming" ? (
          <div className="shrink-0 w-24">
            <Button variant="danger" onClick={handleDelete} loading={false} ref={confirmRef}>
              削除する
            </Button>
          </div>
        ) : state === "deleting" ? (
          <div className="shrink-0 w-24">
            <Button variant="danger" onClick={handleDelete} loading={true} ref={confirmRef}>
              削除する
            </Button>
          </div>
        ) : (
          <div className="shrink-0 w-24">
            <Button
              variant="danger"
              onClick={() => setState("confirming")}
              aria-describedby={`question-${item.id}`}
              ref={deleteRef}
            >
              削除
            </Button>
          </div>
        )}
      </div>

      {state === "confirming" && (
        <>
          <p id={`confirm-${item.id}`} className="font-medium text-sm">
            本当に削除しますか？
          </p>
          {error && (
            <p className="text-xs text-error font-bold" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <div className="flex-1">
              <Button
                variant="ghost"
                onClick={() => {
                  setState("idle");
                  setError(null);
                }}
                ref={cancelRef}
              >
                キャンセル
              </Button>
            </div>
            <div className="flex-1">
              <span className="hidden">削除する</span>
            </div>
          </div>
        </>
      )}
    </li>
  );
}

export function QuestionList({ initialItems }: QuestionListProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [announcement, setAnnouncement] = useState("");

  const handleDeleted = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setAnnouncement("削除しました");
  };

  if (items.length === 0) {
    return (
      <EmptyState
        title="問題がありません"
        actionLabel="問題を作る"
        onAction={() => router.push("/create")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
      <p className="text-sm font-bold text-muted">{items.length}件</p>
      <ul className="space-y-3">
        {items.map((item) => (
          <QuestionRow key={item.id} item={item} onDeleted={handleDeleted} />
        ))}
      </ul>
    </div>
  );
}
