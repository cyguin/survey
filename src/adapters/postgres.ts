import postgres from 'postgres';
import type { Survey, Question, AggregateResult } from '../types';
import type { SurveyAdapter, Response } from '../lib/adapter';

export function createPostgresAdapter(sql: postgres.Sql): SurveyAdapter {
  return {
    async findByTrigger(trigger: string): Promise<Survey | null> {
      const [row] = await sql`
        SELECT * FROM surveys WHERE trigger = ${trigger} AND active = TRUE LIMIT 1
      `;
      if (!row) return null;
      return { id: row.id, trigger: row.trigger, active: row.active, createdAt: row.created_at };
    },

    async getQuestions(surveyId: string): Promise<Question[]> {
      const rows = await sql`
        SELECT * FROM survey_questions WHERE survey_id = ${surveyId} ORDER BY question_order
      `;
      return rows.map((r: any) => ({
        id: r.id,
        surveyId: r.survey_id,
        questionText: r.question_text,
        questionType: r.question_type,
        questionOrder: r.question_order,
        options: r.options ? JSON.parse(r.options) : undefined,
      }));
    },

    async saveResponses(responsesToSave: Response[]): Promise<void> {
      for (const r of responsesToSave) {
        await sql`
          INSERT INTO survey_responses (id, survey_id, question_id, user_id, answer, created_at)
          VALUES (${r.questionId + '-' + r.createdAt}, '', ${r.questionId}, ${r.userId ?? null}, ${String(r.answer)}, ${r.createdAt})
        `;
      }
    },

    async getAggregate(surveyId: string): Promise<AggregateResult> {
      const surveyQuestions = await this.getQuestions(surveyId);
      const rows = await sql`
        SELECT * FROM survey_responses WHERE survey_id = ${surveyId}
      `;
      const questionResults = [];

      for (const q of surveyQuestions) {
        const qResponses = rows.filter((r: any) => r.question_id === q.id);
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

    async seed(survey: Survey, surveyQuestions: Question[]): Promise<void> {
      await sql`
        INSERT INTO surveys (id, trigger, active, created_at)
        VALUES (${survey.id}, ${survey.trigger}, ${survey.active}, ${survey.createdAt})
        ON CONFLICT (id) DO UPDATE SET trigger = EXCLUDED.trigger, active = EXCLUDED.active
      `;
      for (const q of surveyQuestions) {
        await sql`
          INSERT INTO survey_questions (id, survey_id, question_text, question_type, question_order, options)
          VALUES (${q.id}, ${q.surveyId}, ${q.questionText}, ${q.questionType}, ${q.questionOrder}, ${q.options ? JSON.stringify(q.options) : null})
          ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text
        `;
      }
    },
  };
}
