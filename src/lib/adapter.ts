import type { Survey, Question, Answer, AggregateResult } from '../types';

export interface SurveyAdapter {
  findByTrigger(trigger: string): Promise<Survey | null>;
  getQuestions(surveyId: string): Promise<Question[]>;
  saveResponses(responses: Response[]): Promise<void>;
  getAggregate(surveyId: string): Promise<AggregateResult>;
  seed(survey: Survey, surveyQuestions: Question[]): void;
}

export interface Response {
  questionId: string;
  userId?: string;
  answer: string | number;
  createdAt: number;
}

export function createSurveyAdapter(): SurveyAdapter {
  const surveys = new Map<string, Survey>();
  const questions = new Map<string, Question[]>();
  const responses = new Map<string, Response[]>();

  function seed(survey: Survey, surveyQuestions: Question[]): void {
    surveys.set(survey.id, survey);
    questions.set(survey.id, surveyQuestions);
  }

  return {
    async findByTrigger(trigger: string): Promise<Survey | null> {
      for (const survey of surveys.values()) {
        if (survey.trigger === trigger && survey.active) {
          return survey;
        }
      }
      return null;
    },

    async getQuestions(surveyId: string): Promise<Question[]> {
      return questions.get(surveyId) || [];
    },

    async saveResponses(responsesToSave: Response[]): Promise<void> {
      for (const resp of responsesToSave) {
        const existing = responses.get(resp.questionId) || [];
        existing.push(resp);
        responses.set(resp.questionId, existing);
      }
    },

    async getAggregate(surveyId: string): Promise<AggregateResult> {
      const surveyQuestions = questions.get(surveyId) || [];
      const questionResults = [];

      for (const q of surveyQuestions) {
        const qResponses = responses.get(q.id) || [];
        if (q.questionType === 'nps') {
          const npsResponses = qResponses.map(r => Number(r.answer));
          const scores: Record<number, number> = {};
          for (let i = 0; i <= 10; i++) scores[i] = 0;
          for (const s of npsResponses) {
            if (s >= 0 && s <= 10) scores[s]++;
          }
          questionResults.push({
            questionId: q.id,
            questionType: q.questionType,
            questionText: q.questionText,
            aggregate: scores,
          });
        } else if (q.questionType === 'multiple_choice') {
          const counts: Record<string, number> = {};
          for (const opt of q.options || []) counts[opt] = 0;
          for (const r of qResponses) {
            const key = String(r.answer);
            counts[key] = (counts[key] || 0) + 1;
          }
          questionResults.push({
            questionId: q.id,
            questionType: q.questionType,
            questionText: q.questionText,
            aggregate: counts,
          });
        } else {
          questionResults.push({
            questionId: q.id,
            questionType: q.questionType,
            questionText: q.questionText,
            aggregate: { total: qResponses.length },
          });
        }
      }

      let totalResponses = 0;
      for (const q of surveyQuestions) {
        totalResponses += (responses.get(q.id) || []).length;
      }

      return { surveyId, totalResponses, questionResults };
    },

    seed,
  };
}

let globalAdapter: SurveyAdapter | null = null;

export function getSurveyAdapter(): SurveyAdapter {
  if (!globalAdapter) {
    globalAdapter = createSurveyAdapter();
  }
  return globalAdapter;
}

export function setSurveyAdapter(adapter: SurveyAdapter): void {
  globalAdapter = adapter;
}
