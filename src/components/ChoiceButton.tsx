import { Spinner } from "@/components/Spinner";

type ChoiceVariant = "idle" | "correct" | "selectedWrong" | "muted" | "selected";

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
        return "border-success bg-success/10 text-success";
      case "selectedWrong":
        return "border-error bg-error/10 text-error";
      case "muted":
        return "border-border opacity-50";
      case "selected":
        return "border-primary bg-primary/10";
      case "idle":
      default:
        return "border-border hover:border-primary";
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-busy={variant === "selected"}
      className={`flex w-full min-h-14 items-start gap-2 rounded-xl border-2 p-4 text-left transition motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${getStyles()}`}
    >
      <span className="font-bold shrink-0">{label}</span>
      <span className="break-words">{text}</span>
      {variant === "correct" && <span className="ml-auto">✓</span>}
      {variant === "selectedWrong" && <span className="ml-auto">✗</span>}
      {variant === "selected" && <Spinner color="primary" className="ml-auto" />}
    </button>
  );
}
