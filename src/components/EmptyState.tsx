import { Button } from "./Button";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 bg-surface shadow-card rounded-card border border-border/60 my-auto motion-safe:animate-rise">
      <h2 className="text-xl font-bold">{title}</h2>
      {description && <p className="text-muted">{description}</p>}
      {actionLabel && onAction && (
        <div className="w-48 pt-2">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      )}
    </div>
  );
}
