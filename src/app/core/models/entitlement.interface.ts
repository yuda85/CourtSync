import { Timestamp } from '@angular/fire/firestore';

/**
 * Entitlement - User's access to courses/paths/bundles
 * Stored in /users/{uid}/entitlements/{entId}
 */
export interface Entitlement {
  id: string;
  type: 'course' | 'path' | 'bundle';
  refId: string;                 // courseId, pathId, or bundleId
  purchasedAt: Timestamp;
  source: 'demo' | 'payment';
  pricePaidIls?: number;
}

/**
 * Entitlement creation data (without id and timestamps)
 */
export interface CreateEntitlementData {
  type: 'course' | 'path' | 'bundle';
  refId: string;
  source: 'demo' | 'payment';
  pricePaidIls?: number;
}
