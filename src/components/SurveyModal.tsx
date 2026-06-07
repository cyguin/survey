'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  SurveyModalProps,
  Question,
  Answer,
  SurveyConfig,
} from '../types';

const DEFAULT_CONFIG: SurveyConfig = {
  autoDismissMs: 0,
  minAnswers: 1,
  apiBase: '',
};

export function SurveyModal({
  surveyId,
  questions,
  userId,
  onComplete,
  onDismiss,
  theme = 'dark',
}: SurveyModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [textValue, setTextValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const sortedQuestions = [...questions].sort(
    (a, b) => a.questionOrder - b.questionOrder
  );
  const currentQuestion = sortedQuestions[currentIndex];
  const totalQuestions = sortedQuestions.length;
  const progress = `${currentIndex + 1} of ${totalQuestions}`;
  const isDark = (theme ?? 'dark') === 'dark';

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleDismiss]);

  if (dismissed) return null;

  const handleNext = () => {
    const answer: Answer = {
      questionId: currentQuestion.id,
      answer:
        currentQuestion.questionType === 'nps'
          ? Number(textValue) || 0
          : textValue,
    };

    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
      setTextValue('');
    } else {
      handleSubmit(newAnswers);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      const newAnswers = answers.slice(0, -1);
      setAnswers(newAnswers);
      setCurrentIndex(currentIndex - 1);
      const prevAnswer = newAnswers[newAnswers.length - 1];
      setTextValue(prevAnswer ? String(prevAnswer.answer) : '');
    }
  };

  const handleSubmit = async (finalAnswers: Answer[]) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/survey/${surveyId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, answers: finalAnswers }),
      });

      if (response.ok) {
        onComplete?.(finalAnswers);
        setDismissed(true);
      }
    } catch {
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = () => {
    switch (currentQuestion.questionType) {
      case 'nps':
        return (
          <div className="survey-nps">
            <div className="survey-nps-scale">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`survey-nps-btn ${textValue === String(n) ? 'active' : ''}`}
                  onClick={() => setTextValue(String(n))}
                  aria-label={`Rate ${n}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="survey-nps-labels">
              <span>Not likely</span>
              <span>Very likely</span>
            </div>
          </div>
        );

      case 'multiple_choice':
        return (
          <div className="survey-mc-options">
            {(currentQuestion.options || []).map((option, i) => (
              <label key={i} className="survey-mc-option">
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  value={option}
                  checked={textValue === option}
                  onChange={() => setTextValue(option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );

      case 'short_text':
        return (
          <div className="survey-text">
            <textarea
              className="survey-text-input"
              value={textValue}
              onChange={(e) =>
                setTextValue(e.target.value.slice(0, 280))
              }
              placeholder="Your answer..."
              maxLength={280}
              rows={3}
            />
            <span className="survey-text-counter">
              {textValue.length}/280
            </span>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed =
    currentQuestion.questionType === 'nps'
      ? textValue !== ''
      : textValue.trim() !== '';

  return (
    <div className="survey-modal-backdrop" data-theme={theme} onClick={handleDismiss}>
      <div
        className="survey-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="survey-question-text"
      >
        <div className="survey-modal-header">
          <span className="survey-progress">{progress}</span>
          <button
            type="button"
            className="survey-close"
            onClick={handleDismiss}
            aria-label="Close survey"
          >
            ×
          </button>
        </div>

        <div className="survey-modal-body">
          <h2 id="survey-question-text" className="survey-question-text">
            {currentQuestion.questionText}
          </h2>
          {renderQuestion()}
        </div>

        <div className="survey-modal-footer">
          {currentIndex > 0 && (
            <button
              type="button"
              className="survey-btn survey-btn-back"
              onClick={handleBack}
            >
              Back
            </button>
          )}
          <button
            type="button"
            className="survey-btn survey-btn-next"
            onClick={handleNext}
            disabled={!canProceed || isSubmitting}
          >
            {currentIndex < totalQuestions - 1 ? 'Next' : 'Submit'}
          </button>
        </div>
      </div>

      <style>{`
        .survey-modal-backdrop[data-theme="light"] {
          --cyguin-bg: #ffffff;
          --cyguin-bg-subtle: #f5f5f5;
          --cyguin-border: #e5e5e5;
          --cyguin-fg: #0a0a0a;
          --cyguin-fg-muted: #888888;
          --cyguin-accent: #f5a800;
          --cyguin-accent-dark: #c47f00;
          --cyguin-accent-fg: #0a0a0a;
          --cyguin-radius: 6px;
          --cyguin-shadow: 0 1px 4px rgba(0,0,0,0.08);
          --cyguin-danger: #dc2626;
        }

        .survey-modal-backdrop {
          --cyguin-bg: #0a0d17;
          --cyguin-bg-subtle: #101521;
          --cyguin-border: #252b3a;
          --cyguin-fg: #f1f3f6;
          --cyguin-fg-muted: #858b98;
          --cyguin-accent: #ffd21f;
          --cyguin-accent-dark: #e0a900;
          --cyguin-accent-fg: #0a0d17;
          --cyguin-modal-bg: var(--cyguin-bg);
          --cyguin-modal-border: var(--cyguin-border);
          --cyguin-text-primary: var(--cyguin-fg);
          --cyguin-text-secondary: var(--cyguin-fg-muted);
          --cyguin-shadow: 0 18px 50px rgba(0, 0, 0, 0.32);
          position: fixed;
          inset: 0;
          background: rgba(6, 8, 17, 0.72);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          font-family: inherit;
        }

        .survey-modal {
          background: var(--cyguin-modal-bg, #ffffff);
          border: 1px solid var(--cyguin-modal-border, #e5e7eb);
          border-radius: var(--cyguin-radius, 8px);
          box-shadow: var(--cyguin-shadow, 0 25px 50px -12px rgba(0, 0, 0, 0.25));
          width: 100%;
          max-width: 480px;
          margin: var(--cyguin-space-4, 1rem);
          overflow: hidden;
        }

        .survey-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--cyguin-space-4, 1rem) var(--cyguin-space-6, 1.5rem);
          border-bottom: 1px solid var(--cyguin-modal-border, #e5e7eb);
        }

        .survey-progress {
          font-size: 0.875rem;
          color: var(--cyguin-text-secondary, #6b7280);
        }

        .survey-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: var(--cyguin-text-secondary, #6b7280);
          cursor: pointer;
          padding: 0;
          line-height: 1;
          color: var(--cyguin-danger, #ef4444);
        }

        .survey-close:hover {
          opacity: 0.7;
        }

        .survey-modal-body {
          padding: var(--cyguin-space-8, 2rem) var(--cyguin-space-6, 1.5rem);
        }

        .survey-question-text {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--cyguin-text-primary, #111827);
          margin: 0 0 var(--cyguin-space-6, 1.5rem) 0;
          line-height: 1.5;
        }

        .survey-nps-scale {
          display: flex;
          gap: var(--cyguin-space-1, 0.25rem);
          justify-content: center;
        }

        .survey-nps-btn {
          width: 36px;
          height: 36px;
          border: 1px solid var(--cyguin-modal-border, #e5e7eb);
          border-radius: var(--cyguin-radius, 8px);
          background: var(--cyguin-modal-bg, #ffffff);
          color: var(--cyguin-text-primary, #111827);
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.15s;
        }

        .survey-nps-btn:hover {
          border-color: var(--cyguin-accent, #ffd21f);
          color: var(--cyguin-accent, #ffd21f);
        }

        .survey-nps-btn.active {
          background: var(--cyguin-accent, #ffd21f);
          border-color: var(--cyguin-accent, #ffd21f);
          color: var(--cyguin-accent-fg, #0a0d17);
        }

        .survey-nps-labels {
          display: flex;
          justify-content: space-between;
          margin-top: var(--cyguin-space-2, 0.5rem);
          font-size: 0.75rem;
          color: var(--cyguin-text-secondary, #6b7280);
        }

        .survey-mc-options {
          display: flex;
          flex-direction: column;
          gap: var(--cyguin-space-3, 0.75rem);
        }

        .survey-mc-option {
          display: flex;
          align-items: center;
          gap: var(--cyguin-space-3, 0.75rem);
          padding: var(--cyguin-space-3, 0.75rem);
          border: 1px solid var(--cyguin-modal-border, #e5e7eb);
          border-radius: var(--cyguin-radius, 8px);
          cursor: pointer;
          transition: border-color 0.15s;
        }

        .survey-mc-option:hover {
          border-color: var(--cyguin-accent, #ffd21f);
        }

        .survey-mc-option:has(input:checked) {
          border-color: var(--cyguin-accent, #ffd21f);
          background: color-mix(in srgb, var(--cyguin-accent, #ffd21f) 10%, transparent);
        }

        .survey-mc-option input[type="radio"] {
          accent-color: var(--cyguin-accent, #ffd21f);
        }

        .survey-text {
          position: relative;
        }

        .survey-text-input {
          width: 100%;
          padding: var(--cyguin-space-3, 0.75rem);
          border: 1px solid var(--cyguin-modal-border, #e5e7eb);
          border-radius: var(--cyguin-radius, 8px);
          font-size: 1rem;
          color: var(--cyguin-text-primary, #111827);
          background: var(--cyguin-modal-bg, #ffffff);
          resize: none;
          font-family: inherit;
          box-sizing: border-box;
        }

        .survey-text-input:focus {
          outline: none;
          border-color: var(--cyguin-accent, #ffd21f);
        }

        .survey-text-counter {
          position: absolute;
          bottom: var(--cyguin-space-2, 0.5rem);
          right: var(--cyguin-space-3, 0.75rem);
          font-size: 0.75rem;
          color: var(--cyguin-text-secondary, #6b7280);
        }

        .survey-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: var(--cyguin-space-3, 0.75rem);
          padding: var(--cyguin-space-4, 1rem) var(--cyguin-space-6, 1.5rem);
          border-top: 1px solid var(--cyguin-modal-border, #e5e7eb);
        }

        .survey-btn {
          padding: var(--cyguin-space-2, 0.5rem) var(--cyguin-space-4, 1rem);
          border-radius: var(--cyguin-radius, 8px);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
        }

        .survey-btn-back {
          background: transparent;
          border: 1px solid var(--cyguin-modal-border, #e5e7eb);
          color: var(--cyguin-text-secondary, #6b7280);
        }

        .survey-btn-back:hover {
          background: var(--cyguin-modal-border, #e5e7eb);
        }

        .survey-btn-next {
          background: var(--cyguin-accent, #ffd21f);
          border: 1px solid var(--cyguin-accent, #ffd21f);
          color: var(--cyguin-accent-fg, #0a0d17);
        }

        .survey-btn-next:hover:not(:disabled) {
          opacity: 0.9;
        }

        .survey-btn-next:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
