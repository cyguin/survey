import type { NextRequest } from 'next/server';
import { getSurveyAdapter } from '../../../../lib/adapter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params;
    const adapter = getSurveyAdapter();
    const questions = await adapter.getQuestions(surveyId);

    if (!questions || questions.length === 0) {
      return Response.json(
        { error: 'Survey not found or inactive' },
        { status: 404 }
      );
    }

    const sortedQuestions = questions.sort(
      (a, b) => a.questionOrder - b.questionOrder
    );

    return Response.json({
      id: surveyId,
      questions: sortedQuestions,
    });
  } catch {
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
