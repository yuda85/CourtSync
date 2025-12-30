import { Component, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Firestore } from '@angular/fire/firestore';
import { seedLessonsToFirestore, SAMPLE_LESSONS } from '@core/utils/seed-lessons';

// Extend Window interface for dev utilities
declare global {
  interface Window {
    seedLessons: (courseId: string) => Promise<void>;
    listSampleLessons: () => void;
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly firestore = inject(Firestore);
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    // Only expose dev utilities in browser
    if (isPlatformBrowser(this.platformId)) {
      this.setupDevUtilities();
    }
  }

  private setupDevUtilities(): void {
    // Seed lessons function
    window.seedLessons = async (courseId: string) => {
      if (!courseId) {
        console.error('❌ Please provide a courseId: window.seedLessons("your-course-id")');
        return;
      }
      await seedLessonsToFirestore(this.firestore, courseId);
    };

    // List sample lessons
    window.listSampleLessons = () => {
      console.log('📚 Sample lessons that will be created:');
      SAMPLE_LESSONS.forEach((lesson, i) => {
        console.log(`  ${i + 1}. ${lesson.title} (${lesson.type}, ${lesson.durationMinutes} min)`);
      });
    };

    console.log('🛠️ Dev utilities loaded. Available commands:');
    console.log('  • window.seedLessons("course-id") - Add sample lessons to a course');
    console.log('  • window.listSampleLessons() - Preview lessons that will be created');
  }
}
