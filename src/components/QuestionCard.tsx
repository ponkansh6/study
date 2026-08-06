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
    <div className="space-y-4 p-4 border border-border rounded-xl">
      <h2 className="text-lg font-bold break-words">{question}</h2>
      <div className="space-y-2">
        {choices.map((choice, i) => {
          const isCorrect = correctIndex === i;
          return (
            <div
              key={i}
              className={cn(
                "w-full p-3 rounded-lg text-left transition flex gap-2 items-center break-words",
                isCorrect ? "bg-success/20" : "bg-border/10 hover:bg-border/20",
              )}
            >
              <span className="font-bold">{choiceLabel(i)}</span>
              <span>{choice}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
