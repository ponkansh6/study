interface StatCardProps {
  label: string;
  value: string;
  ring?: number; // 0 .. 1
}

export function StatCard({ label, value, ring }: StatCardProps) {
  const hasRing = ring !== undefined;
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = hasRing ? circumference * (1 - Math.max(0, Math.min(1, ring))) : 0;

  return (
    <div className="bg-surface shadow-card rounded-card p-3 sm:p-5 flex flex-col items-center justify-center relative overflow-hidden transition duration-200 ease-[var(--ease-out-soft)]">
      {hasRing && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r={radius}
              className="text-border/40"
              strokeWidth="6"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="40"
              cy="40"
              r={radius}
              className="text-primary transition-all duration-500 ease-[var(--ease-out-soft)]"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>
        </div>
      )}
      <div className="text-2xl sm:text-3xl font-bold tracking-tight z-10">{value}</div>
      <div className="text-xs font-medium text-muted mt-1 z-10">{label}</div>
    </div>
  );
}
