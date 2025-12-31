import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, of, forkJoin } from 'rxjs';
import { map, switchMap, shareReplay, catchError, take } from 'rxjs/operators';
import { Timestamp } from '@angular/fire/firestore';
import { EntitlementsRepo } from '@core/repos/entitlements.repo';
import { ProgressRepo } from '@core/repos/progress.repo';
import { LessonsRepo } from '@core/repos/lessons.repo';
import { CoursesCatalogService } from '@core/services/courses-catalog.service';
import { AuthService } from '@core/services/auth.service';
import { Course } from '@core/models/course.interface';
import { Lesson } from '@core/models/lesson.interface';
import { CourseProgress } from '@core/models/progress.interface';
import { Entitlement } from '@core/models/entitlement.interface';
import { getRelativeDateLabel } from '@core/utils/date-labels';

/**
 * Continue Learning hero section view model
 */
export interface ContinueLearningVM {
  type: 'resume' | 'start' | 'empty';
  course?: Course;
  lesson?: Lesson;
  route: string;
  ctaText: string;
  progressText?: string;
  lastActivityLabel?: string;
  progressPercent?: number;
}

/**
 * Course progress card view model
 */
export interface CourseProgressCardVM {
  course: Course;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  status: 'חדש' | 'בתהליך' | 'הושלם';
  statusColor: 'new' | 'progress' | 'complete';
  lastActivityAt: Timestamp | null;
  lastActivityLabel: string;
  ctaText: string;
  ctaRoute: string;
  currentLessonId?: string;
}

/**
 * Recent activity item view model
 */
export interface RecentActivityVM {
  courseId: string;
  courseTitle: string;
  lastActivityLabel: string;
  route: string;
  progressPercent: number;
}

/**
 * Dashboard stats
 */
export interface DashboardStats {
  activeCourses: number;
  completedCourses: number;
  totalLessonsCompleted: number;
}

/**
 * Main dashboard view model
 */
export interface DashboardVM {
  user: {
    displayName: string;
    photoURL?: string;
  };
  stats: DashboardStats;
  continueLearning: ContinueLearningVM;
  myCourses: CourseProgressCardVM[];
  recentActivity: RecentActivityVM[];
  filters: {
    subjects: string[];
  };
  isLoading: boolean;
}

