import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, switchMap, catchError, shareReplay } from 'rxjs/operators';
import { Auth, authState, User } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  doc,
  collectionData,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from '@angular/fire/firestore';
import { VideoBookmark, CreateBookmarkPayload } from '@core/models/bookmark.interface';

/**
 * Bookmarks Repository
 * Manages video timestamp bookmarks in Firestore
 * Path: /users/{uid}/bookmarks/{bookmarkId}
 */
@Injectable({
  providedIn: 'root'
})
export class BookmarksRepo {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  /** Cached auth state observable */
  private readonly authState$: Observable<User | null>;

  constructor() {
    this.authState$ = authState(this.auth).pipe(
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  /**
   * Get bookmarks collection reference for current user
   */
  private getBookmarksRef(uid: string) {
    return collection(this.firestore, `users/${uid}/bookmarks`);
  }

  /**
   * Get all bookmarks for a lesson, ordered by timestamp
   */
  getBookmarksForLesson$(lessonId: string): Observable<VideoBookmark[]> {
    return this.authState$.pipe(
      switchMap(user => {
        if (!user) {
          return of([]);
        }

        const bookmarksRef = this.getBookmarksRef(user.uid);
        const q = query(
          bookmarksRef,
          where('lessonId', '==', lessonId),
          orderBy('timestamp', 'asc')
        );

        return collectionData(q, { idField: 'id' }).pipe(
          map(docs => docs as VideoBookmark[]),
          catchError(err => {
            console.error('Error fetching bookmarks:', err);
            return of([]);
          })
        );
      })
    );
  }

  /**
   * Get all bookmarks for a course
   */
  getBookmarksForCourse$(courseId: string): Observable<VideoBookmark[]> {
    return this.authState$.pipe(
      switchMap(user => {
        if (!user) {
          return of([]);
        }

        const bookmarksRef = this.getBookmarksRef(user.uid);
        const q = query(
          bookmarksRef,
          where('courseId', '==', courseId),
          orderBy('timestamp', 'asc')
        );

        return collectionData(q, { idField: 'id' }).pipe(
          map(docs => docs as VideoBookmark[]),
          catchError(err => {
            console.error('Error fetching course bookmarks:', err);
            return of([]);
          })
        );
      })
    );
  }

  /**
   * Create a new bookmark
   */
  async createBookmark(payload: CreateBookmarkPayload): Promise<string> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const bookmarksRef = this.getBookmarksRef(user.uid);
    const newDocRef = doc(bookmarksRef);

    const bookmark: Omit<VideoBookmark, 'id'> = {
      ...payload,
      userId: user.uid,
      createdAt: serverTimestamp() as any
    };

    await setDoc(newDocRef, bookmark);
    return newDocRef.id;
  }

  /**
   * Update bookmark title
   */
  async updateBookmarkTitle(bookmarkId: string, title: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const bookmarkRef = doc(this.firestore, `users/${user.uid}/bookmarks/${bookmarkId}`);
    await setDoc(bookmarkRef, { title }, { merge: true });
  }

  /**
   * Delete a bookmark
   */
  async deleteBookmark(bookmarkId: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const bookmarkRef = doc(this.firestore, `users/${user.uid}/bookmarks/${bookmarkId}`);
    await deleteDoc(bookmarkRef);
  }
}
