import type { NextRequest } from 'next/server';
import { getSurveyAdapter } from '../../../../../lib/adapter';
import type { SubmitRequest, SubmitResponse } from '../../../../../types';
import { randomBytes } from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params;
    const body: SubmitRequest = await request.json();

    if (!body.userId || !body.answers || !Array.isArray(body.answers)) {
      return Response.json(
        { error: 'Missing required fields: userId and answers' },
        { status: 400 }
      );
    }

    const adapter = getSurveyAdapter();
    const questions = await adapter.getQuestions(surveyId);

    if (!questions || questions.length === 0) {
      return Response.json(
        { error: 'Survey not found' },
        { status: 404 }
      );
    }

    const questionIds = new Set(questions.map(q => q.id));
    for (const answer of body.answers) {
      if (!questionIds.has(answer.questionId)) {
        return Response.json(
          { error: `Question ${answer.questionId} not found in survey` },
          { status: 404 }
        );
      }
    }

    const now = Date.now();
    const responses = body.answers.map(a => ({
      questionId: a.questionId,
      userId: body.userId,
      answer: a.answer,
      createdAt: now,
    }));

    await adapter.saveResponses(responses);

    const responseId = randomBytes(12).toString('hex');
    const response: SubmitResponse = { ok: true, responseId };

    return Response.json(response);
  } catch {
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