/**
 * Dashboard Service
 * Aggregates data from multiple repos into a single view model
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly entitlementsRepo = inject(EntitlementsRepo);
  private readonly progressRepo = inject(ProgressRepo);
  private readonly lessonsRepo = inject(LessonsRepo);
  private readonly catalogService = inject(CoursesCatalogService);
  private readonly authService = inject(AuthService);

  /** Cached dashboard VM */
  private cachedVM$: Observable<DashboardVM> | null = null;

  /**
   * Get the full dashboard view model
   * Aggregates entitlements, courses, progress, and lessons
   */
  dashboardVM$(): Observable<DashboardVM> {
    if (!this.cachedVM$) {
      this.cachedVM$ = this.buildDashboardVM$().pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.cachedVM$;
  }

  /**
   * Force refresh the dashboard data
   */
  refresh(): void {
    this.cachedVM$ = null;
  }

  /**
   * Build the complete dashboard VM
   */
  private buildDashboardVM$(): Observable<DashboardVM> {
    return combineLatest([
      this.entitlementsRepo.myEntitlements$(),
      this.progressRepo.getAllProgress$()
    ]).pipe(
      switchMap(([entitlements, allProgress]) => {
        const user = this.authService.user();
        const courseEntitlements = entitlements.filter(e => e.type === 'course');

        // No courses purchased
        if (courseEntitlements.length === 0) {
          return of(this.buildEmptyDashboard(user));
        }

        // Fetch course details for all purchased courses
        const courseIds = courseEntitlements.map(e => e.refId);

        // Use take(1) to complete each observable - forkJoin needs completion
        const courseObservables = courseIds.map(id =>
          this.catalogService.getCourse$(id).pipe(take(1))
        );

        return forkJoin(courseObservables).pipe(
          switchMap(courses => {
            const validCourses = courses.filter((c): c is Course => c !== null);

            // Fetch lesson counts for each course
            // Use take(1) to complete each observable - forkJoin needs completion
            const lessonCountObservables = validCourses.map(course =>
              this.lessonsRepo.getLessonsForCourse$(course.id).pipe(
                take(1),
                map(lessons => ({ courseId: course.id, count: lessons.length, lessons }))
              )
            );

            return forkJoin(lessonCountObservables).pipe(
              map(lessonData => {
                const lessonCounts = new Map(lessonData.map(d => [d.courseId, d.count]));
                const lessonsMap = new Map(lessonData.map(d => [d.courseId, d.lessons]));

                return this.buildFullDashboard(
                  user,
                  validCourses,
                  allProgress,
                  courseEntitlements,
                  lessonCounts,
                  lessonsMap
                );
              })
            );
          })
        );
      }),
      catchError(err => {
        console.error('Dashboard error:', err);
        return of(this.buildEmptyDashboard(this.authService.user()));
      })
    );
  }

  /**
   * Build dashboard for users with no purchased courses
   */
  private buildEmptyDashboard(user: any): DashboardVM {
    return {
      user: {
        displayName: user?.displayName || 'משתמש',
        photoURL: user?.photoURL || undefined
      },
      stats: {
        activeCourses: 0,
        completedCourses: 0,
        totalLessonsCompleted: 0
      },
      continueLearning: {
        type: 'empty',
        route: '/app/courses',
        ctaText: 'עבור לקטלוג'
      },
      myCourses: [],
      recentActivity: [],
      filters: {
        subjects: []
      },
      isLoading: false
    };
  }

  /**
   * Build full dashboard with all data
   */
  private buildFullDashboard(
    user: any,
    courses: Course[],
    allProgress: CourseProgress[],
    entitlements: Entitlement[],
    lessonCounts: Map<string, number>,
    lessonsMap: Map<string, Lesson[]>
  ): DashboardVM {
    // Build progress map
    const progressMap = new Map(allProgress.map(p => [p.courseId, p]));
    const entitlementMap = new Map(entitlements.map(e => [e.refId, e]));

    // Build course cards
    const myCourses = courses.map(course => {
      const progress = progressMap.get(course.id);
      const entitlement = entitlementMap.get(course.id);
      const totalLessons = lessonCounts.get(course.id) || 0;

      return this.buildCourseProgressCard(course, progress, entitlement, totalLessons);
    });

    // Sort by last activity (most recent first)
    myCourses.sort((a, b) => {
      const aTime = a.lastActivityAt?.toMillis() || 0;
      const bTime = b.lastActivityAt?.toMillis() || 0;
      return bTime - aTime;
    });

    // Build continue learning
    const continueLearning = this.buildContinueLearning(
      myCourses,
      lessonsMap,
      progressMap
    );

    // Build recent activity (only courses with progress)
    const recentActivity = this.buildRecentActivity(myCourses);

    // Calculate stats
    const stats = this.calculateStats(myCourses);

    // Extract unique subjects
    const subjects = [...new Set(courses.map(c => c.subject))];

    return {
      user: {
        displayName: user?.displayName || 'משתמש',
        photoURL: user?.photoURL || undefined
      },
      stats,
      continueLearning,
      myCourses,
      recentActivity,
      filters: {
        subjects
      },
      isLoading: false
    };
  }

  /**
   * Build a single course progress card
   */
  private buildCourseProgressCard(
    course: Course,
    progress: CourseProgress | undefined,
    entitlement: Entitlement | undefined,
    totalLessons: number
  ): CourseProgressCardVM {
    const completedLessons = progress?.completedLessons?.length || 0;
    const progressPercent = progress?.progressPercent || 0;

    // Determine status
    let status: 'חדש' | 'בתהליך' | 'הושלם';
    let statusColor: 'new' | 'progress' | 'complete';
    let ctaText: string;

    if (progressPercent === 100) {
      status = 'הושלם';
      statusColor = 'complete';
      ctaText = 'חזרה';
    } else if (completedLessons > 0) {
      status = 'בתהליך';
      statusColor = 'progress';
      ctaText = 'המשך';
    } else {
      status = 'חדש';
      statusColor = 'new';
      ctaText = 'פתח';
    }

    // Determine last activity
    const lastActivityAt = progress?.lastAccessedAt || entitlement?.purchasedAt || null;
    const lastActivityLabel = getRelativeDateLabel(lastActivityAt);

    // Build route
    const ctaRoute = progress?.currentLessonId
      ? `/app/courses/${course.id}/learn/${progress.currentLessonId}`
      : `/app/courses/${course.id}/learn`;

    return {
      course,
      totalLessons,
      completedLessons,
      progressPercent,
      status,
      statusColor,
      lastActivityAt,
      lastActivityLabel,
      ctaText,
      ctaRoute,
      currentLessonId: progress?.currentLessonId
    };
  }

  /**
   * Build continue learning hero data
   */
  private buildContinueLearning(
    myCourses: CourseProgressCardVM[],
    lessonsMap: Map<string, Lesson[]>,
    progressMap: Map<string, CourseProgress>
  ): ContinueLearningVM {
    // Find the most recently accessed course that's not completed
    const inProgressCourse = myCourses.find(c => c.statusColor !== 'complete');

    if (!inProgressCourse) {
      // All courses completed or no courses
      if (myCourses.length > 0) {
        const latestCourse = myCourses[0];
        return {
          type: 'resume',
          course: latestCourse.course,
          route: latestCourse.ctaRoute,
          ctaText: 'חזרה לקורס',
          progressText: `${latestCourse.completedLessons} מתוך ${latestCourse.totalLessons} שיעורים`,
          lastActivityLabel: latestCourse.lastActivityLabel,
          progressPercent: latestCourse.progressPercent
        };
      }

      return {
        type: 'empty',
        route: '/app/courses',
        ctaText: 'עבור לקטלוג'
      };
    }

    // Get the current lesson if available
    const progress = progressMap.get(inProgressCourse.course.id);
    const lessons = lessonsMap.get(inProgressCourse.course.id) || [];
    let currentLesson: Lesson | undefined;

    if (progress?.currentLessonId) {
      currentLesson = lessons.find(l => l.id === progress.currentLessonId);
    } else if (lessons.length > 0) {
      // Find first incomplete lesson
      const completedSet = new Set(progress?.completedLessons || []);
      currentLesson = lessons.find(l => !completedSet.has(l.id)) || lessons[0];
    }

    const hasStarted = inProgressCourse.completedLessons > 0;

    return {
      type: hasStarted ? 'resume' : 'start',
      course: inProgressCourse.course,
      lesson: currentLesson,
      route: currentLesson
        ? `/app/courses/${inProgressCourse.course.id}/learn/${currentLesson.id}`
        : `/app/courses/${inProgressCourse.course.id}/learn`,
      ctaText: hasStarted ? 'המשך ללמוד' : 'התחל ללמוד',
      progressText: `${inProgressCourse.completedLessons} מתוך ${inProgressCourse.totalLessons} שיעורים`,
      lastActivityLabel: inProgressCourse.lastActivityLabel,
      progressPercent: inProgressCourse.progressPercent
    };
  }

  /**
   * Build recent activity list (only courses with actual progress)
   */
  private buildRecentActivity(myCourses: CourseProgressCardVM[]): RecentActivityVM[] {
    return myCourses
      .filter(c => c.completedLessons > 0) // Only show courses with progress
      .slice(0, 5) // Limit to 5
      .map(c => ({
        courseId: c.course.id,
        courseTitle: c.course.title,
        lastActivityLabel: c.lastActivityLabel,
        route: c.ctaRoute,
        progressPercent: c.progressPercent
      }));
  }

  /**
   * Calculate dashboard statistics
   */
  private calculateStats(myCourses: CourseProgressCardVM[]): DashboardStats {
    let activeCourses = 0;
    let completedCourses = 0;
    let totalLessonsCompleted = 0;

    for (const course of myCourses) {
      if (course.progressPercent === 100) {
        completedCourses++;
      } else {
        activeCourses++;
      }
      totalLessonsCompleted += course.completedLessons;
    }

    return {
      activeCourses,
      completedCourses,
      totalLessonsCompleted
    };
  }
}
