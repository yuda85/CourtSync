import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Course } from '@core/models/course.interface';
import { CoursesCatalogService } from '@core/services/courses-catalog.service';

@Component({
  selector: 'app-course-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './course-card.component.html',
  styleUrl: './course-card.component.scss'
})
export class CourseCardComponent {
  private readonly catalogService = inject(CoursesCatalogService);

  /** Course data to display */
  course = input.required<Course>();

  /** Whether to show the price */
  showPrice = input(true);

  /** Compact mode for smaller cards */
  compact = input(false);

  /** Emitted when card is clicked */
  cardClick = output<Course>();

  /** Get formatted duration */
  get formattedDuration(): string {
    return this.catalogService.formatDuration(this.course().durationMinutes);
  }

  /** Get formatted price */
  get formattedPrice(): string {
    return this.catalogService.formatPrice(this.course().priceIls);
  }

  /** Get subject color class */
  get subjectColorClass(): string {
    return this.catalogService.getSubjectColorClass(this.course().subject);
  }

  /** Get level badge class */
  get levelBadgeClass(): string {
    return this.catalogService.getLevelBadgeClass(this.course().level);
  }

  /** Get gradient for card background */
  get subjectGradient(): string {
    return this.catalogService.getSubjectGradient(this.course().subject);
  }

  /** Is course free? */
  get isFree(): boolean {
    return this.course().priceIls === 0;
  }

  /** Handle card click */
  onClick(): void {
    this.cardClick.emit(this.course());
  }

  /** Handle keyboard interaction */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onClick();
    }
  }
}
