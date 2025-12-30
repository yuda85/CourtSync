import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { PracticeSessionService } from '@core/services/practice-session.service';
import { PracticeSessionSummary, TopicPerformance } from '@core/models/question.interface';
import { ButtonComponent } from '@shared/components/button/button.component';

@Component({
  selector: 'app-practice-summary',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './practice-summary.component.html',
  styleUrl: './practice-summary.component.scss'
})
export class PracticeSummaryComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly practiceService = inject(PracticeSessionService);

  /** Course ID from route */
  readonly courseId = signal<string>('');

  /** Lesson ID from route (optional - for lesson-specific practice) */
  readonly lessonId = signal<string>('');

  /** Session summary */
  readonly summary = signal<PracticeSessionSummary | null>(null);

  /** Performance thresholds */
  readonly EXCELLENT_THRESHOLD = 80;
  readonly GOOD_THRESHOLD = 60;
  readonly WEAK_THRESHOLD = 60;

  /** Computed: Overall grade message */
  readonly gradeMessage = computed(() => {
    const sum = this.summary();
    if (!sum) return '';

    if (sum.percentage >= this.EXCELLENT_THRESHOLD) {
      return 'מצוין! המשך כך!';
    } else if (sum.percentage >= this.GOOD_THRESHOLD) {
      return 'עבודה טובה! יש מקום לשיפור';
    } else {
      return 'כדאי לחזור על החומר';
    }
  });

  /** Computed: Grade icon */
  readonly gradeIcon = computed(() => {
    const sum = this.summary();
    if (!sum) return 'sentiment_neutral';

    if (sum.percentage >= this.EXCELLENT_THRESHOLD) {
      return 'emoji_events';
    } else if (sum.percentage >= this.GOOD_THRESHOLD) {
      return 'thumb_up';
    } else {
      return 'menu_book';
    }
  });

  /** Computed: Grade class for styling */
  readonly gradeClass = computed(() => {
    const sum = this.summary();
    if (!sum) return '';

    if (sum.percentage >= this.EXCELLENT_THRESHOLD) {
      return 'grade--excellent';
    } else if (sum.percentage >= this.GOOD_THRESHOLD) {
      return 'grade--good';
    } else {
      return 'grade--needs-work';
    }
  });

  /** Computed: Has weak topics to improve */
  readonly hasWeakTopics = computed(() => {
    const sum = this.summary();
    return sum && sum.weakestTopics.length > 0;
  });

  ngOnInit(): void {
    // Get course ID and optional lesson ID
    const id = this.route.snapshot.paramMap.get('id');
    const lessonId = this.route.snapshot.paramMap.get('lessonId');
    if (id) {
      this.courseId.set(id);
      this.lessonId.set(lessonId || '');
    }

    // Get session summary
    const sum = this.practiceService.getSummary();
    if (sum) {
      this.summary.set(sum);
    } else {
      // No summary available, redirect to practice entry
      if (id) {
        if (lessonId) {
          this.router.navigate(['/app/courses', id, 'learn', lessonId, 'practice']);
        } else {
          this.router.navigate(['/app/courses', id, 'practice']);
        }
      } else {
        this.router.navigate(['/app/profile']);
      }
    }
  }

  /** Practice again with same settings */
  onPracticeAgain(): void {
    this.practiceService.resetSession();
    const lessonId = this.lessonId();
    if (lessonId) {
      this.router.navigate(['/app/courses', this.courseId(), 'learn', lessonId, 'practice']);
    } else {
      this.router.navigate(['/app/courses', this.courseId(), 'practice']);
    }
  }

  /** Go back to course or lesson */
  onBack(): void {
    this.practiceService.resetSession();
    const lessonId = this.lessonId();
    if (lessonId) {
      this.router.navigate(['/app/courses', this.courseId(), 'learn', lessonId]);
    } else {
      this.router.navigate(['/app/courses', this.courseId(), 'learn']);
    }
  }

  /** Go back to main profile */
  onBackToProfile(): void {
    this.practiceService.resetSession();
    this.router.navigate(['/app/profile']);
  }

  /** Get performance bar width */
  getPerformanceWidth(topic: TopicPerformance): string {
    return `${topic.percentage}%`;
  }

  /** Get performance color class */
  getPerformanceClass(topic: TopicPerformance): string {
    if (topic.percentage >= this.EXCELLENT_THRESHOLD) {
      return 'performance--excellent';
    } else if (topic.percentage >= this.GOOD_THRESHOLD) {
      return 'performance--good';
    } else {
      return 'performance--weak';
    }
  }

  /** Format percentage display */
  formatPercentage(value: number): string {
    return `${value}%`;
  }
}
