import { getOccupationDemandTier } from '@/lib/occupation-demand';
import {
  DesiredPath,
  EducationLevel,
  FinancialSituation,
  GermanyConnection,
  LanguageCertificateStatus,
  LanguageLevel,
  PassportStatus,
  WorkExperience,
  type AssessmentAnswers,
} from '@/types/assessment';

/**
 * Tier 1 verdict algorithm — a deterministic rules engine, not AI.
 * See Matching-Algorithm-Study.md for the research this is based on and
 * Plan.md §3/§8 for the wording-discipline rules this must respect:
 * the numeric scores below are internal only and must never be shown to
 * the user — only the qualitative `VerdictOutcome` they produce.
 */

export type PathFit = 'strong' | 'borderline' | 'weak';

export type EvaluablePath =
  | DesiredPath.University
  | DesiredPath.Ausbildung
  | DesiredPath.Employment;

export interface PathScore {
  path: EvaluablePath;
  points: number;
  maxPoints: number;
  ratio: number;
  fit: PathFit;
}

export type VerdictOutcome =
  | { kind: 'confirmed'; path: EvaluablePath; scores: PathScore[] }
  | {
      kind: 'alternative';
      statedPath: EvaluablePath;
      suggestedPath: EvaluablePath;
      scores: PathScore[];
    }
  | { kind: 'suggested'; suggestedPath: EvaluablePath; scores: PathScore[] }
  | { kind: 'unclear'; scores: PathScore[] };

const STRONG_RATIO_THRESHOLD = 0.7;
const BORDERLINE_RATIO_THRESHOLD = 0.4;

function fitFromRatio(ratio: number): PathFit {
  if (ratio >= STRONG_RATIO_THRESHOLD) {
    return 'strong';
  }

  if (ratio >= BORDERLINE_RATIO_THRESHOLD) {
    return 'borderline';
  }

  return 'weak';
}

function buildScore(
  path: EvaluablePath,
  points: number,
  maxPoints: number
): PathScore {
  const ratio = maxPoints > 0 ? points / maxPoints : 0;
  return { path, points, maxPoints, ratio, fit: fitFromRatio(ratio) };
}

// ---- shared signal helpers ------------------------------------------------

function germanLevelPoints(level: LanguageLevel | null): number {
  switch (level) {
    case LanguageLevel.A2:
      return 1;
    case LanguageLevel.B1:
      return 2;
    case LanguageLevel.B2:
      return 3;
    case LanguageLevel.C1:
    case LanguageLevel.C1Plus:
      return 4;
    default:
      return 0; // None, A1, or unanswered
  }
}

// Ausbildung cares less about A2 (research: "possible but tough") and more
// about clearing B1, so it uses its own scale per Matching-Algorithm-Study.md §5.2.
function germanLevelPointsForAusbildung(level: LanguageLevel | null): number {
  switch (level) {
    case LanguageLevel.A2:
      return 1;
    case LanguageLevel.B1:
      return 3;
    case LanguageLevel.B2:
    case LanguageLevel.C1:
    case LanguageLevel.C1Plus:
      return 4;
    default:
      return 0;
  }
}

function englishLevelPoints(level: LanguageLevel | null): number {
  switch (level) {
    case LanguageLevel.Intermediate:
      return 1;
    case LanguageLevel.Advanced:
      return 2;
    case LanguageLevel.Fluent:
      return 3;
    default:
      return 0; // Beginner or unanswered
  }
}

function hasCertifiedGerman(status: LanguageCertificateStatus | null): boolean {
  return (
    status === LanguageCertificateStatus.CertifiedGerman ||
    status === LanguageCertificateStatus.CertifiedBoth
  );
}

function hasAnyCertifiedLanguage(
  status: LanguageCertificateStatus | null
): boolean {
  return status != null && status !== LanguageCertificateStatus.None;
}

function hasValidPassport(status: PassportStatus | null): boolean {
  return status === PassportStatus.Yes;
}

function hasGermanyConnection(connections: GermanyConnection[]): boolean {
  return connections.some((connection) => connection !== GermanyConnection.None);
}

type AgeBand = 'under-18' | '18-30' | '31-40' | '40-plus' | 'unknown';

function ageBand(age: string | null): AgeBand {
  if (age === 'under-18') return 'under-18';
  if (age === '18-24' || age === '25-30') return '18-30';
  if (age === '31-40') return '31-40';
  if (age === '40-plus') return '40-plus';
  return 'unknown';
}

// ---- University ------------------------------------------------------------

function scoreUniversity(answers: AssessmentAnswers): PathScore {
  let points = 0;
  const maxPoints = 3 + 4 + 1 + 2 + 1 + 1; // 12

  switch (answers.highestEducation) {
    case EducationLevel.TechnicalDiploma:
      points += 1;
      break;
    case EducationLevel.Bachelors:
    case EducationLevel.Masters:
    case EducationLevel.Doctorate:
      points += 3; // already past the Studienkolleg hurdle
      break;
    default:
      break; // High School or unanswered
  }

  // Either language route can lead to a valid program (German- or English-taught).
  points += Math.max(
    germanLevelPoints(answers.germanLevel),
    englishLevelPoints(answers.englishLevel)
  );

  if (hasAnyCertifiedLanguage(answers.languageCertificate)) {
    points += 1;
  }

  switch (answers.financialSituation) {
    case FinancialSituation.Between5000And12000:
    case FinancialSituation.Unsure:
      points += 1;
      break;
    case FinancialSituation.MoreThan12000:
      points += 2;
      break;
    default:
      break; // Less than €5,000
  }

  if (hasValidPassport(answers.passportStatus)) {
    points += 1;
  }

  if (hasGermanyConnection(answers.germanyConnection)) {
    points += 1;
  }

  return buildScore(DesiredPath.University, points, maxPoints);
}

