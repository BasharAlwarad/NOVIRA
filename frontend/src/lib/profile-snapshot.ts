import type { ProfileSnapshot } from '@/lib/contracts/leads';
import {
  DesiredPath,
  EducationLevel,
  FinancialSituation,
  GermanyConnection,
  LanguageCertificateStatus,
  LanguageLevel,
  PassportStatus,
  RegionFlexibility,
  StartTimeline,
  WorkExperience,
  type AssessmentAnswers,
} from '@/types/assessment';

// Explicit lookup tables (not a generic kebab-case -> PascalCase transform)
// mapping the frontend's assessment enums to the backend's C# enum member
// names, e.g. StartTimeline.AsSoonAsPossible ('asap') has no mechanical
// relationship to its frontend value — a missing entry here is a compile
// error via the Record<..., ...> type, not a silent runtime mismatch.
const EDUCATION_LEVEL_MAP: Record<EducationLevel, ProfileSnapshot['highestEducation'] & string> = {
  [EducationLevel.HighSchool]: 'HighSchool',
  [EducationLevel.TechnicalDiploma]: 'TechnicalDiploma',
  [EducationLevel.Bachelors]: 'Bachelors',
  [EducationLevel.Masters]: 'Masters',
  [EducationLevel.Doctorate]: 'Doctorate',
};

const LANGUAGE_LEVEL_MAP: Record<LanguageLevel, ProfileSnapshot['germanLevel'] & string> = {
  [LanguageLevel.None]: 'None',
  [LanguageLevel.Beginner]: 'Beginner',
  [LanguageLevel.A1]: 'A1',
  [LanguageLevel.A2]: 'A2',
  [LanguageLevel.B1]: 'B1',
  [LanguageLevel.B2]: 'B2',
  [LanguageLevel.C1]: 'C1',
  [LanguageLevel.C1Plus]: 'C1Plus',
  [LanguageLevel.Intermediate]: 'Intermediate',
  [LanguageLevel.Advanced]: 'Advanced',
  [LanguageLevel.Fluent]: 'Fluent',
};

const WORK_EXPERIENCE_MAP: Record<WorkExperience, ProfileSnapshot['workExperience'] & string> = {
  [WorkExperience.None]: 'None',
  [WorkExperience.LessThanTwoYears]: 'LessThanTwoYears',
  [WorkExperience.TwoToFiveYears]: 'TwoToFiveYears',
  [WorkExperience.MoreThanFiveYears]: 'MoreThanFiveYears',
};

const DESIRED_PATH_MAP: Record<DesiredPath, ProfileSnapshot['desiredPath'] & string> = {
  [DesiredPath.University]: 'University',
  [DesiredPath.Ausbildung]: 'Ausbildung',
  [DesiredPath.Employment]: 'Employment',
  [DesiredPath.Unsure]: 'Unsure',
};

const LANGUAGE_CERTIFICATE_MAP: Record<
  LanguageCertificateStatus,
  ProfileSnapshot['languageCertificate'] & string
> = {
  [LanguageCertificateStatus.None]: 'None',
  [LanguageCertificateStatus.CertifiedGerman]: 'CertifiedGerman',
  [LanguageCertificateStatus.CertifiedEnglish]: 'CertifiedEnglish',
  [LanguageCertificateStatus.CertifiedBoth]: 'CertifiedBoth',
};

const PASSPORT_STATUS_MAP: Record<PassportStatus, ProfileSnapshot['passportStatus'] & string> = {
  [PassportStatus.Yes]: 'Yes',
  [PassportStatus.No]: 'No',
  [PassportStatus.Expired]: 'Expired',
};

const GERMANY_CONNECTION_MAP: Record<
  GermanyConnection,
  NonNullable<ProfileSnapshot['germanyConnection']>[number]
> = {
  [GermanyConnection.None]: 'None',
  [GermanyConnection.VisitedBefore]: 'VisitedBefore',
  [GermanyConnection.LivedStudiedTrainedBefore]: 'LivedStudiedTrainedBefore',
  [GermanyConnection.FamilyInGermany]: 'FamilyInGermany',
  [GermanyConnection.FriendsInGermany]: 'FriendsInGermany',
  [GermanyConnection.AttendedGermanSchoolOrInstitute]: 'AttendedGermanSchoolOrInstitute',
  [GermanyConnection.PriorApplicationOrContact]: 'PriorApplicationOrContact',
  [GermanyConnection.GermanHeritage]: 'GermanHeritage',
};

const FINANCIAL_SITUATION_MAP: Record<
  FinancialSituation,
  ProfileSnapshot['financialSituation'] & string
> = {
  [FinancialSituation.LessThan5000]: 'LessThan5000',
  [FinancialSituation.Between5000And12000]: 'Between5000And12000',
  [FinancialSituation.MoreThan12000]: 'MoreThan12000',
  [FinancialSituation.Unsure]: 'Unsure',
};

const START_TIMELINE_MAP: Record<StartTimeline, ProfileSnapshot['startTimeline'] & string> = {
  [StartTimeline.AsSoonAsPossible]: 'AsSoonAsPossible',
  [StartTimeline.SixToTwelveMonths]: 'SixToTwelveMonths',
  [StartTimeline.MoreThanAYear]: 'MoreThanAYear',
  [StartTimeline.StillExploring]: 'StillExploring',
};

const REGION_FLEXIBILITY_MAP: Record<
  RegionFlexibility,
  ProfileSnapshot['regionFlexibility'] & string
> = {
  [RegionFlexibility.MajorCitiesOnly]: 'MajorCitiesOnly',
  [RegionFlexibility.OpenToAnyRegion]: 'OpenToAnyRegion',
  [RegionFlexibility.NotSureYet]: 'NotSureYet',
};

