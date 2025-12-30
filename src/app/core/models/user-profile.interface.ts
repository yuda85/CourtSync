import { Timestamp } from '@angular/fire/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  roles: string[];
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  lastPurchaseAt?: Timestamp;
}

export type UserRole = 'student' | 'instructor' | 'admin';
