"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { shuffleQuestionsAndChoices } from "@/lib/shuffle";
import styles from "./styles.module.css";

interface Question {
  id: number;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation?: string;
}

export default function QuizRunner({ questions: initialQuestions }: { questions: Question[] }) {
  const router = useRouter();
  const [shuffledQuestions] = useState(() =>
    shuffleQuestionsAndChoices(initialQuestions),
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(shuffledQuestions.length).fill(null));
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion = shuffledQuestions[currentIndex];
  const isAnswered = answers[currentIndex] !== null;
  const isLastQuestion = currentIndex === shuffledQuestions.length - 1;
  const allAnswered = answers.every((a) => a !== null);

  const handleAnswerClick = (choiceIndex: number) => {
    if (!submitted) {
      const newAnswers = [...answers];
      newAnswers[currentIndex] = choiceIndex;
      setAnswers(newAnswers);
    }
  };

  const handleNext = () => {
    if (currentIndex < shuffledQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = () => {
    if (!allAnswered) return;
    setSubmitted(true);
  };

  if (submitted) {
    const correctCount = answers.filter((answerChoiceIdx, qIdx) => {
      return answerChoiceIdx === shuffledQuestions[qIdx].correctChoiceIndex;
    }).length;

    return (
      <div className={styles.results}>
        <h2>Quiz Completed!</h2>
        <div className={styles.score}>
          <div className={styles.scoreNumber}>{correctCount}/10</div>
          <div className={styles.scoreText}>questions answered correctly</div>
        </div>

        <div className={styles.resultsList}>
          {shuffledQuestions.map((q, idx) => {
            const userAnswered = answers[idx];
            const isCorrect = userAnswered === q.correctChoiceIndex;

            return (
              <div key={q.id} className={`${styles.resultItem} ${isCorrect ? styles.correct : styles.incorrect}`}>
                <div className={styles.resultQuestion}>Q{idx + 1}: {q.question}</div>
                <div className={styles.resultAnswer}>
                  You answered: <strong>{q.choices[userAnswered ?? 0]}</strong>
                </div>
                {!isCorrect && (
                  <div className={styles.resultCorrect}>
                    Correct: <strong>{q.choices[q.correctChoiceIndex]}</strong>
                  </div>
                )}
                {q.explanation && (
                  <div className={styles.explanation}>{q.explanation}</div>
                )}
              </div>
            );
          })}
        </div>

        <div className={styles.actions}>
          <button onClick={() => router.push("/")} className={styles.button}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.quizContainer}>
      <div className={styles.progress}>
        Question {currentIndex + 1} of {shuffledQuestions.length}
      </div>

      <div className={styles.questionCard}>
        <h2 className={styles.question}>{currentQuestion.question}</h2>

        <div className={styles.choices}>
          {currentQuestion.choices.map((choice, idx) => (
            <button
              key={idx}
              className={`${styles.choice} ${answers[currentIndex] === idx ? styles.selected : ""}`}
              onClick={() => handleAnswerClick(idx)}
              disabled={submitted}
            >
              <span className={styles.choiceLetter}>{String.fromCharCode(65 + idx)}</span>
              <span className={styles.choiceText}>{choice}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.navigation}>
        <button onClick={handlePrev} disabled={currentIndex === 0} className={styles.button}>
          ← Previous
        </button>

        <div className={styles.questionIndicators}>
          {shuffledQuestions.map((_, idx) => (
            <button
              key={idx}
              className={`${styles.indicator} ${idx === currentIndex ? styles.active : ""} ${
                answers[idx] !== null ? styles.answered : ""
              }`}
              onClick={() => setCurrentIndex(idx)}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        {isLastQuestion ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className={`${styles.button} ${styles.submitButton}`}
          >
            Submit Quiz
          </button>
        ) : (
          <button onClick={handleNext} className={styles.button}>
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
