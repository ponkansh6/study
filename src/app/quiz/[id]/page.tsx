import { getQuizSet } from "@/lib/db/repository/quiz-repository";
import QuizRunner from "./QuizRunner";

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);

  if (isNaN(id)) {
    return <div>Invalid quiz ID</div>;
  }

  const quizSet = await getQuizSet(id);

  if (!quizSet) {
    return <div>Quiz not found</div>;
  }

  return (
    <main>
      <h1>{quizSet.title}</h1>
      <QuizRunner questions={quizSet.questions} />
    </main>
  );
}