// Backend string -> frontend enum, the exact inverse of each MAP above —
// built by inverting the same tables rather than hand-typing a second set,
// so the two directions can never drift apart (added 2026-08-30 for
// self-service profile editing: pre-filling the assessment wizard from an
// already-saved account requires going the other way from buildProfileSnapshot).
function invert<TEnum extends string, TBackend extends string>(
  map: Record<TEnum, TBackend>
): Record<TBackend, TEnum> {
  return Object.fromEntries(
    Object.entries(map).map(([enumValue, backendValue]) => [backendValue, enumValue])
  ) as Record<TBackend, TEnum>;
}

const EDUCATION_LEVEL_REVERSE_MAP = invert(EDUCATION_LEVEL_MAP);
const LANGUAGE_LEVEL_REVERSE_MAP = invert(LANGUAGE_LEVEL_MAP);
const WORK_EXPERIENCE_REVERSE_MAP = invert(WORK_EXPERIENCE_MAP);
const DESIRED_PATH_REVERSE_MAP = invert(DESIRED_PATH_MAP);
const LANGUAGE_CERTIFICATE_REVERSE_MAP = invert(LANGUAGE_CERTIFICATE_MAP);
const PASSPORT_STATUS_REVERSE_MAP = invert(PASSPORT_STATUS_MAP);
const GERMANY_CONNECTION_REVERSE_MAP = invert(GERMANY_CONNECTION_MAP);
const FINANCIAL_SITUATION_REVERSE_MAP = invert(FINANCIAL_SITUATION_MAP);
const START_TIMELINE_REVERSE_MAP = invert(START_TIMELINE_MAP);
const REGION_FLEXIBILITY_REVERSE_MAP = invert(REGION_FLEXIBILITY_MAP);

// Only the fields the wizard's questions actually populate — deliberately
// Partial, not a full AssessmentAnswers, since a profile-less account (or
// one only partially captured) may be missing fields; the caller merges
// this over createDefaultAssessmentAnswers() rather than assuming every
// field is present.
export function assessmentAnswersFromProfileSnapshot(
  profile: ProfileSnapshot
): Partial<AssessmentAnswers> {
  return {
    country: profile.country ?? '',
    age: profile.age ?? null,
    highestEducation: profile.highestEducation
      ? EDUCATION_LEVEL_REVERSE_MAP[profile.highestEducation]
      : null,
    // occupationField is stored backend-side as a plain string matching the
    // frontend's own 110-value OccupationField enum keys exactly (see
    // Opportunity.cs's comment on why it's not a duplicated C# enum) — safe
    // to cast straight through, no lookup table needed like the other
    // enum-backed fields above.
    occupationField: (profile.occupationField as AssessmentAnswers['occupationField']) ?? null,
    workExperience: profile.workExperience
      ? WORK_EXPERIENCE_REVERSE_MAP[profile.workExperience]
      : null,
    desiredPath: profile.desiredPath ? DESIRED_PATH_REVERSE_MAP[profile.desiredPath] : null,
    germanLevel: profile.germanLevel ? LANGUAGE_LEVEL_REVERSE_MAP[profile.germanLevel] : null,
    englishLevel: profile.englishLevel ? LANGUAGE_LEVEL_REVERSE_MAP[profile.englishLevel] : null,
    languageCertificate: profile.languageCertificate
      ? LANGUAGE_CERTIFICATE_REVERSE_MAP[profile.languageCertificate]
      : null,
    passportStatus: profile.passportStatus
      ? PASSPORT_STATUS_REVERSE_MAP[profile.passportStatus]
      : null,
    germanyConnection: profile.germanyConnection
      ? profile.germanyConnection.map((connection) => GERMANY_CONNECTION_REVERSE_MAP[connection])
      : [],
    financialSituation: profile.financialSituation
      ? FINANCIAL_SITUATION_REVERSE_MAP[profile.financialSituation]
      : null,
    startTimeline: profile.startTimeline
      ? START_TIMELINE_REVERSE_MAP[profile.startTimeline]
      : null,
    regionFlexibility: profile.regionFlexibility
      ? REGION_FLEXIBILITY_REVERSE_MAP[profile.regionFlexibility]
      : null,
  };
}

export function buildProfileSnapshot(answers: AssessmentAnswers): ProfileSnapshot {
  return {
    country: answers.country || null,
    age: answers.age,
    highestEducation: answers.highestEducation
      ? EDUCATION_LEVEL_MAP[answers.highestEducation]
      : null,
    occupationField: answers.occupationField,
    workExperience: answers.workExperience ? WORK_EXPERIENCE_MAP[answers.workExperience] : null,
    desiredPath: answers.desiredPath ? DESIRED_PATH_MAP[answers.desiredPath] : null,
    germanLevel: answers.germanLevel ? LANGUAGE_LEVEL_MAP[answers.germanLevel] : null,
    englishLevel: answers.englishLevel ? LANGUAGE_LEVEL_MAP[answers.englishLevel] : null,
    languageCertificate: answers.languageCertificate
      ? LANGUAGE_CERTIFICATE_MAP[answers.languageCertificate]
      : null,
    passportStatus: answers.passportStatus ? PASSPORT_STATUS_MAP[answers.passportStatus] : null,
    germanyConnection:
      answers.germanyConnection.length > 0
        ? answers.germanyConnection.map((connection) => GERMANY_CONNECTION_MAP[connection])
        : null,
    financialSituation: answers.financialSituation
      ? FINANCIAL_SITUATION_MAP[answers.financialSituation]
      : null,
    startTimeline: answers.startTimeline ? START_TIMELINE_MAP[answers.startTimeline] : null,
    regionFlexibility: answers.regionFlexibility
      ? REGION_FLEXIBILITY_MAP[answers.regionFlexibility]
      : null,
  };
}
