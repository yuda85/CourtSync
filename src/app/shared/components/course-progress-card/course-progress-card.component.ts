import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CourseProgressCardVM } from '@core/services/dashboard.service';
import { CoursesCatalogService } from '@core/services/courses-catalog.service';
import { ProgressBarComponent } from '@shared/components/progress-bar/progress-bar.component';
import { ButtonComponent } from '@shared/components/button/button.component';

@Component({
  selector: 'app-course-progress-card',
  standalone: true,
  imports: [CommonModule, ProgressBarComponent, ButtonComponent],
  templateUrl: './course-progress-card.component.html',
  styleUrl: './course-progress-card.component.scss'
})
export class CourseProgressCardComponent {
  private readonly catalogService = inject(CoursesCatalogService);
  private readonly router = inject(Router);

  /** Course progress data */
  data = input.required<CourseProgressCardVM>();

  /** Compact mode for smaller displays */
  compact = input(false);

  /** Emitted when card is clicked */
  cardClick = output<CourseProgressCardVM>();

  /** Get subject color class */
  readonly subjectColorClass = computed(() =>
    this.catalogService.getSubjectColorClass(this.data().course.subject)
  );

  /** Get subject gradient */
  readonly subjectGradient = computed(() =>
    this.catalogService.getSubjectGradient(this.data().course.subject)
  );

  /** Progress text */
  readonly progressText = computed(() => {
    const d = this.data();
    return `${d.completedLessons} מתוך ${d.totalLessons} שיעורים`;
  });

  /** Progress bar color */
  readonly progressColor = computed((): 'primary' | 'success' | 'warning' => {
    const color = this.data().statusColor;
    if (color === 'complete') return 'success';
    if (color === 'progress') return 'primary';
    return 'primary';
  });

  /** Handle card click */
  onClick(): void {
    this.cardClick.emit(this.data());
  }

  /** Navigate to course */
  onButtonClick(event: MouseEvent): void {
    event.stopPropagation();
    this.router.navigate([this.data().ctaRoute]);
  }

  /** Handle keyboard interaction */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onClick();
    }
  }
}
