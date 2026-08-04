export interface Knowledge {
  id: number;
  title: string;
  sourceText: string;
  createdAt: Date;
}

export interface Question {
  id: number;
  knowledgeId: number;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation?: string;
  createdAt: Date;
}

export interface AnswerLog {
  id: number;
  questionId: number;
  selectedIndex: number;
  isCorrect: boolean;
  answeredAt: Date;
}

export interface QuestionForAnswering {
  id: number;
  question: string;
  choices: string[];
  correctIndex?: number;
  explanation?: string;
  isCorrect?: boolean;
}
