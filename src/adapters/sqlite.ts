import { nanoid } from 'nanoid';
import type { Survey, Question, AggregateResult } from '../types';
import type { SurveyAdapter, Response } from '../lib/adapter';

export function createSQLiteAdapter(db: any): SurveyAdapter {
  db.exec(`
    CREATE TABLE IF NOT EXISTS surveys (
      id TEXT PRIMARY KEY,
      trigger TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS survey_questions (
      id TEXT PRIMARY KEY,
      survey_id TEXT NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL,
      question_order INTEGER NOT NULL,
      options TEXT
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS survey_responses (
      id TEXT PRIMARY KEY,
      survey_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      user_id TEXT,
      answer TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  return {
    async findByTrigger(trigger: string): Promise<Survey | null> {
      const row = db.prepare('SELECT * FROM surveys WHERE trigger = ? AND active = 1').get(trigger) as any;
      if (!row) return null;
      return { id: row.id, trigger: row.trigger, active: !!row.active, createdAt: row.created_at };
    },

    async getQuestions(surveyId: string): Promise<Question[]> {
      const rows = db.prepare('SELECT * FROM survey_questions WHERE survey_id = ? ORDER BY question_order').all(surveyId) as any[];
      return rows.map(r => ({
        id: r.id,
        surveyId: r.survey_id,
        questionText: r.question_text,
        questionType: r.question_type,
        questionOrder: r.question_order,
        options: r.options ? JSON.parse(r.options) : undefined,
      }));
    },

    async saveResponses(responsesToSave: Response[]): Promise<void> {
      const insert = db.prepare(
        'INSERT INTO survey_responses (id, survey_id, question_id, user_id, answer, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      );
      for (const r of responsesToSave) {
        insert.run(nanoid(), '', r.questionId, r.userId ?? null, String(r.answer), r.createdAt);
      }
    },

    async getAggregate(surveyId: string): Promise<AggregateResult> {
      const surveyQuestions = await this.getQuestions(surveyId);
      const rows = db.prepare('SELECT * FROM survey_responses WHERE survey_id = ?').all(surveyId) as any[];
      const questionResults = [];

      for (const q of surveyQuestions) {
        const qResponses = rows.filter(r => r.question_id === q.id);
        if (q.questionType === 'nps') {
          const scores: Record<number, number> = {};
          for (let i = 0; i <= 10; i++) scores[i] = 0;
          for (const r of qResponses) {
            const s = Number(r.answer);
            if (s >= 0 && s <= 10) scores[s]++;
          }
          questionResults.push({ questionId: q.id, questionType: q.questionType, questionText: q.questionText, aggregate: scores });
        } else if (q.questionType === 'multiple_choice') {
          const counts: Record<string, number> = {};
          for (const opt of q.options || []) counts[opt] = 0;
          for (const r of qResponses) {
            counts[String(r.answer)] = (counts[String(r.answer)] || 0) + 1;
          }
          questionResults.push({ questionId: q.id, questionType: q.questionType, questionText: q.questionText, aggregate: counts });
        } else {
          questionResults.push({ questionId: q.id, questionType: q.questionType, questionText: q.questionText, aggregate: { total: qResponses.length } });
        }
      }

      return { surveyId, totalResponses: rows.length, questionResults };
    },

    seed(survey: Survey, surveyQuestions: Question[]): void {
      db.prepare('INSERT OR REPLACE INTO surveys (id, trigger, active, created_at) VALUES (?, ?, ?, ?)').run(
        survey.id, survey.trigger, survey.active ? 1 : 0, survey.createdAt
      );
      for (const q of surveyQuestions) {
        db.prepare('INSERT OR REPLACE INTO survey_questions (id, survey_id, question_text, question_type, question_order, options) VALUES (?, ?, ?, ?, ?, ?)').run(
          q.id, q.surveyId, q.questionText, q.questionType, q.questionOrder, q.options ? JSON.stringify(q.options) : null
        );
      }
    },
  };
}
