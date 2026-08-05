type ButtonVariant = "primary" | "outline" | "ghost";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-hover",
    outline: "border-2 border-primary text-primary hover:bg-primary/10",
    ghost: "text-text/60 hover:bg-border/20",
  };

  return (
    <button
      className={[
        "w-full py-3 rounded-xl font-bold min-h-12 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition disabled:opacity-50",
        variants[variant],
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
