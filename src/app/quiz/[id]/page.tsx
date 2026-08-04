import { getQuizSet } from "@/lib/db/repository/quiz-repository";
import QuizRunner from "./QuizRunner";

export default async function QuizPage({
  params,
}: {
  params: { id: string };
}) {
  const id = parseInt(params.id, 10);

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
