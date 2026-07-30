import { getOccupationDemandTier } from '@/lib/occupation-demand';
import {
  DesiredPath,
  EducationLevel,
  FinancialSituation,
  GermanyConnection,
  LanguageCertificateStatus,
  LanguageLevel,
  WorkExperience,
  type AssessmentAnswers,
} from '@/types/assessment';

/**
 * Tier 1 verdict algorithm — a deterministic rules engine, not AI.
 * See Matching-Algorithm-Study.md for the research this is based on and
 * Plan.md §3/§8 for the wording-discipline rules this must respect:
 * the numeric scores below are internal only and must never be shown to
 * the user — only the qualitative `VerdictOutcome` (and the plain-language
 * improvement advice derived from it) they produce.
 */

export type PathFit = 'strong' | 'borderline' | 'weak';

export type EvaluablePath =
  | DesiredPath.University
  | DesiredPath.Ausbildung
  | DesiredPath.Employment;

/** A named key for a scoring factor — used to look up improvement advice. */
export type ScoreFactorKey =
  | 'highestEducation'
  | 'language'
  | 'germanLevel'
  | 'englishLevel'
  | 'languageCertificate'
  | 'financialSituation'
  | 'age'
  | 'workExperience'
  | 'occupationField'
  | 'germanyConnection';

export interface ScoreFactor {
  key: ScoreFactorKey;
  label: string;
  points: number;
  maxPoints: number;
  /** Whether this factor is realistically something a user can act on soon. */
  advisable: boolean;
}

