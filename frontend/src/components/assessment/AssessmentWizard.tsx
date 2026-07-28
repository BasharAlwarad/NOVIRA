'use client';

import { useMemo } from 'react';
import { AssessmentHeader } from '@/components/assessment/AssessmentHeader';
import {
  AssessmentStep,
  type AssessmentStepOption,
  type AssessmentStepQuestion,
} from '@/components/assessment/AssessmentStep';
import { EstimatedTime } from '@/components/assessment/EstimatedTime';
import { NavigationButtons } from '@/components/assessment/NavigationButtons';
import { ProgressBar } from '@/components/assessment/ProgressBar';
import { StepIndicator } from '@/components/assessment/StepIndicator';
import { useAssessment } from '@/hooks/useAssessment';
import {
  ASSESSMENT_QUESTION_DEFINITIONS,
  ASSESSMENT_STEP_DEFINITIONS,
  type AssessmentQuestionDefinition,
  type AssessmentQuestionId,
  type AssessmentSnapshot,
} from '@/types/assessment';

interface AssessmentWizardProps {
  onComplete?: (assessment: AssessmentSnapshot) => void;
}

const WIZARD_QUESTIONS: ReadonlyArray<AssessmentStepQuestion> =
  ASSESSMENT_STEP_DEFINITIONS.map((step) => {
    const question = ASSESSMENT_QUESTION_DEFINITIONS.find(
      (candidate) => candidate.stepId === step.id
    ) as AssessmentQuestionDefinition<AssessmentQuestionId> | undefined;

    if (!question) {
      throw new Error(`No question definition found for step "${step.id}".`);
    }

    return {
      id: question.id,
      answerId: question.id,
      prompt: question.prompt,
      helpText: question.helpText,
      kind: question.kind as AssessmentStepQuestion['kind'],
      options: question.options as
        | ReadonlyArray<AssessmentStepOption>
        | undefined,
      placeholder: question.placeholder,
      textareaRows: question.textareaRows,
    };
  });

const STEP_TITLES = ASSESSMENT_STEP_DEFINITIONS.map((step) => ({
  title: step.title,
}));

function getCurrentStepConfig(currentStepIndex: number) {
  return WIZARD_QUESTIONS[
    Math.min(Math.max(currentStepIndex, 0), WIZARD_QUESTIONS.length - 1)
  ];
}

export function AssessmentWizard({ onComplete }: AssessmentWizardProps) {
  const {
    assessment,
    updateAnswer,
    nextStep,
    previousStep,
    goToStep,
    isStepValid,
    save,
  } = useAssessment();

  const currentStepConfig = useMemo(
    () => getCurrentStepConfig(assessment.currentStepIndex),
    [assessment.currentStepIndex]
  );

  const answeredCount = useMemo(() => {
    return WIZARD_QUESTIONS.reduce((count, question) => {
      const answer = assessment.answers[question.answerId];

      if (typeof answer === 'string') {
        return answer.trim().length > 0 ? count + 1 : count;
      }

      return answer != null ? count + 1 : count;
    }, 0);
  }, [assessment.answers]);

  const currentAnswer = assessment.answers[currentStepConfig.answerId];
  const canGoBack = assessment.currentStepIndex > 0;
  const canGoNext = isStepValid(assessment.currentStepIndex);
  const isFinalStep =
    assessment.currentStepIndex === WIZARD_QUESTIONS.length - 1;

  const handleNext = () => {
    if (!canGoNext) {
      return;
    }

    if (isFinalStep) {
      save();
      onComplete?.(assessment);
      return;
    }

    nextStep();
  };

  const handleStepJump = (stepIndex: number) => {
    goToStep(stepIndex);
  };

  return (
    <section className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-4 shadow-[0_24px_120px_rgba(15,23,42,0.12)] sm:p-6 lg:p-8">
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-300/60 to-transparent" />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 lg:gap-8">
        <AssessmentHeader />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <ProgressBar
            answeredCount={answeredCount}
            totalQuestions={WIZARD_QUESTIONS.length}
          />
          <EstimatedTime
            currentStep={assessment.currentStepIndex + 1}
            totalSteps={WIZARD_QUESTIONS.length}
          />
        </div>

        <StepIndicator
          currentStepIndex={assessment.currentStepIndex}
          steps={STEP_TITLES}
          onStepSelect={handleStepJump}
        />

        <AssessmentStep
          stepIndex={assessment.currentStepIndex}
          totalSteps={WIZARD_QUESTIONS.length}
          question={currentStepConfig}
          answer={currentAnswer}
          onAnswerChange={updateAnswer}
        />

        <div className="rounded-4xl border border-slate-200 bg-white/80 px-5 py-4 shadow-sm shadow-slate-200/50 backdrop-blur">
          <NavigationButtons
            canGoBack={canGoBack}
            canGoNext={canGoNext}
            isFinalStep={isFinalStep}
            onPrevious={previousStep}
            onNext={handleNext}
            nextLabel={isFinalStep ? 'Save assessment' : 'Next'}
          />
        </div>
      </div>
    </section>
  );
}
