import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RoleService } from '@core/services/role.service';
import { AdminCoursesRepo } from '@core/repos/admin-courses.repo';
import { AdminLessonsRepo } from '@core/repos/admin-lessons.repo';
import { AdminQuestionsRepo } from '@core/repos/admin-questions.repo';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  private readonly roleService = inject(RoleService);
  private readonly adminCoursesRepo = inject(AdminCoursesRepo);
  private readonly adminLessonsRepo = inject(AdminLessonsRepo);
  private readonly adminQuestionsRepo = inject(AdminQuestionsRepo);

  readonly isSuperAdmin = this.roleService.isSuperAdmin;
  readonly userProfile = signal(this.roleService.getProfile());
  readonly isSeedingQuestions = signal(false);
  readonly seedingStatus = signal('');

  // Stats (placeholder values)
  readonly stats = signal({
    totalCourses: 0,
    publishedCourses: 0,
    totalUsers: 0,
    pendingInvites: 0,
  });

  ngOnInit(): void {
    // Refresh profile on init
    this.userProfile.set(this.roleService.getProfile());
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
