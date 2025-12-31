import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { RoleService } from '@core/services/role.service';
import { AdminCoursesRepo } from '@core/repos/admin-courses.repo';
import { AdminLessonsRepo } from '@core/repos/admin-lessons.repo';
import { AdminQuestionsRepo } from '@core/repos/admin-questions.repo';
import { UsersRepo } from '@core/repos/users.repo';
import { InvitesRepo } from '@core/repos/invites.repo';
import { CourseEnrollmentsRepo } from '@core/repos/course-enrollments.repo';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private readonly roleService = inject(RoleService);
  private readonly adminCoursesRepo = inject(AdminCoursesRepo);
  private readonly adminLessonsRepo = inject(AdminLessonsRepo);
  private readonly adminQuestionsRepo = inject(AdminQuestionsRepo);
  private readonly usersRepo = inject(UsersRepo);
  private readonly invitesRepo = inject(InvitesRepo);
  private readonly courseEnrollmentsRepo = inject(CourseEnrollmentsRepo);
  private readonly destroy$ = new Subject<void>();

  readonly isSuperAdmin = this.roleService.isSuperAdmin;
  readonly userProfile = signal(this.roleService.getProfile());
  readonly isSeedingQuestions = signal(false);
  readonly seedingStatus = signal('');
  readonly isLoadingStats = signal(true);

  // Stats with real data
  readonly stats = signal({
    totalCourses: 0,
    publishedCourses: 0,
    totalUsers: 0,
    pendingInvites: 0,
    myStudents: 0, // For regular admins
  });

  ngOnInit(): void {
    // Refresh profile on init
    this.userProfile.set(this.roleService.getProfile());

    // Load real stats
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadStats(): void {
    this.isLoadingStats.set(true);

    // Load course stats
    this.adminCoursesRepo.getAllCourses$().pipe(
      takeUntil(this.destroy$)
    ).subscribe(courses => {
      this.stats.update(current => ({
        ...current,
        totalCourses: courses.length,
        publishedCourses: courses.filter(c => c.isPublished).length,
      }));

      // For regular admins, load their enrolled students count
      if (!this.isSuperAdmin()) {
        const courseIds = courses.map(c => c.id);
        if (courseIds.length > 0) {
          this.courseEnrollmentsRepo.getTotalEnrollmentCount$(courseIds).pipe(
            takeUntil(this.destroy$)
          ).subscribe(count => {
            this.stats.update(current => ({
              ...current,
              myStudents: count,
            }));
            this.isLoadingStats.set(false);
          });
        } else {
          this.isLoadingStats.set(false);
        }
      }
    });

    // Load user and invite stats only for superadmins
    if (this.isSuperAdmin()) {
      combineLatest([
        this.usersRepo.getAllUsers$(),
        this.invitesRepo.getInviteCounts$()
      ]).pipe(
        takeUntil(this.destroy$)
      ).subscribe(([users, inviteCounts]) => {
        this.stats.update(current => ({
          ...current,
          totalUsers: users.length,
          pendingInvites: inviteCounts.pending,
        }));
        this.isLoadingStats.set(false);
      });
    }
  }

  async seedAllQuestions(): Promise<void> {
    this.isSeedingQuestions.set(true);
    this.seedingStatus.set('טוען קורסים...');

    try {
      // Get all courses
      const courses = await firstValueFrom(this.adminCoursesRepo.getAllCourses$());
      let totalQuestions = 0;

      for (let i = 0; i < courses.length; i++) {
        const course = courses[i];
        this.seedingStatus.set(`מעבד קורס ${i + 1}/${courses.length}: ${course.title}`);

        // Get quiz lessons for this course
        const lessons = await firstValueFrom(
          this.adminLessonsRepo.getLessonsForCourse$(course.id)
        );
        const quizLessonIds = lessons
          .filter((l) => l.type === 'quiz')
          .map((l) => l.id);

        if (quizLessonIds.length > 0) {
          const count = await this.adminQuestionsRepo.seedSampleQuestions(
            course.id,
            quizLessonIds
          );
          totalQuestions += count;
        }
      }

      this.seedingStatus.set(`הושלם! נוצרו ${totalQuestions} שאלות`);
      setTimeout(() => this.seedingStatus.set(''), 3000);
    } catch (err) {
      console.error('Error seeding questions:', err);
      this.seedingStatus.set('שגיאה ביצירת שאלות');
    } finally {
      this.isSeedingQuestions.set(false);
    }
  }
}
