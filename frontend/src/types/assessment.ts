export enum AssessmentType {
  GermanyPathway = 'germany-pathway',
}

export enum AssessmentStepId {
  Country = 'country',
  Age = 'age',
  Education = 'education',
  Path = 'path',
  German = 'german',
  English = 'english',
  Passport = 'passport',
  Budget = 'budget',
}

export enum DesiredPath {
  University = 'university',
  Ausbildung = 'ausbildung',
  Employment = 'employment',
  Unsure = 'unsure',
}

export enum EducationLevel {
  HighSchool = 'high-school',
  TechnicalDiploma = 'technical-diploma',
  Bachelors = 'bachelors',
  Masters = 'masters',
  Doctorate = 'doctorate',
}

export enum LanguageLevel {
  None = 'none',
  A1 = 'a1',
  A2 = 'a2',
  B1 = 'b1',
  B2 = 'b2',
  C1 = 'c1',
  C1Plus = 'c1-plus',
  Beginner = 'beginner',
  Intermediate = 'intermediate',
  Advanced = 'advanced',
  Fluent = 'fluent',
}

export enum PassportStatus {
  Yes = 'yes',
  No = 'no',
  Expired = 'expired',
}

export enum FinancialSituation {
  LessThan2000 = 'less-than-2000',
  Between2000And5000 = 'between-2000-and-5000',
  Between5000And10000 = 'between-5000-and-10000',
  MoreThan10000 = 'more-than-10000',
  Unsure = 'unsure',
}

export type AssessmentAnswerValue = string | number | boolean | string[] | null;

export type AssessmentQuestionKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multi-select';

export type AssessmentQuestionId =
  | 'country'
  | 'age'
  | 'highestEducation'
  | 'desiredPath'
  | 'germanLevel'
  | 'englishLevel'
  | 'passportStatus'
  | 'financialSituation';

export interface AssessmentOption<
  TValue extends AssessmentAnswerValue = AssessmentAnswerValue,
> {
  label: string;
  value: TValue;
  description?: string;
}

export interface AssessmentQuestionValidationRule {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string | RegExp;
}

export interface AssessmentQuestionDefinition<
  TQuestionId extends string = string,
  TAnswer extends AssessmentAnswerValue = AssessmentAnswerValue,
> {
  id: TQuestionId;
  stepId: AssessmentStepId;
  label: string;
  /** Full question text shown to the user (may differ from the short `label`). */
  prompt: string;
  kind: AssessmentQuestionKind;
  required: boolean;
  helpText?: string;
  placeholder?: string;
  multiSelect?: boolean;
  textareaRows?: number;
  options?: ReadonlyArray<AssessmentOption<TAnswer>>;
  validation?: AssessmentQuestionValidationRule;
}

export interface AssessmentStepDefinition<TQuestionId extends string = string> {
  id: AssessmentStepId;
  title: string;
  description?: string;
  questionIds: ReadonlyArray<TQuestionId>;
}

export interface AssessmentMetadata {
  lastUpdated: string | null;
}

export interface AssessmentAnswers {
  country: string;
  age: string | null;
  highestEducation: EducationLevel | null;
  desiredPath: DesiredPath | null;
  germanLevel: LanguageLevel | null;
  englishLevel: LanguageLevel | null;
  passportStatus: PassportStatus | null;
  financialSituation: FinancialSituation | null;
  [key: string]: AssessmentAnswerValue;
}

export interface AssessmentState {
  assessmentType: AssessmentType;
  currentStepId: AssessmentStepId;
  answers: AssessmentAnswers;
  metadata: AssessmentMetadata;
}

export interface AssessmentSnapshot extends AssessmentState {
  currentStepIndex: number;
}

export const ASSESSMENT_STORAGE_VERSION = 2;

export const ASSESSMENT_STORAGE_KEY = 'novira.assessment';

