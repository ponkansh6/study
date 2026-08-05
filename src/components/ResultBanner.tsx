interface ResultBannerProps {
  isCorrect: boolean;
}

export default function ResultBanner({ isCorrect }: ResultBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center gap-2 rounded-lg border-2 p-4 font-bold ${
        isCorrect
          ? "border-success bg-success/10 text-success"
          : "border-error bg-error/10 text-error"
      }`}
    >
      {isCorrect ? (
        <>
          <span>✓</span>
          <span>正解！</span>
        </>
      ) : (
        <>
          <span>✗</span>
          <span>不正解</span>
        </>
      )}
    </div>
  );
}
