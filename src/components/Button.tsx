type ButtonVariant = "primary" | "outline" | "ghost";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  loading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-hover",
    outline: "border-2 border-primary text-primary hover:bg-primary/10",
    ghost: "text-text/60 hover:bg-border/20",
  };

  return (
    <button
      className={[
        "w-full py-3 rounded-xl font-bold min-h-12 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition disabled:opacity-50 motion-safe:active:scale-[0.98]",
        variants[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      {...props}
    >
      <span className="inline-flex items-center justify-center gap-2">
        {loading && (
          <span
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    </button>
  );
}
