import { Injectable, inject } from '@angular/core';
import { Observable, of, combineLatest } from 'rxjs';
import { map, switchMap, catchError, take } from 'rxjs/operators';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
  DocumentSnapshot,
  getDoc,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { UserProfile, UserRole } from '@core/models/user-profile.interface';
import { RoleService } from '@core/services/role.service';

/**
 * User with entitlements count for admin view
 */
export interface AdminUser extends UserProfile {
  entitlementsCount?: number;
  coursesCreatedCount?: number;
}

/**
 * User list options for pagination and filtering
 */
export interface UserListOptions {
  pageSize?: number;
  startAfterDoc?: DocumentSnapshot;
  role?: UserRole;
  searchTerm?: string;
}

/**
 * Users Repository
 * Provides user management operations for superadmins
 */
@Injectable({
  providedIn: 'root',
})
export class UsersRepo {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly roleService = inject(RoleService);

  private readonly usersCollection = collection(this.firestore, 'users');

  /**
   * Get all users (superadmin only)
   */
  getAllUsers$(): Observable<AdminUser[]> {
    if (!this.roleService.isSuperAdmin()) {
      console.warn('getAllUsers$ called by non-superadmin');
      return of([]);
    }

    const q = query(this.usersCollection, orderBy('lastLoginAt', 'desc'));

    return collectionData(q, { idField: 'uid' }).pipe(
      map((users) => users as AdminUser[]),
      catchError((err) => {
        console.error('Error fetching users:', err);
        return of([]);
      })
    );
  }

  /**
   * Get users by role
   */
  getUsersByRole$(role: UserRole): Observable<AdminUser[]> {
    if (!this.roleService.isSuperAdmin()) {
      return of([]);
    }

    const q = query(
      this.usersCollection,
      where('roles', 'array-contains', role),
      orderBy('lastLoginAt', 'desc')
    );

    return collectionData(q, { idField: 'uid' }).pipe(
      map((users) => users as AdminUser[]),
      catchError((err) => {
        console.error('Error fetching users by role:', err);
        return of([]);
      })
    );
  }

  /**
   * Get admins only
   */
  getAdmins$(): Observable<AdminUser[]> {
    return this.getUsersByRole$('admin');
  }

  /**
   * Get superadmins only
   */
  getSuperadmins$(): Observable<AdminUser[]> {
    return this.getUsersByRole$('superadmin');
  }

  /**
   * Get students only
   */
  getStudents$(): Observable<AdminUser[]> {
    if (!this.roleService.isSuperAdmin()) {
      return of([]);
    }

    // Get users who are students but not admins or superadmins
    return this.getAllUsers$().pipe(
      map((users) =>
        users.filter(
          (user) =>
            user.roles?.includes('student') &&
            !user.roles?.includes('admin') &&
            !user.roles?.includes('superadmin')
        )
      )
    );
  }

  /**
   * Get a single user by UID
   */
  getUserById$(uid: string): Observable<AdminUser | null> {
    if (!this.roleService.isSuperAdmin()) {
      return of(null);
    }

    const userRef = doc(this.firestore, 'users', uid);

    return docData(userRef, { idField: 'uid' }).pipe(
      map((user) => (user as AdminUser) || null),
      catchError((err) => {
        console.error('Error fetching user:', err);
        return of(null);
      })
    );
  }

  /**
   * Search users by email or display name
   */
  searchUsers$(searchTerm: string): Observable<AdminUser[]> {
    if (!this.roleService.isSuperAdmin()) {
      return of([]);
    }

    // Firestore doesn't support native text search
    // We'll filter client-side for small to medium datasets
    const normalizedTerm = searchTerm.toLowerCase().trim();

    return this.getAllUsers$().pipe(
      map((users) =>
        users.filter(
          (user) =>
            user.email?.toLowerCase().includes(normalizedTerm) ||
            user.displayName?.toLowerCase().includes(normalizedTerm)
        )
      )
    );
  }

