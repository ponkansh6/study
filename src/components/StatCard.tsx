import { ProgressBar } from "@/components/ProgressBar";

interface StatCardProps {
  label: string;
  value: string;
  progress?: number; // 0 .. 1
}

export function StatCard({ label, value, progress }: StatCardProps) {
  const hasProgress = progress !== undefined;

  return (
    <div className="px-2 flex flex-col items-center justify-center text-center">
      <div className="text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight">{value}</div>
      <div className="text-[0.68rem] sm:text-xs leading-snug font-medium text-muted mt-1">
        {label}
      </div>
      {hasProgress ? (
        <ProgressBar value={progress} className="mt-3" />
      ) : (
        <div className="h-1.5 mt-3" aria-hidden="true" />
      )}
    </div>
  );
}
