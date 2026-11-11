interface ResultBannerProps {
  isCorrect: boolean;
}

export default function ResultBanner({ isCorrect }: ResultBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-3 rounded-card border-l-4 px-4 py-3 font-bold motion-safe:animate-rise ${
        isCorrect
          ? "border-success/40 bg-success/15 text-success"
          : "border-error/40 bg-error/15 text-error"
      }`}
    >
      {isCorrect ? (
        <>
          <span className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center text-lg">
            ✓
          </span>
          <span className="text-lg">正解！</span>
        </>
      ) : (
        <>
          <span className="w-8 h-8 rounded-full bg-error/20 flex items-center justify-center text-lg">
            ✗
          </span>
          <span className="text-lg">不正解</span>
        </>
      )}
    </div>
  );
}
