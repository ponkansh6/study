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

  useEffect(() => {
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
      const success = await deleteQuestion(item.id);
      if (success) {
        onDeleted(item.id);
      } else {
        throw new Error("削除失敗");
      }
    } catch (e) {
      setError(errorMessage(e, "削除に失敗しました"));
      setState("confirming");
    }
  };

  if (state === "idle") {
    return (
      <div className="bg-surface rounded-card border border-border/60 shadow-card p-4 flex items-center justify-between gap-4">
        <div id={`question-${item.id}`} className="flex-1 min-w-0">
          <p className="font-bold truncate">{item.question}</p>
          <p className="text-xs text-muted mt-0.5">{item.createdAt}</p>
        </div>
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
      </div>
    );
  }

  return (
    <div
      className="bg-surface rounded-card border border-warning/30 shadow-card p-4 space-y-3"
      role="group"
      aria-labelledby={`confirm-${item.id}`}
    >
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
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={state === "deleting"}
            ref={confirmRef}
          >
            削除する
          </Button>
        </div>
      </div>
    </div>
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
      <div className="space-y-3">
        {items.map((item) => (
          <QuestionRow key={item.id} item={item} onDeleted={handleDeleted} />
        ))}
      </div>
    </div>
  );
}
