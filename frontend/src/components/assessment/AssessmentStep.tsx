'use client';

import { OptionCard } from '@/components/assessment/OptionCard';
import { QuestionCard } from '@/components/assessment/QuestionCard';
import { QuestionTransition } from '@/components/assessment/QuestionTransition';
import type { AssessmentAnswerValue } from '@/types/assessment';

export interface AssessmentStepOption {
  label: string;
  value: string;
  description?: string;
}

export interface AssessmentStepQuestion {
  id: string;
  answerId: string;
  prompt: string;
  description?: string;
  helpText?: string;
  kind: 'select' | 'textarea';
  options?: ReadonlyArray<AssessmentStepOption>;
  placeholder?: string;
  textareaRows?: number;
}

interface AssessmentStepProps {
  stepIndex: number;
  totalSteps: number;
  question: AssessmentStepQuestion;
  answer: AssessmentAnswerValue;
  onAnswerChange: (questionId: string, value: AssessmentAnswerValue) => void;
}

export function AssessmentStep({
  stepIndex,
  totalSteps,
  question,
  answer,
  onAnswerChange,
}: AssessmentStepProps) {
  const isTextarea = question.kind === 'textarea';

  return (
    <QuestionTransition transitionKey={`${question.id}-${stepIndex}`}>
      <QuestionCard
        eyebrow={`Question ${stepIndex + 1} of ${totalSteps}`}
        title={question.prompt}
        description={question.description ?? question.helpText}
      >
        {isTextarea ? (
          <label className="block space-y-3">
            <span className="sr-only">{question.prompt}</span>
            <textarea
              value={typeof answer === 'string' ? answer : ''}
              onChange={(event) =>
                onAnswerChange(question.answerId, event.target.value)
              }
              placeholder={question.placeholder}
              rows={question.textareaRows ?? 5}
              className="min-h-40 w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-900 shadow-sm shadow-slate-200/50 transition-all duration-200 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
            />
          </label>
        ) : (
          <div
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
            role="radiogroup"
            aria-label={question.prompt}
          >
            {question.options?.map((option) => {
              const selected = answer === option.value;

              return (
                <OptionCard
                  key={option.value}
                  label={option.label}
                  description={option.description}
                  selected={selected}
                  aria-pressed={selected}
                  onClick={() =>
                    onAnswerChange(question.answerId, option.value)
                  }
                />
              );
            })}
          </div>
        )}
      </QuestionCard>
    </QuestionTransition>
  );
}