  /**
   * Update user roles (superadmin only)
   */
  async updateUserRoles(uid: string, roles: UserRole[]): Promise<void> {
    if (!this.roleService.isSuperAdmin()) {
      throw new Error('Only superadmins can update user roles');
    }

    const currentUserUid = this.roleService.getCurrentUid();

    // Prevent superadmin from removing their own superadmin role
    if (uid === currentUserUid && !roles.includes('superadmin')) {
      throw new Error('לא ניתן להסיר את תפקיד המנהל הראשי מעצמך');
    }

    // Ensure student role is always included
    if (!roles.includes('student')) {
      roles = ['student', ...roles];
    }

    const userRef = doc(this.firestore, 'users', uid);
    await updateDoc(userRef, {
      roles,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Promote user to admin
   */
  async promoteToAdmin(uid: string): Promise<void> {
    const user = await new Promise<AdminUser | null>((resolve) => {
      this.getUserById$(uid).subscribe((u) => resolve(u));
    });

    if (!user) {
      throw new Error('User not found');
    }

    const newRoles: UserRole[] = [...(user.roles || ['student']), 'admin'];
    await this.updateUserRoles(uid, [...new Set(newRoles)]);
  }

  /**
   * Demote user from admin
   */
  async demoteFromAdmin(uid: string): Promise<void> {
    const user = await new Promise<AdminUser | null>((resolve) => {
      this.getUserById$(uid).subscribe((u) => resolve(u));
    });

    if (!user) {
      throw new Error('User not found');
    }

    const newRoles = (user.roles || ['student']).filter(
      (r) => r !== 'admin' && r !== 'superadmin'
    );
    await this.updateUserRoles(uid, newRoles.length > 0 ? newRoles : ['student']);
  }

  /**
   * Get user purchases/entitlements
   */
  getUserEntitlements$(uid: string): Observable<any[]> {
    if (!this.roleService.isSuperAdmin()) {
      return of([]);
    }

    const entitlementsCollection = collection(
      this.firestore,
      'users',
      uid,
      'entitlements'
    );

    return collectionData(entitlementsCollection, { idField: 'id' }).pipe(
      catchError((err) => {
        console.error('Error fetching user entitlements:', err);
        return of([]);
      })
    );
  }

  /**
   * Get user course progress
   */
  getUserProgress$(uid: string): Observable<any[]> {
    if (!this.roleService.isSuperAdmin()) {
      return of([]);
    }

    const progressCollection = collection(
      this.firestore,
      'users',
      uid,
      'progress'
    );

    return collectionData(progressCollection, { idField: 'id' }).pipe(
      catchError((err) => {
        console.error('Error fetching user progress:', err);
        return of([]);
      })
    );
  }

  /**
   * Get user statistics
   */
  getUserStats$(): Observable<{
    total: number;
    admins: number;
    superadmins: number;
    students: number;
    recentSignups: number;
  }> {
    if (!this.roleService.isSuperAdmin()) {
      return of({
        total: 0,
        admins: 0,
        superadmins: 0,
        students: 0,
        recentSignups: 0,
      });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.getAllUsers$().pipe(
      map((users) => {
        return {
          total: users.length,
          admins: users.filter(
            (u) => u.roles?.includes('admin') && !u.roles?.includes('superadmin')
          ).length,
          superadmins: users.filter((u) => u.roles?.includes('superadmin')).length,
          students: users.filter(
            (u) =>
              !u.roles?.includes('admin') && !u.roles?.includes('superadmin')
          ).length,
          recentSignups: users.filter(
            (u) => u.createdAt && u.createdAt.toMillis() > thirtyDaysAgo.getTime()
          ).length,
        };
      })
    );
  }

  /**
   * Get recently active users
   */
  getRecentlyActiveUsers$(days: number = 7, maxCount: number = 10): Observable<AdminUser[]> {
    if (!this.roleService.isSuperAdmin()) {
      return of([]);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const q = query(
      this.usersCollection,
      where('lastLoginAt', '>=', Timestamp.fromDate(cutoffDate)),
      orderBy('lastLoginAt', 'desc'),
      limit(maxCount)
    );

    return collectionData(q, { idField: 'uid' }).pipe(
      map((users) => users as AdminUser[]),
      catchError((err) => {
        console.error('Error fetching recent users:', err);
        return of([]);
      })
    );
  }

  /**
   * Get new signups in the last N days
   */
  getNewSignups$(days: number = 30): Observable<AdminUser[]> {
    if (!this.roleService.isSuperAdmin()) {
      return of([]);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const q = query(
      this.usersCollection,
      where('createdAt', '>=', Timestamp.fromDate(cutoffDate)),
      orderBy('createdAt', 'desc')
    );

    return collectionData(q, { idField: 'uid' }).pipe(
      map((users) => users as AdminUser[]),
      catchError((err) => {
        console.error('Error fetching new signups:', err);
        return of([]);
      })
    );
  }

  /**
   * Get users who have made purchases
   */
  getUsersWithPurchases$(): Observable<AdminUser[]> {
    if (!this.roleService.isSuperAdmin()) {
      return of([]);
    }

    return this.getAllUsers$().pipe(
      map((users) => users.filter((u) => u.lastPurchaseAt))
    );
  }

  /**
   * Export users data (for CSV export)
   */
  exportUsers$(): Observable<
    {
      email: string;
      displayName: string;
      roles: string;
      createdAt: string;
      lastLoginAt: string;
    }[]
  > {
    if (!this.roleService.isSuperAdmin()) {
      return of([]);
    }

    return this.getAllUsers$().pipe(
      map((users) =>
        users.map((user) => ({
          email: user.email || '',
          displayName: user.displayName || '',
          roles: (user.roles || []).join(', '),
          createdAt: user.createdAt?.toDate?.()?.toISOString() || '',
          lastLoginAt: user.lastLoginAt?.toDate?.()?.toISOString() || '',
        }))
      )
    );
  }
}
