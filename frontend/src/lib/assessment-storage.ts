import {
  ASSESSMENT_STORAGE_KEY,
  ASSESSMENT_STORAGE_VERSION,
  createDefaultAssessmentState,
  getAssessmentStepDefinition,
  type AssessmentState,
} from '@/types/assessment';

export interface AssessmentStorageEnvelope {
  version: number;
  lastUpdated: string;
  assessment: AssessmentState;
}

function hasWindowStorage(): boolean {
  return (
    typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  );
}

function normalizeAssessmentState(
  assessment: Partial<AssessmentState>,
  lastUpdated: string
): AssessmentState {
  const defaults = createDefaultAssessmentState();
  const legacyAnswers = (assessment.answers ?? {}) as Record<string, unknown>;
  const currentStepId =
    assessment.currentStepId &&
    getAssessmentStepDefinition(assessment.currentStepId)
      ? assessment.currentStepId
      : defaults.currentStepId;

  const migratedHighestEducation =
    assessment.answers?.highestEducation ??
    (legacyAnswers.education as AssessmentState['answers']['highestEducation']);

  return {
    assessmentType: assessment.assessmentType ?? defaults.assessmentType,
    currentStepId,
    answers: {
      ...defaults.answers,
      ...(assessment.answers ?? {}),
      highestEducation:
        migratedHighestEducation ?? defaults.answers.highestEducation,
    },
    metadata: {
      lastUpdated: assessment.metadata?.lastUpdated ?? lastUpdated,
    },
  };
}

function safeParseAssessment(
  rawValue: string | null
): AssessmentStorageEnvelope | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);

    if (!parsedValue || typeof parsedValue !== 'object') {
      return null;
    }

    const envelope = parsedValue as Partial<AssessmentStorageEnvelope>;

    if (
      typeof envelope.version !== 'number' ||
      typeof envelope.lastUpdated !== 'string'
    ) {
      return null;
    }

    if (!envelope.assessment || typeof envelope.assessment !== 'object') {
      return null;
    }

    return {
      version: envelope.version,
      lastUpdated: envelope.lastUpdated,
      assessment: normalizeAssessmentState(
        envelope.assessment as Partial<AssessmentState>,
        envelope.lastUpdated
      ),
    };
  } catch {
    return null;
  }
}

export function saveAssessment(
  assessment: AssessmentState
): AssessmentStorageEnvelope | null {
  if (!hasWindowStorage()) {
    return null;
  }

  try {
    const lastUpdated = new Date().toISOString();
    const envelope: AssessmentStorageEnvelope = {
      version: ASSESSMENT_STORAGE_VERSION,
      lastUpdated,
      assessment: {
        ...assessment,
        metadata: {
          ...assessment.metadata,
          lastUpdated,
        },
      },
    };

    window.localStorage.setItem(
      ASSESSMENT_STORAGE_KEY,
      JSON.stringify(envelope)
    );

    return envelope;
  } catch {
    return null;
  }
}

export function loadAssessment(): AssessmentState | null {
  if (!hasWindowStorage()) {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(ASSESSMENT_STORAGE_KEY);
    const parsedEnvelope = safeParseAssessment(storedValue);

    if (!parsedEnvelope) {
      return null;
    }

    if (parsedEnvelope.version !== ASSESSMENT_STORAGE_VERSION) {
      return null;
    }

    return parsedEnvelope.assessment;
  } catch {
    return null;
  }
}

export function clearAssessment(): boolean {
  if (!hasWindowStorage()) {
    return false;
  }

  try {
    window.localStorage.removeItem(ASSESSMENT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
