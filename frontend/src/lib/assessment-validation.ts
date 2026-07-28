import {
  ASSESSMENT_QUESTION_DEFINITIONS,
  ASSESSMENT_STEP_DEFINITIONS,
  type AssessmentAnswerValue,
  type AssessmentAnswers,
  type AssessmentQuestionDefinition,
  type AssessmentState,
  type AssessmentStepDefinition,
} from '@/types/assessment';

export interface AssessmentValidationIssue {
  stepId?: string;
  questionId?: string;
  code:
    | 'required'
    | 'type'
    | 'range'
    | 'length'
    | 'pattern'
    | 'option'
    | 'custom';
  message: string;
}

export interface AssessmentValidationResult {
  valid: boolean;
  issues: AssessmentValidationIssue[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidQuestionOption(
  answer: AssessmentAnswerValue,
  question: AssessmentQuestionDefinition
): boolean {
  if (!question.options || question.options.length === 0) {
    return true;
  }

  const allowedValues = question.options.map((option) => option.value);

  if (question.multiSelect) {
    if (!Array.isArray(answer)) {
      return false;
    }

    return answer.every((item) =>
      allowedValues.some((allowedValue) => allowedValue === item)
    );
  }

  return allowedValues.some((allowedValue) => allowedValue === answer);
}

function isValidPattern(answer: string, pattern: string | RegExp): boolean {
  const regularExpression =
    typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  return regularExpression.test(answer);
}

function validateTextAnswer(
  answer: AssessmentAnswerValue,
  question: AssessmentQuestionDefinition
): AssessmentValidationIssue | null {
  if (answer == null || answer === '') {
    return question.required
      ? {
          questionId: question.id,
          stepId: question.stepId,
          code: 'required',
          message: `${question.label} is required.`,
        }
      : null;
  }

  if (!isNonEmptyString(answer)) {
    return {
      questionId: question.id,
      stepId: question.stepId,
      code: 'type',
      message: `${question.label} must be a text value.`,
    };
  }

  const trimmedAnswer = answer.trim();

  if (
    question.validation?.minLength != null &&
    trimmedAnswer.length < question.validation.minLength
  ) {
    return {
      questionId: question.id,
      stepId: question.stepId,
      code: 'length',
      message: `${question.label} must be at least ${question.validation.minLength} characters long.`,
    };
  }

  if (
    question.validation?.maxLength != null &&
    trimmedAnswer.length > question.validation.maxLength
  ) {
    return {
      questionId: question.id,
      stepId: question.stepId,
      code: 'length',
      message: `${question.label} must be ${question.validation.maxLength} characters or less.`,
    };
  }

  if (
    question.validation?.pattern &&
    !isValidPattern(trimmedAnswer, question.validation.pattern)
  ) {
    return {
      questionId: question.id,
      stepId: question.stepId,
      code: 'pattern',
      message: `${question.label} does not match the expected format.`,
    };
  }

  return null;
}

function validateNumberAnswer(
  answer: AssessmentAnswerValue,
  question: AssessmentQuestionDefinition
): AssessmentValidationIssue | null {
  if (answer == null || answer === '') {
    return question.required
      ? {
          questionId: question.id,
          stepId: question.stepId,
          code: 'required',
          message: `${question.label} is required.`,
        }
      : null;
  }

  if (
    typeof answer !== 'number' ||
    Number.isNaN(answer) ||
    !Number.isFinite(answer)
  ) {
    return {
      questionId: question.id,
      stepId: question.stepId,
      code: 'type',
      message: `${question.label} must be a valid number.`,
    };
  }

  if (question.validation?.min != null && answer < question.validation.min) {
    return {
      questionId: question.id,
      stepId: question.stepId,
      code: 'range',
      message: `${question.label} must be at least ${question.validation.min}.`,
    };
  }

  if (question.validation?.max != null && answer > question.validation.max) {
    return {
      questionId: question.id,
      stepId: question.stepId,
      code: 'range',
      message: `${question.label} must be ${question.validation.max} or less.`,
    };
  }

  return null;
}

function validateSelectAnswer(
  answer: AssessmentAnswerValue,
  question: AssessmentQuestionDefinition
): AssessmentValidationIssue | null {
  if (answer == null || answer === '') {
    return question.required
      ? {
          questionId: question.id,
          stepId: question.stepId,
          code: 'required',
          message: `${question.label} is required.`,
        }
      : null;
  }

  if (!isValidQuestionOption(answer, question)) {
    return {
      questionId: question.id,
      stepId: question.stepId,
      code: 'option',
      message: `${question.label} contains an unsupported value.`,
    };
  }

  return null;
}

function validateQuestionAnswer(
  answer: AssessmentAnswerValue,
  question: AssessmentQuestionDefinition
): AssessmentValidationIssue | null {
  switch (question.kind) {
    case 'text':
    case 'textarea':
      return validateTextAnswer(answer, question);
    case 'number':
      return validateNumberAnswer(answer, question);
    case 'select':
    case 'multi-select':
      return validateSelectAnswer(answer, question);
    default:
      return {
        questionId: question.id,
        stepId: question.stepId,
        code: 'custom',
        message: `${question.label} uses an unsupported question type.`,
      };
  }
}

function buildIssuesForQuestions(
  answers: AssessmentAnswers,
  questions: ReadonlyArray<AssessmentQuestionDefinition>
): AssessmentValidationIssue[] {
  const issues: AssessmentValidationIssue[] = [];

  for (const question of questions) {
    const answer = answers[question.id as keyof AssessmentAnswers];
    const issue = validateQuestionAnswer(answer, question);

    if (issue) {
      issues.push(issue);
    }
  }

  return issues;
}

export function isAnswerValid(
  question: AssessmentQuestionDefinition,
  answer: AssessmentAnswerValue
): boolean {
  return validateQuestionAnswer(answer, question) == null;
}

export function validateStep(
  assessment: AssessmentState,
  stepId: AssessmentStepDefinition['id'],
  questions: ReadonlyArray<AssessmentQuestionDefinition> = ASSESSMENT_QUESTION_DEFINITIONS
): AssessmentValidationResult {
  const stepDefinition = ASSESSMENT_STEP_DEFINITIONS.find(
    (step) => step.id === stepId
  );

  if (!stepDefinition) {
    return {
      valid: false,
      issues: [
        {
          stepId,
          code: 'custom',
          message: 'The requested step does not exist.',
        },
      ],
    };
  }

  const stepQuestions = questions.filter(
    (question) => question.stepId === stepId
  );
  const issues = buildIssuesForQuestions(assessment.answers, stepQuestions);

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function validateAssessment(
  assessment: AssessmentState,
  questions: ReadonlyArray<AssessmentQuestionDefinition> = ASSESSMENT_QUESTION_DEFINITIONS
): AssessmentValidationResult {
  const issues = buildIssuesForQuestions(assessment.answers, questions);

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function getStepQuestionIds(stepId: AssessmentStepDefinition['id']) {
  return (
    ASSESSMENT_STEP_DEFINITIONS.find((step) => step.id === stepId)
      ?.questionIds ?? []
  );
}
