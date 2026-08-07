import { Spinner } from "@/components/Spinner";
import { ChoiceVariant } from "@/app/answer/choice-state";

interface ChoiceButtonProps {
  label: string;
  text: string;
  variant: ChoiceVariant;
  onClick?: () => void;
  disabled?: boolean;
}

export default function ChoiceButton({
  label,
  text,
  variant,
  onClick,
  disabled,
}: ChoiceButtonProps) {
  const getStyles = () => {
    switch (variant) {
      case "correct":
        return "border-success bg-success/15 text-success shadow-sm";
      case "selectedWrong":
        return "border-error bg-error/15 text-error shadow-sm";
      case "muted":
        return "border-border/60 bg-surface/40 opacity-50";
      case "selected":
        return "border-primary bg-primary/10 shadow-sm";
      case "idle":
      default:
        return "border-border bg-surface hover:border-primary hover:shadow-card motion-safe:hover:-translate-y-px";
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-busy={variant === "selected"}
      className={`flex w-full min-h-14 items-center gap-3 rounded-card border p-4 text-left transition duration-200 ease-[var(--ease-out-soft)] motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${getStyles()}`}
    >
      <span className="font-bold shrink-0 w-8 h-8 rounded-xl bg-surface-2 flex items-center justify-center text-sm">
        {label}
      </span>
      <span className="break-words flex-1 font-medium">{text}</span>
      {variant === "correct" && (
        <span className="ml-auto w-7 h-7 rounded-full bg-success/20 flex items-center justify-center text-success font-bold text-sm shrink-0">
          ✓
        </span>
      )}
      {variant === "selectedWrong" && (
        <span className="ml-auto w-7 h-7 rounded-full bg-error/20 flex items-center justify-center text-error font-bold text-sm shrink-0">
          ✗
        </span>
      )}
      {variant === "selected" && <Spinner color="primary" className="ml-auto" />}
    </button>
  );
}