export interface PathScore {
  path: EvaluablePath;
  points: number;
  maxPoints: number;
  ratio: number;
  fit: PathFit;
  factors: ScoreFactor[];
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
  factors: ScoreFactor[]
): PathScore {
  const points = factors.reduce((sum, factor) => sum + factor.points, 0);
  const maxPoints = factors.reduce((sum, factor) => sum + factor.maxPoints, 0);
  const ratio = maxPoints > 0 ? points / maxPoints : 0;
  return { path, points, maxPoints, ratio, fit: fitFromRatio(ratio), factors };
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

function educationPoints(
  education: EducationLevel | null,
  scale: 'university' | 'ausbildung' | 'employment'
): number {
  if (scale === 'university') {
    switch (education) {
      case EducationLevel.TechnicalDiploma:
        return 1;
      case EducationLevel.Bachelors:
      case EducationLevel.Masters:
      case EducationLevel.Doctorate:
        return 3; // already past the Studienkolleg hurdle
      default:
        return 0; // High School or unanswered
    }
  }

  if (scale === 'ausbildung') {
    switch (education) {
      case EducationLevel.TechnicalDiploma:
        return 3;
      case EducationLevel.HighSchool:
        return 2;
      case EducationLevel.Bachelors:
      case EducationLevel.Masters:
      case EducationLevel.Doctorate:
        return 2; // overqualified is fine, not extra credit
      default:
        return 0;
    }
  }

  // employment
  switch (education) {
    case EducationLevel.Bachelors:
    case EducationLevel.Masters:
    case EducationLevel.Doctorate:
      return 3;
    case EducationLevel.TechnicalDiploma:
      return 2;
    case EducationLevel.HighSchool:
      return 1;
    default:
      return 0;
  }
}

function ageBandPoints(band: AgeBand): number {
  switch (band) {
    case '18-30':
      return 3;
    case '31-40':
      return 2;
    case 'under-18':
    case '40-plus':
      return 1;
    default:
      return 0;
  }
}

// ---- University ------------------------------------------------------------

function scoreUniversity(answers: AssessmentAnswers): PathScore {
  // Either language route can lead to a valid program (German- or
  // English-taught) — credit whichever is currently stronger, since that's
  // the direct lever on this path's score.
  const germanPts = germanLevelPoints(answers.germanLevel);
  const englishPts = englishLevelPoints(answers.englishLevel);
  const languageIsGerman = germanPts >= englishPts;

  const factors: ScoreFactor[] = [
    {
      key: 'highestEducation',
      label: 'Education level',
      points: educationPoints(answers.highestEducation, 'university'),
      maxPoints: 3,
      advisable: false, // not a quick fix
    },
    {
      key: languageIsGerman ? 'germanLevel' : 'englishLevel',
      label: languageIsGerman ? 'German language level' : 'English language level',
      points: Math.max(germanPts, englishPts),
      maxPoints: 4,
      advisable: true,
    },
    {
      key: 'languageCertificate',
      label: 'Certified language exam',
      points: hasAnyCertifiedLanguage(answers.languageCertificate) ? 1 : 0,
      maxPoints: 1,
      advisable: true,
    },
    {
      key: 'financialSituation',
      label: 'Financial readiness',
      points:
        answers.financialSituation === FinancialSituation.MoreThan12000
          ? 2
          : answers.financialSituation === FinancialSituation.Between5000And12000 ||
              answers.financialSituation === FinancialSituation.Unsure
            ? 1
            : 0,
      maxPoints: 2,
      advisable: true,
    },
    {
      key: 'germanyConnection',
      label: 'Connection to Germany',
      points: hasGermanyConnection(answers.germanyConnection) ? 1 : 0,
      maxPoints: 1,
      advisable: false, // mostly outside the user's short-term control
    },
  ];

  return buildScore(DesiredPath.University, factors);
}

// ---- Ausbildung -------------------------------------------------------------

function scoreAusbildung(answers: AssessmentAnswers): PathScore {
  const factors: ScoreFactor[] = [
    {
      key: 'highestEducation',
      label: 'Education level',
      points: educationPoints(answers.highestEducation, 'ausbildung'),
      maxPoints: 3,
      advisable: false,
    },
    {
      key: 'germanLevel',
      label: 'German language level',
      points: germanLevelPointsForAusbildung(answers.germanLevel),
      maxPoints: 4,
      advisable: true,
    },
    {
      key: 'languageCertificate',
      label: 'Certified German exam',
      points: hasCertifiedGerman(answers.languageCertificate) ? 1 : 0,
      maxPoints: 1,
      advisable: true,
    },
    {
      key: 'age',
      label: 'Age',
      points: ageBandPoints(ageBand(answers.age)),
      maxPoints: 3,
      advisable: false, // not something to advise on
    },
    {
      key: 'workExperience',
      label: 'Work experience',
      points:
        answers.workExperience === WorkExperience.TwoToFiveYears ||
        answers.workExperience === WorkExperience.MoreThanFiveYears
          ? 2
          : answers.workExperience === WorkExperience.LessThanTwoYears
            ? 1
            : 0,
      maxPoints: 2,
      advisable: true,
    },
  ];

  return buildScore(DesiredPath.Ausbildung, factors);
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
  const factors: ScoreFactor[] = [
    {
      key: 'highestEducation',
      label: 'Education level',
      points: educationPoints(answers.highestEducation, 'employment'),
      maxPoints: 3,
      advisable: false,
    },
    {
      key: 'occupationField',
      label: 'Occupation demand',
      points: occupationDemandPoints(answers),
      maxPoints: 3,
      advisable: false, // not something to advise changing
    },
    {
      key: 'workExperience',
      label: 'Work experience',
      // Both languages contribute independently here — deliberately not
      // weighting English higher for IT/engineering fields yet, a
      // reasonable MVP simplification to revisit (Matching-Algorithm-Study.md §6).
      points:
        answers.workExperience === WorkExperience.MoreThanFiveYears
          ? 4
          : answers.workExperience === WorkExperience.TwoToFiveYears
            ? 3
            : answers.workExperience === WorkExperience.LessThanTwoYears
              ? 1
              : 0,
      maxPoints: 4,
      advisable: true,
    },
    {
      key: 'germanLevel',
      label: 'German language level',
      points: germanLevelPoints(answers.germanLevel),
      maxPoints: 4,
      advisable: true,
    },
    {
      key: 'englishLevel',
      label: 'English language level',
      points: englishLevelPoints(answers.englishLevel),
      maxPoints: 3,
      advisable: true,
    },
    {
      key: 'age',
      label: 'Age',
      points: ageBandPoints(ageBand(answers.age)),
      maxPoints: 3,
      advisable: false,
    },
    {
      key: 'germanyConnection',
      label: 'Connection to Germany',
      points: hasGermanyConnection(answers.germanyConnection) ? 1 : 0,
      maxPoints: 1,
      advisable: false,
    },
  ];

  return buildScore(DesiredPath.Employment, factors);
}

// ---- improvement advice -----------------------------------------------------

const ADVICE_BY_FACTOR: Record<ScoreFactorKey, string> = {
  highestEducation: '',
  germanLevel:
    'Improving your German level — through a course, tutoring, or consistent practice — is one of the most direct ways to strengthen this path. Many programs and employers list German level as a key requirement.',
  englishLevel:
    'Strengthening your English level would help, especially for English-taught programs or internationally-oriented employers.',
  language:
    'Improving your German or English level would strengthen this path — either can work, depending on the program.',
  languageCertificate:
    'Taking a certified language exam (e.g. Goethe-Zertifikat, telc, or TestDaF for German; IELTS or TOEFL for English) turns your self-rated level into documented proof, which institutions and employers generally weigh more heavily than a self-assessment.',
  financialSituation:
    'Building toward the funds required for a student visa (a "blocked account," currently around €11,904/year) is one of the most concrete ways to strengthen a university application.',
  workExperience:
    'Gaining more hands-on experience in your field — even part-time or informal work — can meaningfully strengthen this path over time.',
  age: '',
  occupationField: '',
  germanyConnection: '',
};

export interface ImprovementAdvice {
  factorLabel: string;
  advice: string;
}

const ADVICE_RATIO_THRESHOLD = 0.75;

/** Finds the single most actionable weak spot for a path, if any. */
export function getImprovementAdvice(score: PathScore): ImprovementAdvice | null {
  const candidates = score.factors
    .filter((factor) => factor.advisable && factor.maxPoints > 0)
    .map((factor) => ({ ...factor, factorRatio: factor.points / factor.maxPoints }))
    .sort((a, b) => a.factorRatio - b.factorRatio);

  const weakest = candidates[0];

  if (!weakest || weakest.factorRatio >= ADVICE_RATIO_THRESHOLD) {
    return null; // already strong across the board — nothing meaningful to flag
  }

  return { factorLabel: weakest.label, advice: ADVICE_BY_FACTOR[weakest.key] };
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
