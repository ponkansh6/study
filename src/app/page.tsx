"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./page.module.css";

interface QuizSetPreview {
  id: number;
  title: string;
  createdAt: string;
}

export default function Home() {
  const router = useRouter();
  const [sourceText, setSourceText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizSets, setQuizSets] = useState<QuizSetPreview[]>([]);

  useEffect(() => {
    fetchQuizSets();
  }, []);

  const fetchQuizSets = async () => {
    try {
      const res = await fetch("/api/quiz-sets");
      if (!res.ok) throw new Error("Failed to fetch quiz sets");
      const data = await res.json();
      setQuizSets(data.reverse());
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceText.trim()) {
      setError("Please enter some text");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/quiz-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate quiz");
      }

      const { id } = await res.json();
      router.push(`/quiz/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <h1>Study - Quiz Generator</h1>
      <p>Paste your knowledge text to generate a quiz set of 10 questions.</p>

      <section className={styles.section}>
        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="source-text" className={styles.label}>
              Knowledge Text
            </label>
            <textarea
              id="source-text"
              className={styles.textarea}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Paste your text here..."
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className={styles.button}
            disabled={loading || !sourceText.trim()}
          >
            {loading ? "Generating..." : "Generate Quiz"}
          </button>
        </form>

        {loading && <div className={styles.loading}>Generating quiz from your text...</div>}
      </section>

      {quizSets.length > 0 && (
        <section className={styles.section}>
          <h2>Previous Quizzes</h2>
          <ul className={styles.quizList}>
            {quizSets.map((quiz) => (
              <li
                key={quiz.id}
                className={styles.quizItem}
                onClick={() => router.push(`/quiz/${quiz.id}`)}
              >
                <div className={styles.quizTitle}>{quiz.title}</div>
                <div className={styles.quizMeta}>
                  {new Date(quiz.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
