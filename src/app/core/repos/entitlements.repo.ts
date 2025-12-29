import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, of, from } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  collectionData,
  Timestamp
} from '@angular/fire/firestore';
import { Entitlement, CreateEntitlementData } from '@core/models/entitlement.interface';

/**
 * Entitlements Repository
 * Manages user course entitlements in Firestore
 * Path: /users/{uid}/entitlements/{entId}
 */
@Injectable({
  providedIn: 'root'
})
export class EntitlementsRepo {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  /** Local cache of entitlements for quick access */
  private readonly entitlementsCache = signal<Entitlement[]>([]);

  /** Loading state */
  readonly isLoading = signal(false);

  /**
   * Get current user's entitlements
   * Returns Observable that updates in real-time
   */
  myEntitlements$(): Observable<Entitlement[]> {
    return authState(this.auth).pipe(
      switchMap(user => {
        if (!user) {
          return of([]);
        }

        const entitlementsRef = collection(
          this.firestore,
          `users/${user.uid}/entitlements`
        );

        return collectionData(entitlementsRef, { idField: 'id' }).pipe(
          map(docs => docs as Entitlement[]),
          catchError(err => {
            console.error('Error fetching entitlements:', err);
            return of([]);
          })
        );
      })
    );
  }

  /**
   * Check if user has entitlement for a specific course
   */
  hasCourseEntitlement$(courseId: string): Observable<boolean> {
    return this.myEntitlements$().pipe(
      map(entitlements =>
        entitlements.some(e => e.type === 'course' && e.refId === courseId)
      )
    );
  }

  /**
   * Check if user has entitlement (sync version using cache)
   */
  hasCourseEntitlementSync(courseId: string): boolean {
    return this.entitlementsCache().some(
      e => e.type === 'course' && e.refId === courseId
    );
  }

  /**
   * Purchase a course (demo mode - creates entitlement directly)
   * In production, this would call a Cloud Function for payment processing
   */
  async purchaseDemoCourse(courseId: string, priceIls: number): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to purchase');
    }

    this.isLoading.set(true);

    try {
      const entitlementId = `course_${courseId}_${Date.now()}`;
      const entitlementRef = doc(
        this.firestore,
        `users/${user.uid}/entitlements/${entitlementId}`
      );

      const entitlementData: Omit<Entitlement, 'id'> = {
        type: 'course',
        refId: courseId,
        purchasedAt: Timestamp.now(),
        source: 'demo',
        pricePaidIls: priceIls
      };

      await setDoc(entitlementRef, entitlementData);

      console.log('Demo purchase successful:', courseId);
    } catch (err) {
      console.error('Purchase error:', err);
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Update local cache (call from components that subscribe)
   */
  updateCache(entitlements: Entitlement[]): void {
    this.entitlementsCache.set(entitlements);
  }

  /**
   * Get cached entitlements
   */
  getCached(): Entitlement[] {
    return this.entitlementsCache();
  }
}
