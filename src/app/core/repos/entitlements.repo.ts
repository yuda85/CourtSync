import { Injectable, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, switchMap, catchError, shareReplay } from 'rxjs/operators';
import { Auth, authState, User } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  collectionData,
  query,
  where,
  getDocs,
  Timestamp
} from '@angular/fire/firestore';
import { Entitlement } from '@core/models/entitlement.interface';

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

  /** Cached auth state observable to avoid injection context issues */
  private readonly authState$: Observable<User | null>;

  /** Local cache of entitlements for quick access */
  private readonly entitlementsCache = signal<Entitlement[]>([]);

  /** Loading state */
  readonly isLoading = signal(false);

  constructor() {
    // Cache the auth state observable in the constructor (within injection context)
    this.authState$ = authState(this.auth).pipe(
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  /**
   * Get current user's entitlements
   * Returns Observable that updates in real-time
   */
  myEntitlements$(): Observable<Entitlement[]> {
    return this.authState$.pipe(
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
   *
   * Implementation:
   * 1. Check if entitlement already exists (idempotent)
   * 2. If not, create new entitlement document
   * 3. Invalidate cache to refresh UI immediately
   */
  async purchaseDemoCourse(courseId: string, priceIls: number): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to purchase');
    }

    this.isLoading.set(true);

    try {
      // Step 1: Check if entitlement already exists (idempotent check)
      const entitlementsRef = collection(
        this.firestore,
        `users/${user.uid}/entitlements`
      );

      const q = query(
        entitlementsRef,
        where('type', '==', 'course'),
        where('refId', '==', courseId)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // Entitlement already exists - skip creation
        console.log('Entitlement already exists for course:', courseId);
        return;
      }

      // Step 2: Create new entitlement document
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

      console.log('Demo entitlement created:', entitlementId);

      // Step 3: Update user profile with lastPurchaseAt
      const userRef = doc(this.firestore, 'users', user.uid);
      await setDoc(userRef, {
        lastPurchaseAt: Timestamp.now()
      }, { merge: true });

      // Step 4: Invalidate cache to force refresh
      this.invalidateCache();

    } catch (err) {
      console.error('Purchase error:', err);
      throw new Error('שגיאה ברכישת הקורס');
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

  /**
   * Invalidate cache to force refresh of entitlements
   * Call this after purchase to ensure UI updates immediately
   */
  invalidateCache(): void {
    this.entitlementsCache.set([]);
  }

  /**
   * Get list of purchased course IDs
   */
  getMyCourseIds$(): Observable<string[]> {
    return this.myEntitlements$().pipe(
      map(entitlements =>
        entitlements
          .filter(e => e.type === 'course')
          .map(e => e.refId)
      )
    );
  }
}
