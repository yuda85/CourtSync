import { Timestamp } from '@angular/fire/firestore';
import { UserRole } from './user-profile.interface';

/**
 * Status of an admin invite
 */
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

/**
 * Invite role - can be admin or superadmin
 */
export type InviteRole = 'admin' | 'superadmin';

/**
 * Admin invite stored in /invites/{inviteId}
 * Uses shareable links instead of email-based invites.
 * The invite ID serves as the unique token for the link.
 */
export interface AdminInvite {
  id: string;
  /** Role to assign when invite is accepted */
  role: InviteRole;
  /** Current status of the invite */
  status: InviteStatus;
  /** When the invite was created */
  createdAt: Timestamp;
  /** UID of superadmin who created the invite */
  createdBy: string;
  /** Display name of creator for audit purposes */
  createdByName: string;
  /** When the invite expires */
  expiresAt: Timestamp;
  /** When the invite was accepted */
  acceptedAt?: Timestamp;
  /** UID of user who accepted the invite */
  acceptedBy?: string;
  /** Email of user who accepted (for audit) */
  acceptedByEmail?: string;
  /** When the invite was revoked */
  revokedAt?: Timestamp;
  /** UID of superadmin who revoked the invite */
  revokedBy?: string;
}

/**
 * Data required to create a new invite
 */
export interface CreateInviteData {
  role: InviteRole;
  /** Expiration in days (default: 7) */
  expirationDays?: number;
}
