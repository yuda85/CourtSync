import { Timestamp } from '@angular/fire/firestore';

/**
 * Status of an admin invite
 */
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

/**
 * Admin invite stored in /invites/{inviteId}
 * Used to invite new admins to the platform
 */
export interface AdminInvite {
  id: string;
  /** Email of invitee (normalized to lowercase) */
  email: string;
  /** Role to assign when invite is accepted */
  role: 'admin';
  /** Current status of the invite */
  status: InviteStatus;
  /** When the invite was created */
  createdAt: Timestamp;
  /** UID of superadmin who created the invite */
  createdBy: string;
  /** Display name of creator for audit purposes */
  createdByName: string;
  /** When the invite expires (default: 7 days from creation) */
  expiresAt: Timestamp;
  /** When the invite was accepted */
  acceptedAt?: Timestamp;
  /** UID of user who accepted the invite */
  acceptedBy?: string;
  /** When the invite was revoked */
  revokedAt?: Timestamp;
  /** UID of superadmin who revoked the invite */
  revokedBy?: string;
}

/**
 * Data required to create a new invite
 */
export interface CreateInviteData {
  email: string;
  role: 'admin';
}
