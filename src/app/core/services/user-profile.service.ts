import { Injectable, inject } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, serverTimestamp, Timestamp } from '@angular/fire/firestore';
import { User } from '@angular/fire/auth';
import { UserProfile } from '../models/user-profile.interface';

@Injectable({
  providedIn: 'root'
})
export class UserProfileService {
  private readonly firestore = inject(Firestore);

  /**
   * Create or update a user profile in Firestore
   * Creates new profile on first login, updates lastLoginAt on subsequent logins
   */
  async createOrUpdateProfile(user: User): Promise<void> {
    const userRef = doc(this.firestore, 'users', user.uid);

    try {
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        // User exists, update last login time
        await setDoc(userRef, {
          lastLoginAt: serverTimestamp()
        }, { merge: true });
      } else {
        // New user, create full profile
        const newProfile: Omit<UserProfile, 'createdAt' | 'lastLoginAt'> & {
          createdAt: ReturnType<typeof serverTimestamp>;
          lastLoginAt: ReturnType<typeof serverTimestamp>;
        } = {
          uid: user.uid,
          displayName: user.displayName || 'משתמש',
          email: user.email || '',
          photoURL: user.photoURL || '',
          roles: ['student'],
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp()
        };

        await setDoc(userRef, newProfile);
      }
    } catch (error) {
      console.error('Error creating/updating user profile:', error);
      throw error;
    }
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
  async updateProfile(uid: string, updates: Partial<Omit<UserProfile, 'uid' | 'createdAt'>>): Promise<void> {
    const userRef = doc(this.firestore, 'users', uid);

    try {
      await setDoc(userRef, updates, { merge: true });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }
}
