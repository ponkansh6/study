import { Button } from "./Button";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
      <p className="text-error font-bold">{message}</p>
      {onRetry && (
        <div className="w-48">
          <Button variant="outline" onClick={onRetry}>再試行</Button>
        </div>
      )}
    </div>
  );
}
