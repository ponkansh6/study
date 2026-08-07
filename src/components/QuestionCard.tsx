import { choiceLabel } from "@/lib/choice-label";
import { cn } from "@/lib/cn";

interface QuestionCardProps {
  question: string;
  choices: string[];
  /** Highlights the choice at this index as correct (e.g. after generation). */
  correctIndex?: number;
}

export function QuestionCard({ question, choices, correctIndex }: QuestionCardProps) {
  return (
    <div className="space-y-6 p-6 bg-surface shadow-card rounded-card border border-border/60">
      <h2 className="text-xl font-bold break-words leading-snug">{question}</h2>
      <div className="space-y-3">
        {choices.map((choice, i) => {
          const isCorrect = correctIndex === i;
          return (
            <div
              key={i}
              className={cn(
                "w-full p-4 rounded-xl text-left transition duration-200 ease-[var(--ease-out-soft)] flex gap-3 items-center break-words border",
                isCorrect
                  ? "bg-success/20 border-success/40 ring-1 ring-success/40 font-semibold"
                  : "bg-surface-2 border-transparent",
              )}
            >
              <span className="font-bold shrink-0 w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-sm shadow-sm">
                {choiceLabel(i)}
              </span>
              <span className="flex-1">{choice}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