export const ASSESSMENT_QUESTION_DEFINITIONS = [
  {
    id: 'country',
    stepId: AssessmentStepId.Country,
    label: 'Country',
    prompt: 'Where do you currently live?',
    kind: 'select',
    required: true,
    options: [
      { label: 'Egypt', value: 'egypt' },
      { label: 'Syria', value: 'syria' },
      { label: 'Jordan', value: 'jordan' },
      { label: 'Iraq', value: 'iraq' },
      { label: 'Lebanon', value: 'lebanon' },
      { label: 'Other', value: 'other' },
    ],
  },
  {
    id: 'age',
    stepId: AssessmentStepId.Age,
    label: 'Age',
    prompt: 'How old are you?',
    kind: 'select',
    required: true,
    options: [
      { label: 'Under 18', value: 'under-18' },
      { label: '18–24', value: '18-24' },
      { label: '25–30', value: '25-30' },
      { label: '31–40', value: '31-40' },
      { label: '40+', value: '40-plus' },
    ],
  },
  {
    id: 'highestEducation',
    stepId: AssessmentStepId.Education,
    label: 'Highest Education',
    prompt: 'What is your highest education?',
    kind: 'select',
    required: true,
    options: [
      { label: 'High School', value: EducationLevel.HighSchool },
      { label: 'Technical Diploma', value: EducationLevel.TechnicalDiploma },
      { label: 'Bachelor', value: EducationLevel.Bachelors },
      { label: 'Master', value: EducationLevel.Masters },
      { label: 'PhD', value: EducationLevel.Doctorate },
    ],
  },
  {
    id: 'desiredPath',
    stepId: AssessmentStepId.Path,
    label: 'Desired Path',
    prompt: 'Which pathway interests you most?',
    kind: 'select',
    required: true,
    options: [
      { label: 'University', value: DesiredPath.University },
      { label: 'Ausbildung', value: DesiredPath.Ausbildung },
      { label: 'Employment', value: DesiredPath.Employment },
      { label: 'I’m not sure', value: DesiredPath.Unsure },
    ],
  },
  {
    id: 'germanLevel',
    stepId: AssessmentStepId.German,
    label: 'German Level',
    prompt: 'German Language Level',
    kind: 'select',
    required: true,
    options: [
      { label: 'None', value: LanguageLevel.None },
      { label: 'A1', value: LanguageLevel.A1 },
      { label: 'A2', value: LanguageLevel.A2 },
      { label: 'B1', value: LanguageLevel.B1 },
      { label: 'B2', value: LanguageLevel.B2 },
      { label: 'C1', value: LanguageLevel.C1 },
      { label: 'C1+', value: LanguageLevel.C1Plus },
    ],
  },
  {
    id: 'englishLevel',
    stepId: AssessmentStepId.English,
    label: 'English Level',
    prompt: 'English Level',
    kind: 'select',
    required: true,
    options: [
      { label: 'Beginner', value: LanguageLevel.Beginner },
      { label: 'Intermediate', value: LanguageLevel.Intermediate },
      { label: 'Advanced', value: LanguageLevel.Advanced },
      { label: 'Fluent', value: LanguageLevel.Fluent },
    ],
  },
  {
    id: 'passportStatus',
    stepId: AssessmentStepId.Passport,
    label: 'Passport Status',
    prompt: 'Passport Status',
    kind: 'select',
    required: true,
    options: [
      { label: 'Yes', value: PassportStatus.Yes },
      { label: 'No', value: PassportStatus.No },
      { label: 'Expired', value: PassportStatus.Expired },
    ],
  },
  {
    id: 'financialSituation',
    stepId: AssessmentStepId.Budget,
    label: 'Financial Situation',
    prompt: 'Available Budget',
    kind: 'select',
    required: true,
    options: [
      { label: 'Less than €2,000', value: FinancialSituation.LessThan2000 },
      { label: '€2,000–5,000', value: FinancialSituation.Between2000And5000 },
      { label: '€5,000–10,000', value: FinancialSituation.Between5000And10000 },
      { label: 'More than €10,000', value: FinancialSituation.MoreThan10000 },
      { label: 'Not Sure', value: FinancialSituation.Unsure },
    ],
  },
] as const satisfies ReadonlyArray<
  AssessmentQuestionDefinition<AssessmentQuestionId>
>;

export const ASSESSMENT_STEP_DEFINITIONS = [
  {
    id: AssessmentStepId.Country,
    title: 'Country',
    description: 'Where you currently live.',
    questionIds: ['country'],
  },
  {
    id: AssessmentStepId.Age,
    title: 'Age',
    description: 'Your age range.',
    questionIds: ['age'],
  },
  {
    id: AssessmentStepId.Education,
    title: 'Education',
    description: 'Your highest education level.',
    questionIds: ['highestEducation'],
  },
  {
    id: AssessmentStepId.Path,
    title: 'Pathway',
    description: 'The path that interests you most.',
    questionIds: ['desiredPath'],
  },
  {
    id: AssessmentStepId.German,
    title: 'German',
    description: 'Your German level.',
    questionIds: ['germanLevel'],
  },
  {
    id: AssessmentStepId.English,
    title: 'English',
    description: 'Your English level.',
    questionIds: ['englishLevel'],
  },
  {
    id: AssessmentStepId.Passport,
    title: 'Passport',
    description: 'Your passport status.',
    questionIds: ['passportStatus'],
  },
  {
    id: AssessmentStepId.Budget,
    title: 'Budget',
    description: 'Your available budget.',
    questionIds: ['financialSituation'],
  },
] as const satisfies ReadonlyArray<
  AssessmentStepDefinition<AssessmentQuestionId>
>;

export function createDefaultAssessmentAnswers(): AssessmentAnswers {
  return {
    country: '',
    age: null,
    highestEducation: null,
    desiredPath: null,
    germanLevel: null,
    englishLevel: null,
    passportStatus: null,
    financialSituation: null,
  };
}

export function createDefaultAssessmentState(): AssessmentState {
  return {
    assessmentType: AssessmentType.GermanyPathway,
    currentStepId: AssessmentStepId.Country,
    answers: createDefaultAssessmentAnswers(),
    metadata: {
      lastUpdated: null,
    },
  };
}

export function getAssessmentQuestionDefinition(questionId: string) {
  return (
    ASSESSMENT_QUESTION_DEFINITIONS.find(
      (question) => question.id === questionId
    ) ?? null
  );
}

export function getAssessmentStepDefinition(stepId: AssessmentStepId) {
  return ASSESSMENT_STEP_DEFINITIONS.find((step) => step.id === stepId) ?? null;
}

export function getAssessmentStepIndex(stepId: AssessmentStepId) {
  return ASSESSMENT_STEP_DEFINITIONS.findIndex((step) => step.id === stepId);
}

export function getAssessmentSnapshot(
  state: AssessmentState
): AssessmentSnapshot {
  return {
    ...state,
    currentStepIndex: Math.max(0, getAssessmentStepIndex(state.currentStepId)),
  };
}
