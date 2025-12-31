import { Timestamp } from '@angular/fire/firestore';

/**
 * CourseEnrollment - Reverse index of users enrolled in a course
 * Stored in /courseEnrollments/{courseId}/users/{userId}
 *
 * This enables admins to query which users are enrolled in their courses
 * without needing to scan all users' entitlements subcollections.
 */
export interface CourseEnrollment {
  courseId: string;           // The course ID (same as parent doc path)
  userId: string;             // The enrolled user's UID
  userEmail: string;          // For display without extra lookups
  userDisplayName: string;    // User's display name
  enrolledAt: Timestamp;      // When the enrollment was created
  source: 'demo' | 'payment'; // How they enrolled
  progressPercent?: number;   // Optional: progress snapshot for quick display
}

/**
 * Data needed to create an enrollment record
 */
export interface CreateEnrollmentData {
  courseId: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  source: 'demo' | 'payment';
}
