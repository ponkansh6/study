import { Button } from "./Button";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  loading?: boolean;
}

export function ErrorMessage({ message, onRetry, loading }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
      <p className="text-error font-bold">{message}</p>
      {onRetry && (
        <div className="w-48">
          <Button variant="outline" onClick={onRetry} loading={loading}>
            再試行
          </Button>
        </div>
      )}
    </div>
  );
}
