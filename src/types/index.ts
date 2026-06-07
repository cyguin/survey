export type QuestionType = 'nps' | 'multiple_choice' | 'short_text';

export interface Question {
  id: string;
  surveyId: string;
  questionText: string;
  questionType: QuestionType;
  questionOrder: number;
  options?: string[];
}

export interface Answer {
  questionId: string;
  answer: string | number;
}

export interface Survey {
  id: string;
  trigger: string;
  active: boolean;
  createdAt: number;
  questions?: Question[];
}

export interface TriggerResponse {
  surveyId: string;
  questions: Question[];
}

export interface SubmitResponse {
  ok: true;
  responseId: string;
}

export interface TriggerRequest {
  trigger: string;
  userId: string;
}

export interface SubmitRequest {
  userId: string;
  answers: Answer[];
}

export interface SurveyModalProps {
  surveyId: string;
  questions: Question[];
  userId: string;
  onComplete?: (answers: Answer[]) => void;
  onDismiss?: () => void;
  theme?: 'light' | 'dark';
}

export interface SurveyConfig {
  autoDismissMs?: number;
  minAnswers?: number;
  apiBase?: string;
}

export interface AggregateResult {
  surveyId: string;
  totalResponses: number;
  questionResults: {
    questionId: string;
    questionType: QuestionType;
    questionText: string;
    aggregate: Record<string, number> | number;
  }[];
}
