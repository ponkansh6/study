import { choiceLabel } from "@/lib/choice-label";

interface QuestionCardProps {
  question: string;
  choices: string[];
  correctIndex?: number;
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  disabled?: boolean;
}

export function QuestionCard({
  question,
  choices,
  correctIndex,
  selectedIndex,
  onSelect,
  disabled,
}: QuestionCardProps) {
  return (
    <div className="space-y-4 p-4 border border-border rounded-xl">
      <h2 className="text-lg font-bold break-words">{question}</h2>
      <div className="space-y-2">
        {choices.map((choice, i) => {
          const isCorrect = correctIndex === i;
          const isSelected = selectedIndex === i;

          const baseClasses =
            "w-full p-3 rounded-lg text-left transition flex gap-2 items-center break-words";
          const stateClasses = isCorrect
            ? "bg-success/20"
            : isSelected && !isCorrect
              ? "bg-error/20"
              : "bg-border/10 hover:bg-border/20";

          if (onSelect) {
            return (
              <button
                key={i}
                onClick={() => onSelect(i)}
                disabled={disabled || selectedIndex !== undefined}
                className={[baseClasses, stateClasses, "cursor-pointer"].join(" ")}
              >
                <span className="font-bold">{choiceLabel(i)}</span>
                <span>{choice}</span>
              </button>
            );
          }

          return (
            <div key={i} className={[baseClasses, stateClasses].join(" ")}>
              <span className="font-bold">{choiceLabel(i)}</span>
              <span>{choice}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
