import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  limit,
} from '@angular/fire/firestore';
import { User } from '@angular/fire/auth';
import { UserProfile, UserRole } from '../models/user-profile.interface';

@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  private readonly firestore = inject(Firestore);

  /**
   * Create or update a user profile in Firestore
   * Creates new profile on first login, updates lastLoginAt on subsequent logins
   * Also checks for pending invites and assigns admin role if found
   */
  async createOrUpdateProfile(user: User): Promise<void> {
    const userRef = doc(this.firestore, 'users', user.uid);

    try {
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        // User exists, update last login time
        await setDoc(
          userRef,
          {
            lastLoginAt: serverTimestamp(),
          },
          { merge: true }
        );

        // Check for pending invites even for existing users
        // (in case they registered before being invited)
        await this.checkAndAcceptInvite(user);
      } else {
        // Check for pending invite before creating profile
        const invite = await this.findPendingInvite(user.email || '');

        // Determine initial roles
        const roles: UserRole[] = ['student'];
        let invitedAt: ReturnType<typeof serverTimestamp> | undefined;
        let createdBy: string | undefined;

        if (invite) {
          // User has a pending invite, add admin role
          roles.push('admin');
          invitedAt = serverTimestamp();
          createdBy = invite.createdBy;

          // Accept the invite
          await this.acceptInvite(invite.id, user.uid);
        }

        // New user, create full profile
        const newProfile: Omit<UserProfile, 'createdAt' | 'lastLoginAt' | 'invitedAt'> & {
          createdAt: ReturnType<typeof serverTimestamp>;
          lastLoginAt: ReturnType<typeof serverTimestamp>;
          invitedAt?: ReturnType<typeof serverTimestamp>;
        } = {
          uid: user.uid,
          displayName: user.displayName || 'משתמש',
          email: user.email || '',
          photoURL: user.photoURL || '',
          roles,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        };

        if (invitedAt) {
          newProfile.invitedAt = invitedAt;
        }

        if (createdBy) {
          (newProfile as any).createdBy = createdBy;
        }

        await setDoc(userRef, newProfile);
      }
    } catch (error) {
      console.error('Error creating/updating user profile:', error);
      throw error;
    }
  }

  /**
   * Check for pending invite and accept it for existing user
   */
  private async checkAndAcceptInvite(user: User): Promise<void> {
    if (!user.email) return;

    const invite = await this.findPendingInvite(user.email);
    if (!invite) return;

    // Check if user already has admin role
    const userRef = doc(this.firestore, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return;

    const profile = userSnap.data() as UserProfile;

    if (profile.roles?.includes('admin')) {
      // Already admin, just accept the invite
      await this.acceptInvite(invite.id, user.uid);
      return;
    }

    // Add admin role to existing user
    const newRoles = [...(profile.roles || ['student']), 'admin'];

    await updateDoc(userRef, {
      roles: newRoles,
      invitedAt: serverTimestamp(),
      createdBy: invite.createdBy,
    });

    // Accept the invite
    await this.acceptInvite(invite.id, user.uid);

    console.log('Admin role granted via invite for:', user.email);
  }

  /**
   * Find a pending invite for the given email
   */
  private async findPendingInvite(
    email: string
  ): Promise<{ id: string; createdBy: string } | null> {
    if (!email) return null;

    const normalizedEmail = email.toLowerCase().trim();
    const invitesRef = collection(this.firestore, 'invites');

    const q = query(
      invitesRef,
      where('email', '==', normalizedEmail),
      where('status', '==', 'pending'),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const inviteDoc = snapshot.docs[0];
    const inviteData = inviteDoc.data();

    // Check if invite has expired
    if (inviteData['expiresAt'] && inviteData['expiresAt'].toMillis() < Date.now()) {
      return null;
    }

    return {
      id: inviteDoc.id,
      createdBy: inviteData['createdBy'],
    };
  }

  /**
   * Accept an invite
   */
  private async acceptInvite(inviteId: string, userId: string): Promise<void> {
    const inviteRef = doc(this.firestore, 'invites', inviteId);

    await updateDoc(inviteRef, {
      status: 'accepted',
      acceptedAt: serverTimestamp(),
      acceptedBy: userId,
    });

    console.log('Invite accepted:', inviteId);
  }

  /**
   * Get a user profile by UID
   */
  async getProfile(uid: string): Promise<UserProfile | null> {
    const userRef = doc(this.firestore, 'users', uid);

    try {
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
      }

      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile fields
   */
  async updateProfile(
    uid: string,
    updates: Partial<Omit<UserProfile, 'uid' | 'createdAt'>>
  ): Promise<void> {
    const userRef = doc(this.firestore, 'users', uid);

    try {
      await setDoc(userRef, updates, { merge: true });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }
}
