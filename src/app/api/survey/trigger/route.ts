import { getSurveyAdapter } from '../../../../lib/adapter';
import type { TriggerRequest, TriggerResponse } from '../../../../types';

export async function POST(request: Request) {
  try {
    const body: TriggerRequest = await request.json();

    if (!body.trigger || !body.userId) {
      return Response.json(
        { error: 'Missing required fields: trigger and userId' },
        { status: 400 }
      );
    }

    const adapter = getSurveyAdapter();
    const survey = await adapter.findByTrigger(body.trigger);

    if (!survey) {
      return Response.json(
        { error: 'No active survey found for this trigger' },
        { status: 404 }
      );
    }

    const surveyQuestions = await adapter.getQuestions(survey.id);
    const sortedQuestions = surveyQuestions.sort(
      (a, b) => a.questionOrder - b.questionOrder
    );

    const response: TriggerResponse = {
      surveyId: survey.id,
      questions: sortedQuestions,
    };

    return Response.json(response);
  } catch {
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