// ---- Ausbildung -------------------------------------------------------------

function scoreAusbildung(answers: AssessmentAnswers): PathScore {
  let points = 0;
  const maxPoints = 3 + 4 + 1 + 3 + 2 + 1; // 14

  // Ausbildung is indifferent to academic level, unlike University.
  switch (answers.highestEducation) {
    case EducationLevel.TechnicalDiploma:
      points += 3;
      break;
    case EducationLevel.HighSchool:
      points += 2;
      break;
    case EducationLevel.Bachelors:
    case EducationLevel.Masters:
    case EducationLevel.Doctorate:
      points += 2; // overqualified is fine, not extra credit
      break;
    default:
      break;
  }

  points += germanLevelPointsForAusbildung(answers.germanLevel);

  if (hasCertifiedGerman(answers.languageCertificate)) {
    points += 1;
  }

  switch (ageBand(answers.age)) {
    case '18-30':
      points += 3;
      break;
    case '31-40':
      points += 2;
      break;
    case 'under-18':
    case '40-plus':
      points += 1;
      break;
    default:
      break;
  }

  switch (answers.workExperience) {
    case WorkExperience.LessThanTwoYears:
      points += 1;
      break;
    case WorkExperience.TwoToFiveYears:
    case WorkExperience.MoreThanFiveYears:
      points += 2;
      break;
    default:
      break; // None
  }

  if (hasValidPassport(answers.passportStatus)) {
    points += 1;
  }

  return buildScore(DesiredPath.Ausbildung, points, maxPoints);
}

// ---- Employment -------------------------------------------------------------

function occupationDemandPoints(answers: AssessmentAnswers): number {
  switch (getOccupationDemandTier(answers.occupationField)) {
    case 'high':
      return 3;
    case 'medium':
      return 1;
    default:
      return 0;
  }
}

function scoreEmployment(answers: AssessmentAnswers): PathScore {
  let points = 0;
  const maxPoints = 3 + 3 + 4 + 7 + 3 + 1 + 1; // 22

  switch (answers.highestEducation) {
    case EducationLevel.Bachelors:
    case EducationLevel.Masters:
    case EducationLevel.Doctorate:
      points += 3;
      break;
    case EducationLevel.TechnicalDiploma:
      points += 2;
      break;
    case EducationLevel.HighSchool:
      points += 1;
      break;
    default:
      break;
  }

  points += occupationDemandPoints(answers);

  switch (answers.workExperience) {
    case WorkExperience.LessThanTwoYears:
      points += 1;
      break;
    case WorkExperience.TwoToFiveYears:
      points += 3;
      break;
    case WorkExperience.MoreThanFiveYears:
      points += 4;
      break;
    default:
      break; // None
  }

  // Both languages contribute — deliberately not weighting English higher
  // for IT/engineering fields yet; a reasonable MVP simplification to revisit.
  points += germanLevelPoints(answers.germanLevel);
  points += englishLevelPoints(answers.englishLevel);

  switch (ageBand(answers.age)) {
    case '18-30':
      points += 3;
      break;
    case '31-40':
      points += 2;
      break;
    case 'under-18':
    case '40-plus':
      points += 1;
      break;
    default:
      break;
  }

  if (hasGermanyConnection(answers.germanyConnection)) {
    points += 1;
  }

  if (hasValidPassport(answers.passportStatus)) {
    points += 1;
  }

  return buildScore(DesiredPath.Employment, points, maxPoints);
}

// ---- overall verdict --------------------------------------------------------

function isEvaluablePath(
  path: DesiredPath | null
): path is EvaluablePath {
  return (
    path === DesiredPath.University ||
    path === DesiredPath.Ausbildung ||
    path === DesiredPath.Employment
  );
}

export function computeVerdict(answers: AssessmentAnswers): VerdictOutcome {
  const scores: PathScore[] = [
    scoreUniversity(answers),
    scoreAusbildung(answers),
    scoreEmployment(answers),
  ];

  const bestScore = scores.reduce((best, current) =>
    current.ratio > best.ratio ? current : best
  );

  if (isEvaluablePath(answers.desiredPath)) {
    const statedScore = scores.find(
      (score) => score.path === answers.desiredPath
    )!;

    if (statedScore.fit === 'strong') {
      return { kind: 'confirmed', path: statedScore.path, scores };
    }

    const strongerAlternative = scores.find(
      (score) => score.path !== statedScore.path && score.fit === 'strong'
    );

    if (strongerAlternative) {
      return {
        kind: 'alternative',
        statedPath: statedScore.path,
        suggestedPath: strongerAlternative.path,
        scores,
      };
    }

    return { kind: 'unclear', scores };
  }

  // desiredPath is "Unsure" or unanswered — look for a clearly strong path.
  if (bestScore.fit === 'strong') {
    return { kind: 'suggested', suggestedPath: bestScore.path, scores };
  }

  return { kind: 'unclear', scores };
}
