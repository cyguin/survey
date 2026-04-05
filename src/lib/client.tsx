'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import type { TriggerResponse, SurveyConfig, Answer, Question } from '../types';
import { SurveyModal } from '../components/SurveyModal';

const defaultConfig: Required<SurveyConfig> = {
  autoDismissMs: 0,
  minAnswers: 1,
  apiBase: '',
};

export async function showSurvey(
  trigger: string,
  userId: string,
  config?: SurveyConfig
): Promise<TriggerResponse & { modal?: () => void }> {
  const mergedConfig = { ...defaultConfig, ...config };
  const apiBase = mergedConfig.apiBase;

  const response = await fetch(
    `${apiBase}/api/survey/trigger`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger, userId }),
    }
  );

  if (!response.ok) {
    throw new Error('Survey not found or not available');
  }

  const data: TriggerResponse = await response.json();

  const openModal = () => {
    if (typeof document !== 'undefined') {
      const container = document.createElement('div');
      container.id = 'cyguin-survey-root';
      document.body.appendChild(container);

      const handleComplete = (answers: Answer[]) => {
        document.body.removeChild(container);
      };

      const handleDismiss = () => {
        document.body.removeChild(container);
      };

      const modal = createPortal(
        <SurveyModal
          surveyId={data.surveyId}
          questions={data.questions}
          userId={userId}
          onComplete={handleComplete}
          onDismiss={handleDismiss}
        />,
        container
      );

      return () => {
        const root = document.getElementById('cyguin-survey-root');
        if (root) document.body.removeChild(root);
      };
    }
    return () => {};
  };

  return { ...data, modal: openModal as unknown as undefined };
}

export function useSurveyModal(
  surveyId: string,
  questions: Question[],
  userId: string,
  onComplete?: (answers: Answer[]) => void,
  onDismiss?: () => void
) {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => {
    setIsOpen(false);
    onDismiss?.();
  };

  return {
    isOpen,
    open,
    close,
    modal: isOpen ? (
      <SurveyModal
        surveyId={surveyId}
        questions={questions}
        userId={userId}
        onComplete={(answers) => {
          onComplete?.(answers);
          setIsOpen(false);
        }}
        onDismiss={close}
      />
    ) : null,
  };
}
