import type { ProfileSnapshot, VerifiedProfile } from '@/lib/contracts/leads';
import type { DocumentType, AiVerificationStatus, DocumentReviewStatus } from '@/lib/contracts/documents';
import type { Message } from '@/lib/contracts/messages';
import type { EffectiveTier } from '@/lib/contracts/account';
import type { IntakeProfile } from '@/lib/contracts/intake';

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
  effectiveTier: EffectiveTier;
}

// Mirrors backend/Endpoints/DocumentsAdminEndpoints.cs's AdminPurchaseResponse —
// the real payment ledger for one user, admin-visible.
export interface AdminPurchase {
  id: string;
  tier: string;
  amountEur: number;
  status: 'Paid' | 'Refunded';
  createdAt: string;
  refundedAt: string | null;
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
  aiOccupationField: string | null;
  aiCertifiedLanguage: string | null;
  aiCertifiedLevel: string | null;
  aiFlags: string[];
  aiSummary: string | null;
  aiVerifiedAt: string | null;
  reviewStatus: DocumentReviewStatus;
  reviewedAt: string | null;
  reviewNote: string | null;
  rejectionMessageSent: boolean;
  // Set only when the user explicitly re-uploaded this as a correction to
  // a specific Denied document (self-service document correction, built
  // 2026-08-30). supersedesDocumentName is resolved server-side where
  // possible (list/detail views) — null right after a single-document
  // review action, where the frontend's full-refetch-after-review pattern
  // picks it up moments later regardless.
  supersedesDocumentId: string | null;
  supersedesDocumentName: string | null;
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
  effectiveTier: EffectiveTier;
  purchases: AdminPurchase[];
  documents: AdminDocument[];
  // Every message ever sent to this user, newest first — free-text sends
  // and the automatic Deny/FlagRed notices both land here (see the backend
  // comment on AdminUserDetailResponse), so this is a full audit trail.
  messages: Message[];
  // The Tier 2 CV-intake profile (work history, education, skills), null if
  // the user hasn't started one — added 2026-10-01 to close a real gap: a
  // CV request had no way to show the actual intake content it's meant to
  // be built from, anywhere in the admin UI.
  intake: IntakeProfile | null;
}

export interface ReviewDocumentRequest {
  status: Extract<DocumentReviewStatus, 'Approved' | 'Denied' | 'FlaggedRed'>;
  note: string | null;
}

export interface SendMessageRequest {
  body: string;
}
