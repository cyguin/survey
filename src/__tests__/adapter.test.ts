import { describe, it, expect, beforeEach } from 'vitest';
import { createSurveyAdapter } from '../lib/adapter';
import type { Question, Survey } from '../types';

describe('SurveyAdapter', () => {
  let adapter: ReturnType<typeof createSurveyAdapter>;

  const mockSurvey: Survey = {
    id: 'survey-1',
    trigger: 'churn-survey',
    active: true,
    createdAt: Date.now(),
  };

  const mockQuestions: Question[] = [
    {
      id: 'q1',
      surveyId: 'survey-1',
      questionText: 'How likely?',
      questionType: 'nps',
      questionOrder: 1,
    },
    {
      id: 'q2',
      surveyId: 'survey-1',
      questionText: 'Primary use case?',
      questionType: 'multiple_choice',
      questionOrder: 2,
      options: ['Work', 'Personal', 'Education', 'Other'],
    },
    {
      id: 'q3',
      surveyId: 'survey-1',
      questionText: 'Feedback?',
      questionType: 'short_text',
      questionOrder: 3,
    },
  ];

  beforeEach(() => {
    adapter = createSurveyAdapter();
    adapter.seed(mockSurvey, mockQuestions);
  });

  describe('findByTrigger', () => {
    it('returns survey by trigger when active', async () => {
      const result = await adapter.findByTrigger('churn-survey');
      expect(result?.id).toBe('survey-1');
    });

    it('returns null for unknown trigger', async () => {
      const result = await adapter.findByTrigger('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getQuestions', () => {
    it('returns questions for a survey in order', async () => {
      const result = await adapter.getQuestions('survey-1');
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('q1');
      expect(result[1].id).toBe('q2');
      expect(result[2].id).toBe('q3');
    });

    it('returns empty array for unknown survey', async () => {
      const result = await adapter.getQuestions('unknown');
      expect(result).toEqual([]);
    });
  });

  describe('getAggregate — NPS', () => {
    it('aggregates NPS 0-10 scores correctly', async () => {
      await adapter.saveResponses([
        { questionId: 'q1', answer: 9, createdAt: Date.now() },
        { questionId: 'q1', answer: 7, createdAt: Date.now() },
        { questionId: 'q1', answer: 10, createdAt: Date.now() },
        { questionId: 'q1', answer: 6, createdAt: Date.now() },
      ]);

      const agg = await adapter.getAggregate('survey-1');
      expect(agg.totalResponses).toBe(4);
      const npsResult = agg.questionResults.find((r) => r.questionId === 'q1');
      expect(npsResult?.aggregate).toEqual({
        0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 1, 7: 1, 8: 0, 9: 1, 10: 1,
      });
    });

    it('handles empty NPS responses', async () => {
      const agg = await adapter.getAggregate('survey-1');
      expect(agg.totalResponses).toBe(0);
    });
  });

  describe('getAggregate — Multiple Choice', () => {
    it('aggregates multiple choice option counts', async () => {
      await adapter.saveResponses([
        { questionId: 'q2', answer: 'Work', createdAt: Date.now() },
        { questionId: 'q2', answer: 'Work', createdAt: Date.now() },
        { questionId: 'q2', answer: 'Personal', createdAt: Date.now() },
      ]);

      const agg = await adapter.getAggregate('survey-1');
      const mcResult = agg.questionResults.find((r) => r.questionId === 'q2');
      expect(mcResult?.aggregate).toEqual({
        Work: 2,
        Personal: 1,
        Education: 0,
        Other: 0,
      });
    });
  });

  describe('getAggregate — Short Text', () => {
    it('aggregates short text as total count', async () => {
      await adapter.saveResponses([
        { questionId: 'q3', answer: 'Great product!', createdAt: Date.now() },
        { questionId: 'q3', answer: 'Love it', createdAt: Date.now() },
      ]);

      const agg = await adapter.getAggregate('survey-1');
      const textResult = agg.questionResults.find((r) => r.questionId === 'q3');
      expect(textResult?.aggregate).toEqual({ total: 2 });
    });
  });

  describe('type exports', () => {
    it('QuestionType allows correct values', () => {
      const q: Question = {
        id: 'test',
        surveyId: 's1',
        questionText: 'Test?',
        questionType: 'nps',
        questionOrder: 1,
      };
      expect(q.questionType).toBe('nps');
    });
  });
});
