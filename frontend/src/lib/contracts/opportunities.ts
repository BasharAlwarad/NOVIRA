export type OpportunityPath = 'University' | 'Ausbildung';
export type OpportunityStatus = 'Pending' | 'Approved' | 'Denied';
export type OpportunitySource = 'Manual' | 'Bundesagentur';

// Mirrors backend/Models/Opportunity.cs's LanguageLevel — CEFR values plus
// the frontend's casual englishLevel scale (Beginner/Intermediate/Advanced/
// Fluent) interleaved near their approximate CEFR equivalent, in corrected
// ordinal order (see the backend enum's comment for the full reasoning —
// the frontend's own assessment LanguageLevel declares these in a different,
// non-ordinal order across two disjoint question option sets).
export type OpportunityLanguageLevel =
  | 'None'
  | 'A1'
  | 'Beginner'
  | 'A2'
  | 'B1'
  | 'Intermediate'
  | 'B2'
  | 'C1'
  | 'Advanced'
  | 'C1Plus'
  | 'Fluent';

export type OpportunityEducationLevel =
  | 'HighSchool'
  | 'TechnicalDiploma'
  | 'Bachelors'
  | 'Masters'
  | 'Doctorate';

export interface Opportunity {
  id: string;
  title: string;
  provider: string;
  path: OpportunityPath;
  location: string | null;
  description: string | null;
  sourceUrl: string | null;
  source: OpportunitySource;
  sourceRef: string | null;
  occupationField: string | null;
  requiredGermanLevel: OpportunityLanguageLevel | null;
  requiredEnglishLevel: OpportunityLanguageLevel | null;
  requiresCertifiedLanguageProof: boolean;
  minEducationLevel: OpportunityEducationLevel | null;
  monthlyCompensationEur: number | null;
  tuitionFeeEur: number | null;
  startDate: string | null;
  applicationDeadline: string | null;
  status: OpportunityStatus;
  createdAt: string;
  reviewedAt: string | null;
}
