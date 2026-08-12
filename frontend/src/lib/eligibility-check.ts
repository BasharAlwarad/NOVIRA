import {
  DesiredPath,
  EducationLevel,
  FinancialSituation,
  LanguageLevel,
  type AssessmentAnswers,
} from '@/types/assessment';
import type { EvaluablePath } from '@/lib/assessment-verdict';

/**
 * Requirements-based eligibility check — a deterministic, explainable layer
 * separate from the fit-scoring engine in assessment-verdict.ts. Where that
 * engine answers "how strong is this profile," this answers a different
 * question: "does this profile meet Germany's real, official requirements
 * for this path, and if not, what specifically is missing?"
 *
 * Design and sourcing: Matching-Algorithm-Study.md §2.1/§2.2 (research) and
 * §7 (this framework). Funnel context: Plan.md §4.
 *
 * Every requirement is one of three states, never a flat pass/fail:
 * - 'met' — already satisfied.
 * - 'addressable' — a real gap, but closeable on a realistic timeline
 *   (language level, financial proof). Never phrased as a rejection.
 * - 'fixed' — a real gap that needs a genuine extra step, not quickly
 *   resolvable (e.g. Studienkolleg for a Thanaweya-Amma-only University
 *   applicant) — still explained as a path forward, not a flat "no."
 *
 * Employment is deliberately not covered yet — jobs/employment matching is
 * out of scope for the current product (see CLAUDE.md), so this returns
 * null for that path rather than a half-researched guess.
 */

export type RequirementStatus = 'met' | 'addressable' | 'fixed';

export interface RequirementCheck {
  id: string;
  label: string;
  status: RequirementStatus;
  explanation: string;
}

function meetsGermanB1(level: LanguageLevel | null): boolean {
  switch (level) {
    case LanguageLevel.B1:
    case LanguageLevel.B2:
    case LanguageLevel.C1:
    case LanguageLevel.C1Plus:
      return true;
    default:
      return false;
  }
}

function checkUniversityEligibility(answers: AssessmentAnswers): RequirementCheck[] {
  const hasClearedEducationPathway =
    answers.highestEducation === EducationLevel.Bachelors ||
    answers.highestEducation === EducationLevel.Masters ||
    answers.highestEducation === EducationLevel.Doctorate;

  const germanReady = meetsGermanB1(answers.germanLevel);
  const englishReady =
    answers.englishLevel === LanguageLevel.Advanced ||
    answers.englishLevel === LanguageLevel.Fluent;
  const languageMet = germanReady || englishReady;

  const financialMet = answers.financialSituation === FinancialSituation.MoreThan12000;
  // "Unsure" gets the same "close" treatment as Between5000And12000, matching
  // assessment-verdict.ts's financialSituation scoring (both get partial
  // credit) — keeps the two systems consistent about the same self-reported answer.
  const financialClose =
    answers.financialSituation === FinancialSituation.Between5000And12000 ||
    answers.financialSituation === FinancialSituation.Unsure;

  return [
    {
      id: 'education-pathway',
      label: 'Education pathway',
      status: hasClearedEducationPathway ? 'met' : 'fixed',
      explanation: hasClearedEducationPathway
        ? 'Your existing degree already clears this requirement.'
        : "A secondary school certificate alone doesn't grant direct German university admission. You'd typically need a Studienkolleg (a one-year preparatory program, itself requiring German B1) or one to two years of prior university study in Egypt. If you've already completed some university study, this may already be closer than it looks — this assessment doesn't yet ask about partial university attendance.",
    },
    {
      id: 'language',
      label: 'Language level',
      status: languageMet ? 'met' : 'addressable',
      explanation: languageMet
        ? 'Your language level meets what German-taught (B1 German) or English-taught programs typically require.'
        : 'Most German-taught programs require German B1; English-taught programs need strong English instead. Building German toward B1 is the more widely available route, since more programs are German-taught than English-taught.',
    },
    {
      id: 'financial-proof',
      label: 'Financial proof',
      status: financialMet ? 'met' : 'addressable',
      explanation: financialMet
        ? 'Your stated savings comfortably cover the ~€11,904/year German student visa requirement.'
        : financialClose
          ? "You may already be close to the ~€11,904/year requirement. A blocked account isn't the only option — a DAAD/Erasmus scholarship letter or a formal sponsor declaration from someone living in Germany also count."
          : "German student visas require proof of ~€11,904/year, but a blocked account isn't the only path — a scholarship letter or a formal declaration from a sponsor living in Germany can also meet this.",
    },
  ];
}

function checkAusbildungEligibility(answers: AssessmentAnswers): RequirementCheck[] {
  const languageMet = meetsGermanB1(answers.germanLevel);

  return [
    {
      id: 'education-pathway',
      label: 'Education pathway',
      status: 'met',
      explanation:
        'A secondary school certificate is directly accepted for Ausbildung — there is no university-style preparatory hurdle for this path.',
    },
    {
      id: 'language',
      label: 'Language level',
      status: languageMet ? 'met' : 'addressable',
      explanation: languageMet
        ? 'Your German level meets the B1 certificate requirement for an Ausbildung visa.'
        : 'Ausbildung visas require a B1 German certificate. This is realistically achievable with focused study — some employers even offer language classes alongside the training itself.',
    },
    {
      id: 'financial-proof',
      label: 'Financial proof',
      status: 'met',
      explanation:
        "Ausbildung positions pay a training salary, so — unlike university — there's no separate blocked-account or savings requirement to prove.",
    },
  ];
}

export function checkEligibility(
  answers: AssessmentAnswers,
  path: EvaluablePath
): RequirementCheck[] | null {
  switch (path) {
    case DesiredPath.University:
      return checkUniversityEligibility(answers);
    case DesiredPath.Ausbildung:
      return checkAusbildungEligibility(answers);
    case DesiredPath.Employment:
    default:
      // Not covered yet — jobs/employment matching is explicitly out of
      // scope for now (see CLAUDE.md), not a half-researched guess.
      return null;
  }
}
