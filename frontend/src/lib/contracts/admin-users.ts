import type { ProfileSnapshot, VerifiedProfile } from '@/lib/contracts/leads';
import type { DocumentType, AiVerificationStatus, DocumentReviewStatus } from '@/lib/contracts/documents';
import type { Message } from '@/lib/contracts/messages';

// Mirrors backend/Endpoints/DocumentsAdminEndpoints.cs's response records.

export interface AdminUserListItem {
  id: string;
  email: string;
  fullName: string | null;
  // Level 3 — set once an admin approves a document containing a name.
  // fullName is realistically always null (nothing collects it yet), so
  // the UI prefers this field when displaying a name.
  verifiedFullName: string | null;
  fraudFlagged: boolean;
  pendingDocumentCount: number;
  createdAt: string;
}

export interface AdminDocument {
  id: string;
  name: string;
  documentType: DocumentType | null;
  originalFileName: string;
  contentType: string;
  uploadedAt: string;
  previewUrl: string | null; // short-lived SAS URL, regenerated per fetch
  aiVerificationStatus: AiVerificationStatus;
  aiExtractedName: string | null;
  aiNameMatchesProfile: boolean | null;
  aiDocumentTypeDetected: string | null;
  aiIssuerOrInstitution: string | null;
  aiExpiryDate: string | null;
  aiLegible: boolean | null;
  aiDateOfBirth: string | null;
  aiNationality: string | null;
  aiDocumentNumber: string | null;
  aiHighestEducationLevel: string | null;
  aiFieldOfStudy: string | null;
  aiCertifiedLanguage: string | null;
  aiCertifiedLevel: string | null;
  aiFlags: string[];
  aiSummary: string | null;
  aiVerifiedAt: string | null;
  reviewStatus: DocumentReviewStatus;
  reviewedAt: string | null;
  reviewNote: string | null;
  rejectionMessageSent: boolean;
}

// ProfileSnapshot's fields are spread in directly (fullName/createdAt/fraud
// fields sit alongside them, same as backend/Models/User.cs) — no separate
// "profile" sub-object, matching how AdminUserDetailResponse is shaped.
export interface AdminUserDetail extends ProfileSnapshot, VerifiedProfile {
  id: string;
  email: string;
  fullName: string | null;
  createdAt: string;
  fraudFlagged: boolean;
  fraudFlaggedAt: string | null;
  fraudFlagNote: string | null;
  profileUpdatedAt: string | null;
  documents: AdminDocument[];
  // Every message ever sent to this user, newest first — free-text sends
  // and the automatic Deny/FlagRed notices both land here (see the backend
  // comment on AdminUserDetailResponse), so this is a full audit trail.
  messages: Message[];
}

export interface ReviewDocumentRequest {
  status: Extract<DocumentReviewStatus, 'Approved' | 'Denied' | 'FlaggedRed'>;
  note: string | null;
}

export interface SendMessageRequest {
  subject: string;
  body: string;
}
