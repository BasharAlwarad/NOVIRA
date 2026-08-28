// Mirrors backend/Models/UserDocument.cs's enums exactly.
export type DocumentType = 'Passport' | 'EducationCertificate' | 'LanguageCertificate' | 'Other';
export type AiVerificationStatus = 'Pending' | 'Completed' | 'Failed';
export type DocumentReviewStatus = 'PendingReview' | 'Approved' | 'Denied' | 'FlaggedRed';

// User-facing — mirrors backend/Endpoints/DocumentsEndpoints.cs's UserDocumentResponse.
// documentType is null until the AI determines it (or if AI verification
// failed) — it's never user-selected, see the comment on the backend model.
export interface UserDocumentSummary {
  id: string;
  name: string;
  documentType: DocumentType | null;
  originalFileName: string;
  uploadedAt: string;
  aiVerificationStatus: AiVerificationStatus;
  reviewStatus: DocumentReviewStatus;
  reviewedAt: string | null;
  reviewNote: string | null;
}
