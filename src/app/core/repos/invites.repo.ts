import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { AdminInvite, InviteStatus, CreateInviteData, InviteRole } from '@core/models/invite.interface';
import { RoleService } from '@core/services/role.service';

/**
 * Invites Repository
 * Manages shareable invite links - superadmin only
 * Invites are one-time use and have expiration dates
 */
@Injectable({
  providedIn: 'root',
})
export class InvitesRepo {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly roleService = inject(RoleService);

  private readonly invitesCollection = collection(this.firestore, 'invites');

  /**
   * Default invite expiration time (7 days)
   */
  private readonly DEFAULT_EXPIRY_DAYS = 7;

  /**
   * Get all invites (superadmin only)
   */
  getAllInvites$(): Observable<AdminInvite[]> {
    if (!this.roleService.isSuperAdmin()) {
      console.warn('getAllInvites$ called by non-superadmin');
      return of([]);
    }

    const q = query(this.invitesCollection, orderBy('createdAt', 'desc'));

    return collectionData(q, { idField: 'id' }).pipe(
      map((invites) => invites as AdminInvite[]),
      catchError((err) => {
        console.error('Error fetching invites:', err);
        return of([]);
      })
    );
  }

  /**
   * Get pending invites only
   */
  getPendingInvites$(): Observable<AdminInvite[]> {
    if (!this.roleService.isSuperAdmin()) {
      return of([]);
    }

    const q = query(
      this.invitesCollection,
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map((invites) => invites as AdminInvite[]),
      catchError((err) => {
        console.error('Error fetching pending invites:', err);
        return of([]);
      })
    );
  }

  /**
   * Get invites by status
   */
  getInvitesByStatus$(status: InviteStatus): Observable<AdminInvite[]> {
    if (!this.roleService.isSuperAdmin()) {
      return of([]);
    }

    const q = query(
      this.invitesCollection,
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map((invites) => invites as AdminInvite[]),
      catchError((err) => {
        console.error('Error fetching invites by status:', err);
        return of([]);
      })
    );
  }

  /**
   * Get a single invite by ID (token)
   * This is public - anyone with the link can check if it's valid
   */
  getInviteById$(inviteId: string): Observable<AdminInvite | null> {
    const inviteRef = doc(this.firestore, 'invites', inviteId);

    return docData(inviteRef, { idField: 'id' }).pipe(
      map((invite) => (invite as AdminInvite) || null),
      catchError((err) => {
        console.error('Error fetching invite:', err);
        return of(null);
      })
    );
  }

  /**
   * Validate an invite link
   * Returns the invite if valid (pending and not expired), null otherwise
   */
  async validateInvite(inviteId: string): Promise<AdminInvite | null> {
    return new Promise((resolve) => {
      this.getInviteById$(inviteId).subscribe((invite) => {
        if (!invite) {
          resolve(null);
          return;
        }

        // Check if already used or revoked
        if (invite.status !== 'pending') {
          resolve(null);
          return;
        }

        // Check if expired
        if (invite.expiresAt && invite.expiresAt.toMillis() < Date.now()) {
          resolve(null);
          return;
        }

        resolve(invite);
      });
    });
  }

  /**
   * Create a new invite link (superadmin only)
   * Returns the invite ID which serves as the shareable token
   */
  async createInvite(data: CreateInviteData): Promise<string> {
    if (!this.roleService.isSuperAdmin()) {
      throw new Error('Only superadmins can create invites');
    }

    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to create an invite');
    }

    const profile = this.roleService.getProfile();
    const expirationDays = data.expirationDays || this.DEFAULT_EXPIRY_DAYS;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    const inviteData = {
      role: data.role,
      status: 'pending' as InviteStatus,
      createdAt: serverTimestamp(),
      createdBy: user.uid,
      createdByName: profile?.displayName || user.displayName || 'Unknown',
      expiresAt: Timestamp.fromDate(expiresAt),
    };

    const docRef = await addDoc(this.invitesCollection, inviteData);
    return docRef.id;
  }

  /**
   * Revoke an invite (superadmin only)
   */
  async revokeInvite(inviteId: string): Promise<void> {
    if (!this.roleService.isSuperAdmin()) {
      throw new Error('Only superadmins can revoke invites');
    }

    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const invite = await this.validateInvite(inviteId);
    if (!invite) {
      // Check if it exists but is already used/expired
      const existingInvite = await new Promise<AdminInvite | null>((resolve) => {
        this.getInviteById$(inviteId).subscribe((i) => resolve(i));
      });

      if (!existingInvite) {
        throw new Error('Invite not found');
      }

      if (existingInvite.status !== 'pending') {
        throw new Error('Only pending invites can be revoked');
      }
    }

    const inviteRef = doc(this.firestore, 'invites', inviteId);
    await updateDoc(inviteRef, {
      status: 'revoked' as InviteStatus,
      revokedAt: serverTimestamp(),
      revokedBy: user.uid,
    });
  }

  /**
   * Accept an invite (called when user clicks the invite link and signs in)
   * This marks the invite as accepted and cannot be used again
   */
  async acceptInvite(inviteId: string, userId: string, userEmail: string): Promise<InviteRole> {
    const invite = await this.validateInvite(inviteId);

    if (!invite) {
      throw new Error('Invalid or expired invite link');
    }

    const inviteRef = doc(this.firestore, 'invites', inviteId);

    await updateDoc(inviteRef, {
      status: 'accepted' as InviteStatus,
      acceptedAt: serverTimestamp(),
      acceptedBy: userId,
      acceptedByEmail: userEmail,
    });

    return invite.role;
  }

  /**
   * Get invite counts by status
   */
  getInviteCounts$(): Observable<{
    pending: number;
    accepted: number;
    expired: number;
    revoked: number;
  }> {
    return this.getAllInvites$().pipe(
      map((invites) => {
        const now = Date.now();
        return {
          pending: invites.filter(
            (i) =>
              i.status === 'pending' &&
              (!i.expiresAt || i.expiresAt.toMillis() > now)
          ).length,
          accepted: invites.filter((i) => i.status === 'accepted').length,
          expired: invites.filter(
            (i) =>
              i.status === 'pending' &&
              i.expiresAt &&
              i.expiresAt.toMillis() <= now
          ).length,
          revoked: invites.filter((i) => i.status === 'revoked').length,
        };
      })
    );
  }

  /**
   * Generate the full invite URL for sharing
   */
  getInviteUrl(inviteId: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/invite/${inviteId}`;
  }

  /**
   * Get recent invites (last 30 days)
   */
  getRecentInvites$(days: number = 30): Observable<AdminInvite[]> {
    if (!this.roleService.isSuperAdmin()) {
      return of([]);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const q = query(
      this.invitesCollection,
      where('createdAt', '>=', Timestamp.fromDate(cutoffDate)),
      orderBy('createdAt', 'desc')
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map((invites) => invites as AdminInvite[]),
      catchError((err) => {
        console.error('Error fetching recent invites:', err);
        return of([]);
      })
    );
  }
}
