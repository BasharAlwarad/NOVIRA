// EducationLevel/LanguageLevel here come straight off the backend's C#
// enums (JsonStringEnumConverter, PascalCase member names — "HighSchool",
// "Bachelors") — NOT frontend/src/types/assessment.ts's own kebab-case enum
// values ('high-school'). Reuses the same string-literal types
// contracts/leads.ts already built for this exact mismatch
// (OpportunityEducationLevel/OpportunityLanguageLevel) rather than adding a
// third copy.
import type { OpportunityEducationLevel, OpportunityLanguageLevel } from '@/lib/contracts/opportunities';

// Mirrors backend/Models/IntakeProfile.cs exactly.
export type IntakeStatus = 'NotStarted' | 'InProgress' | 'Submitted';

export interface IntakeExperienceEntry {
  title: string;
  employer: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null; // empty/null = "present"
  bullets: string[];
}

export interface IntakeEducationEntry {
  institution: string;
  qualification: string;
  fieldOfStudy: string | null;
  city: string | null;
  startDate: string | null;
  endDate: string | null;
  grade: string | null;
}

// Mirrors backend/Endpoints/IntakeEndpoints.cs's IntakeProfileResponse.
export interface IntakeProfile {
  id: string;
  phoneNumber: string | null;
  address: string | null;
  hasPhoto: boolean;
  dateOfBirth: string | null;
  summary: string | null;
  experience: IntakeExperienceEntry[];
  education: IntakeEducationEntry[];
  technicalSkills: string | null;
  drivingLicence: boolean;
  certifications: string | null;
  hobbies: string | null;
  status: IntakeStatus;
  updatedAt: string | null;
}

// A one-time starter suggestion for a blank form — see the backend record's
// own comment for why this is only ever returned once, never recomputed
// over top of saved edits.
export interface IntakePrefill {
  fullName: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  highestEducation: OpportunityEducationLevel | null;
  fieldOfStudy: string | null;
  institutionName: string | null;
  germanLevel: OpportunityLanguageLevel | null;
  englishLevel: OpportunityLanguageLevel | null;
  hasCertifiedLanguageProof: boolean;
}

export interface IntakeGetResponse {
  profile: IntakeProfile | null;
  prefill: IntakePrefill | null;
}

// Mirrors backend/Endpoints/IntakeEndpoints.cs's SaveIntakeRequest.
export interface SaveIntakeRequest {
  phoneNumber: string | null;
  address: string | null;
  dateOfBirth: string | null;
  summary: string | null;
  experience: IntakeExperienceEntry[];
  education: IntakeEducationEntry[];
  technicalSkills: string | null;
  drivingLicence: boolean;
  certifications: string | null;
  hobbies: string | null;
}
