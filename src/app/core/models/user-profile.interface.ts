import { Timestamp } from '@angular/fire/firestore';

/**
 * User roles in the system
 * - student: Default role, can purchase and access courses
 * - admin: Can create and manage their own courses
 * - superadmin: Full access, can manage all users and courses
 */
export type UserRole = 'student' | 'admin' | 'superadmin';

/**
 * Role hierarchy for permission checks
 * Higher number = more permissions
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  student: 1,
  admin: 2,
  superadmin: 3,
};

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  roles: UserRole[];
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  lastPurchaseAt?: Timestamp;
  /** UID of superadmin who invited this admin (for admin users) */
  createdBy?: string;
  /** When the admin invite was accepted */
  invitedAt?: Timestamp;
}
