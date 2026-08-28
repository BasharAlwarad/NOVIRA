import type { OpportunityEducationLevel, OpportunityLanguageLevel } from '@/lib/contracts/opportunities';

export interface PathFitEntry {
  pathLabel: string;
  fitLabel: string;
  barPercent: number;
  highlighted: boolean;
}

export type EligibilityCheckStatus = 'Met' | 'Addressable' | 'Fixed';

export interface EligibilityCheckEntry {
  label: string;
  status: EligibilityCheckStatus;
  explanation: string;
}

export type ProfileWorkExperience =
  | 'None'
  | 'LessThanTwoYears'
  | 'TwoToFiveYears'
  | 'MoreThanFiveYears';

export type ProfileDesiredPath = 'University' | 'Ausbildung' | 'Employment' | 'Unsure';

export type ProfileLanguageCertificateStatus =
  | 'None'
  | 'CertifiedGerman'
  | 'CertifiedEnglish'
  | 'CertifiedBoth';

export type ProfilePassportStatus = 'Yes' | 'No' | 'Expired';

export type ProfileGermanyConnection =
  | 'None'
  | 'VisitedBefore'
  | 'LivedStudiedTrainedBefore'
  | 'FamilyInGermany'
  | 'FriendsInGermany'
  | 'AttendedGermanSchoolOrInstitute'
  | 'PriorApplicationOrContact'
  | 'GermanHeritage';

export type ProfileFinancialSituation =
  | 'LessThan5000'
  | 'Between5000And12000'
  | 'MoreThan12000'
  | 'Unsure';

export type ProfileStartTimeline =
  | 'AsSoonAsPossible'
  | 'SixToTwelveMonths'
  | 'MoreThanAYear'
  | 'StillExploring';

export type ProfileRegionFlexibility = 'MajorCitiesOnly' | 'OpenToAnyRegion' | 'NotSureYet';

// Tier 1 profile snapshot — self-reported, no verification (see the comment
// on backend/Models/User.cs for the planned verification levels this
// deliberately doesn't attempt yet). All optional/nullable.
export interface ProfileSnapshot {
  country: string | null;
  age: string | null;
  highestEducation: OpportunityEducationLevel | null;
  occupationField: string | null;
  workExperience: ProfileWorkExperience | null;
  desiredPath: ProfileDesiredPath | null;
  germanLevel: OpportunityLanguageLevel | null;
  englishLevel: OpportunityLanguageLevel | null;
  languageCertificate: ProfileLanguageCertificateStatus | null;
  passportStatus: ProfilePassportStatus | null;
  germanyConnection: ProfileGermanyConnection[] | null;
  financialSituation: ProfileFinancialSituation | null;
  startTimeline: ProfileStartTimeline | null;
  regionFlexibility: ProfileRegionFlexibility | null;
}

// Level 3 of the four-level user-data model — populated only once an admin
// approves a document that contained this data (see backend/Endpoints/
// DocumentsAdminEndpoints.cs's ApplyVerifiedDataFromDocument). Shared by
// Account and AdminUserDetail, both of which mirror backend/Models/User.cs's
// Verified* fields exactly.
export interface VerifiedProfile {
  verifiedFullName: string | null;
  verifiedDateOfBirth: string | null;
  verifiedNationality: string | null;
  verifiedPassportNumber: string | null;
  verifiedPassportExpiryDate: string | null;
  verifiedPassportStatus: ProfilePassportStatus | null;
  verifiedHighestEducation: OpportunityEducationLevel | null;
  verifiedFieldOfStudy: string | null;
  verifiedGermanLevel: OpportunityLanguageLevel | null;
  verifiedEnglishLevel: OpportunityLanguageLevel | null;
  verifiedDataUpdatedAt: string | null;
}

export interface SaveResultRequest {
  email: string;
  verdictHeading: string;
  verdictBody: string;
  adviceFactorLabel: string | null;
  adviceText: string | null;
  pathFit: PathFitEntry[];
  documentChecklist: string[];
  continueUrl: string;
  profile: ProfileSnapshot;
  eligibilityChecks: EligibilityCheckEntry[];
}

export interface SaveResultResponse {
  saved: boolean;
  emailSent: boolean;
}
