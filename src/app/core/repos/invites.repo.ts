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
  limit,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { AdminInvite, InviteStatus, CreateInviteData } from '@core/models/invite.interface';
import { RoleService } from '@core/services/role.service';

/**
 * Invites Repository
 * Manages admin invitations - superadmin only
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
   * Default invite expiration time (7 days in milliseconds)
   */
  private readonly INVITE_EXPIRY_DAYS = 7;

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
   * Get a single invite by ID
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
   * Find a pending invite by email
   * Used during sign-in to auto-assign roles
   */
  findPendingInviteByEmail$(email: string): Observable<AdminInvite | null> {
    const normalizedEmail = email.toLowerCase().trim();

    const q = query(
      this.invitesCollection,
      where('email', '==', normalizedEmail),
      where('status', '==', 'pending'),
      limit(1)
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map((invites) => {
        if (invites.length === 0) return null;
        const invite = invites[0] as AdminInvite;

        // Check if invite has expired
        if (invite.expiresAt && invite.expiresAt.toMillis() < Date.now()) {
          return null;
        }

        return invite;
      }),
      catchError((err) => {
        console.error('Error finding invite by email:', err);
        return of(null);
      })
    );
  }

  /**
   * Create a new invite (superadmin only)
   */
  async createInvite(data: CreateInviteData): Promise<string> {
    if (!this.roleService.isSuperAdmin()) {
      throw new Error('Only superadmins can create invites');
    }

    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to create an invite');
    }

    const normalizedEmail = data.email.toLowerCase().trim();

    // Check if there's already a pending invite for this email
    const existingInvite = await new Promise<AdminInvite | null>((resolve) => {
      this.findPendingInviteByEmail$(normalizedEmail).subscribe((invite) =>
        resolve(invite)
      );
    });

    if (existingInvite) {
      throw new Error('יש כבר הזמנה ממתינה לכתובת אימייל זו');
    }

    const profile = this.roleService.getProfile();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.INVITE_EXPIRY_DAYS);

    const inviteData = {
      email: normalizedEmail,
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

    const invite = await new Promise<AdminInvite | null>((resolve) => {
      this.getInviteById$(inviteId).subscribe((i) => resolve(i));
    });

    if (!invite) {
      throw new Error('Invite not found');
    }

    if (invite.status !== 'pending') {
      throw new Error('Only pending invites can be revoked');
    }

    const inviteRef = doc(this.firestore, 'invites', inviteId);
    await updateDoc(inviteRef, {
      status: 'revoked' as InviteStatus,
      revokedAt: serverTimestamp(),
      revokedBy: user.uid,
    });
  }

  /**
   * Accept an invite (called during sign-in)
   * This marks the invite as accepted
   */
  async acceptInvite(inviteId: string, userId: string): Promise<void> {
    const inviteRef = doc(this.firestore, 'invites', inviteId);

    await updateDoc(inviteRef, {
      status: 'accepted' as InviteStatus,
      acceptedAt: serverTimestamp(),
      acceptedBy: userId,
    });
  }

  /**
   * Resend an invite (creates new invite with same email)
   */
  async resendInvite(inviteId: string): Promise<string> {
    if (!this.roleService.isSuperAdmin()) {
      throw new Error('Only superadmins can resend invites');
    }

    const invite = await new Promise<AdminInvite | null>((resolve) => {
      this.getInviteById$(inviteId).subscribe((i) => resolve(i));
    });

    if (!invite) {
      throw new Error('Invite not found');
    }

    // Revoke old invite if pending
    if (invite.status === 'pending') {
      await this.revokeInvite(inviteId);
    }

    // Create new invite
    return this.createInvite({
      email: invite.email,
      role: invite.role,
    });
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
   * Search invites by email
   */
  searchInvitesByEmail$(searchTerm: string): Observable<AdminInvite[]> {
    if (!this.roleService.isSuperAdmin()) {
      return of([]);
    }

    // Firestore doesn't support native text search
    // We'll filter client-side for small datasets
    return this.getAllInvites$().pipe(
      map((invites) =>
        invites.filter((invite) =>
          invite.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    );
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
