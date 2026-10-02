// Mirrors backend/Models/CvRequest.cs exactly.
export type CvRequestStatus = 'Requested' | 'InReview' | 'Delivered';

// Mirrors backend/Endpoints/CvRequestsEndpoints.cs's CvRequestResponse —
// the signed-in user's own view of a request they made.
export interface CvRequest {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  opportunityProvider: string;
  status: CvRequestStatus;
  createdAt: string;
  updatedAt: string | null;
}

// Mirrors backend/Endpoints/CvRequestsAdminEndpoints.cs's AdminCvRequestResponse.
export interface AdminCvRequest extends CvRequest {
  userId: string;
  userEmail: string;
  hasDraft: boolean;
  revisionCount: number;
  isReferenceExample: boolean;
}

// Mirrors backend/Models/CvDraftContent.cs — the AI-generated structured
// content a deterministic template will later render into an actual PDF
// (not built yet). Shown as readable text for now in the admin review UI.
export interface CvDraftExperienceEntry {
  title: string;
  employer: string;
  dateRange: string | null;
  bullets: string[];
}

export interface CvDraftEducationEntry {
  qualification: string;
  institution: string;
  dateRange: string | null;
}

export interface CvDraftContent {
  fullName: string;
  phone: string | null;
  address: string | null;
  dateOfBirth: string | null;
  summary: string | null;
  experience: CvDraftExperienceEntry[];
  education: CvDraftEducationEntry[];
  skills: string | null;
  languages: string | null;
  certifications: string | null;
}

export interface CoverLetterDraftContent {
  recipientLine: string;
  paragraphs: string[];
  closingLine: string;
}

// Mirrors backend/Endpoints/CvRequestsAdminEndpoints.cs's CvDraftResponse —
// returned by generate/revise/draft.
export interface CvDraftResult {
  cv: CvDraftContent | null;
  coverLetter: CoverLetterDraftContent | null;
  revisionCount: number;
  lastGeneratedAt: string | null;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  error: string | null;
}
