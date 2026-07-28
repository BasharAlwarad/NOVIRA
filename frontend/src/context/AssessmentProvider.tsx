'use client';

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import {
  ASSESSMENT_STEP_DEFINITIONS,
  createDefaultAssessmentState,
  getAssessmentSnapshot,
  getAssessmentStepIndex,
  type AssessmentAnswerValue,
  type AssessmentSnapshot,
  type AssessmentState,
} from '@/types/assessment';
import {
  clearAssessment,
  loadAssessment,
  saveAssessment,
} from '@/lib/assessment-storage';
import { validateStep } from '@/lib/assessment-validation';

type AssessmentAction =
  | { type: 'hydrate'; payload: AssessmentState }
  | { type: 'update-answer'; questionId: string; value: AssessmentAnswerValue }
  | { type: 'go-to-step'; stepIndex: number }
  | { type: 'reset' };

interface AssessmentContextValue {
  assessment: AssessmentSnapshot;
  updateAnswer: (questionId: string, value: AssessmentAnswerValue) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (stepIndex: number) => void;
  resetAssessment: () => void;
  isStepValid: (stepIndex?: number) => boolean;
  save: () => boolean;
  load: () => boolean;
  clear: () => boolean;
}

const AssessmentContext = createContext<AssessmentContextValue | null>(null);

function assessmentReducer(
  state: AssessmentState,
  action: AssessmentAction
): AssessmentState {
  switch (action.type) {
    case 'hydrate':
      return action.payload;
    case 'update-answer':
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.questionId]: action.value,
        },
      };
    case 'go-to-step': {
      const boundedIndex = Math.min(
        Math.max(action.stepIndex, 0),
        ASSESSMENT_STEP_DEFINITIONS.length - 1
      );

      return {
        ...state,
        currentStepId: ASSESSMENT_STEP_DEFINITIONS[boundedIndex].id,
      };
    }
    case 'reset':
      return createDefaultAssessmentState();
    default:
      return state;
  }
}

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [assessmentState, dispatch] = useReducer(
    assessmentReducer,
    undefined,
    createDefaultAssessmentState
  );

  useEffect(() => {
    const storedAssessment = loadAssessment();

    if (storedAssessment) {
      dispatch({ type: 'hydrate', payload: storedAssessment });
    }
  }, []);

  const persistAssessment = useCallback((nextAssessment: AssessmentState) => {
    const savedEnvelope = saveAssessment(nextAssessment);

    if (!savedEnvelope) {
      return false;
    }

    dispatch({ type: 'hydrate', payload: savedEnvelope.assessment });
    return true;
  }, []);

  const updateAnswer = useCallback(
    (questionId: string, value: AssessmentAnswerValue) => {
      const nextAssessment: AssessmentState = {
        ...assessmentState,
        answers: {
          ...assessmentState.answers,
          [questionId]: value,
        },
      };

      dispatch({ type: 'update-answer', questionId, value });
      persistAssessment(nextAssessment);
    },
    [assessmentState, persistAssessment]
  );

  const goToStep = useCallback(
    (stepIndex: number) => {
      const boundedIndex = Math.min(
        Math.max(stepIndex, 0),
        ASSESSMENT_STEP_DEFINITIONS.length - 1
      );

      const nextAssessment: AssessmentState = {
        ...assessmentState,
        currentStepId: ASSESSMENT_STEP_DEFINITIONS[boundedIndex].id,
      };

      dispatch({ type: 'go-to-step', stepIndex: boundedIndex });
      persistAssessment(nextAssessment);
    },
    [assessmentState, persistAssessment]
  );

  const nextStep = useCallback(() => {
    const currentIndex = getAssessmentStepIndex(assessmentState.currentStepId);
    const nextIndex = Math.min(
      currentIndex + 1,
      ASSESSMENT_STEP_DEFINITIONS.length - 1
    );

    goToStep(nextIndex);
  }, [assessmentState.currentStepId, goToStep]);

  const previousStep = useCallback(() => {
    const currentIndex = getAssessmentStepIndex(assessmentState.currentStepId);
    const previousIndex = Math.max(currentIndex - 1, 0);

    goToStep(previousIndex);
  }, [assessmentState.currentStepId, goToStep]);

  const resetAssessment = useCallback(() => {
    const nextAssessment = createDefaultAssessmentState();

    dispatch({ type: 'reset' });
    persistAssessment(nextAssessment);
  }, [persistAssessment]);

  const isStepValid = useCallback(
    (stepIndex?: number) => {
      const boundedIndex =
        stepIndex == null
          ? getAssessmentStepIndex(assessmentState.currentStepId)
          : Math.min(
              Math.max(stepIndex, 0),
              ASSESSMENT_STEP_DEFINITIONS.length - 1
            );

      const stepId =
        ASSESSMENT_STEP_DEFINITIONS[boundedIndex]?.id ??
        assessmentState.currentStepId;

      return validateStep(assessmentState, stepId).valid;
    },
    [assessmentState]
  );

  const save = useCallback(
    () => persistAssessment(assessmentState),
    [assessmentState, persistAssessment]
  );

  const load = useCallback(() => {
    const storedAssessment = loadAssessment();

    if (!storedAssessment) {
      return false;
    }

    dispatch({ type: 'hydrate', payload: storedAssessment });
    return true;
  }, []);

  const clear = useCallback(() => {
    const cleared = clearAssessment();

    if (cleared) {
      dispatch({ type: 'reset' });
    }

    return cleared;
  }, []);

  const contextValue = useMemo<AssessmentContextValue>(
    () => ({
      assessment: getAssessmentSnapshot(assessmentState),
      updateAnswer,
      nextStep,
      previousStep,
      goToStep,
      resetAssessment,
      isStepValid,
      save,
      load,
      clear,
    }),
    [
      assessmentState,
      updateAnswer,
      nextStep,
      previousStep,
      goToStep,
      resetAssessment,
      isStepValid,
      save,
      load,
      clear,
    ]
  );

  return (
    <AssessmentContext.Provider value={contextValue}>
      {children}
    </AssessmentContext.Provider>
  );
}

export { AssessmentContext };
