export interface QuizSet {
  id: number;
  title: string;
  sourceText: string;
  createdAt: Date;
}

export interface Question {
  id: number;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation?: string;
}

export interface QuizSetWithQuestions extends QuizSet {
  questions: Question[];
}
