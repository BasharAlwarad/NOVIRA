export type OpportunityPath = 'University' | 'Ausbildung';
export type OpportunityStatus = 'Pending' | 'Approved' | 'Denied';
export type OpportunitySource = 'Manual' | 'Bundesagentur';

// Mirrors backend/Models/Opportunity.cs's LanguageLevel — CEFR order, with
// "Beginner" ranked near the bottom (see the backend enum's comment for why
// this differs from the frontend's own assessment LanguageLevel declaration order).
export type OpportunityLanguageLevel =
  | 'None'
  | 'Beginner'
  | 'A1'
  | 'A2'
  | 'B1'
  | 'B2'
  | 'C1'
  | 'C1Plus';

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
