interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "読み込み中..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-text/60 font-medium">{label}</p>
    </div>
  );
}
