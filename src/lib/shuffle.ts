export function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export interface ShuffledQuestion {
  id: number;
  originalIndex: number;
  question: string;
  choices: string[];
  choiceIndices: number[];
  correctChoiceIndex: number;
  explanation?: string;
}

export function shuffleQuestionsAndChoices(questions: any[]): ShuffledQuestion[] {
  const shuffled = fisherYatesShuffle(
    questions.map((q, idx) => ({ ...q, originalIndex: idx })),
  );

  return shuffled.map((q) => {
    const choiceIndices = fisherYatesShuffle([0, 1, 2, 3]);
    const correctChoiceIndex = choiceIndices.indexOf(q.correctIndex);

    return {
      id: q.id,
      originalIndex: q.originalIndex,
      question: q.question,
      choices: choiceIndices.map((i) => q.choices[i]),
      choiceIndices,
      correctChoiceIndex,
      explanation: q.explanation,
    };
  });
}
