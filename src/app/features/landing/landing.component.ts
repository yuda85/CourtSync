import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { HeaderComponent } from '@shared/components/header/header.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { CourseGridComponent } from '@shared/components/course-grid/course-grid.component';
import { AuthService } from '@core/services/auth.service';
import { CoursesCatalogService } from '@core/services/courses-catalog.service';
import { Course } from '@core/models/course.interface';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, HeaderComponent, ButtonComponent, CourseGridComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly catalogService = inject(CoursesCatalogService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  /** Featured courses for display */
  readonly featuredCourses = signal<Course[]>([]);

  /** Loading state for featured courses */
  readonly featuredLoading = signal(true);

  readonly isLoading = this.authService.isLoading;
  readonly currentYear = new Date().getFullYear();

  readonly stats = [
    { value: '10,000+', label: 'סטודנטים פעילים' },
    { value: '95%', label: 'שיעור הצלחה במבחנים' },
    { value: '50+', label: 'קורסים מקצועיים' },
    { value: '24/7', label: 'גישה לתוכן' }
  ];

  readonly steps = [
    {
      number: '01',
      title: 'בחר את הקורס',
      description: 'בחר מתוך מגוון קורסים במשפט - חוזים, פלילי, נזיקין ועוד. כל קורס מותאם לדרישות המבחן.',
      icon: 'search'
    },
    {
      number: '02',
      title: 'למד בקצב שלך',
      description: 'צפה בשיעורים קצרים וממוקדים. כל שיעור בנוי סביב נושא אחד כדי למקסם את הזכירה.',
      icon: 'play'
    },
    {
      number: '03',
      title: 'תרגל ובדוק את עצמך',
      description: 'בחן את הידע שלך עם שאלות תרגול אמיתיות ממבחנים קודמים ומעקב התקדמות.',
      icon: 'check'
    },
    {
      number: '04',
      title: 'הצלח במבחן',
      description: 'הגע למבחן מוכן ובטוח. הסטודנטים שלנו מדווחים על שיפור משמעותי בציונים.',
      icon: 'trophy'
    }
  ];

  readonly features = [
    {
      icon: 'target',
      title: 'ממוקד מבחנים',
      description: 'התוכן שלנו בנוי סביב מה שנבדק במבחנים. אין מילוי מיותר - רק מה שאתה צריך לדעת כדי להצליח.',
      highlight: 'שיעור הצלחה של 95%'
    },
    {
      icon: 'clock',
      title: 'קורסים קצרים וברורים',
      description: 'כל שיעור נמשך 10-15 דקות. מובנה, ממוקד ועובר ישר לעניין בלי לבזבז את הזמן שלך.',
      highlight: 'חסוך 60% מזמן הלמידה'
    },
    {
      icon: 'path',
      title: 'מסלולי למידה מותאמים',
      description: 'המערכת בונה לך מסלול למידה אישי על בסיס רמת הידע והזמן שלך עד המבחן.',
      highlight: 'התאמה אישית'
    },
    {
      icon: 'chart',
      title: 'מעקב התקדמות',
      description: 'דאשבורד אישי שמראה לך בדיוק איפה אתה עומד, מה עוד צריך לחזק ואיך להתקדם.',
      highlight: 'תובנות בזמן אמת'
    },
    {
      icon: 'book',
      title: 'סיכומים וחומרי עזר',
      description: 'גש לסיכומים מקצועיים, טבלאות השוואה ותרשימי זרימה שעוזרים להבין ולזכור.',
      highlight: 'חומרים להורדה'
    },
    {
      icon: 'users',
      title: 'קהילת לומדים',
      description: 'הצטרף לקהילה של סטודנטים למשפט. שאל שאלות, קבל תשובות וחלוק טיפים.',
      highlight: 'תמיכה הדדית'
    }
  ];

  readonly testimonials = [
    {
      name: 'יעל כהן',
      role: 'סטודנטית לתואר ראשון, אוניברסיטת תל אביב',
      content: 'הקורסים של CourtSync הצילו אותי. למדתי לבחינה בחוזים תוך שבועיים וקיבלתי 92. הסיכומים והתרגילים מדויקים לרמת המבחן.',
      rating: 5,
      course: 'דיני חוזים'
    },
    {
      name: 'אורי לוי',
      role: 'סטודנט לתואר ראשון, האוניברסיטה העברית',
      content: 'אחרי שנכשלתי בפלילי, מצאתי את CourtSync. השיטה של לפרק הכל לנושאים קטנים עבדה לי מעולה. עברתי עם 85.',
      rating: 5,
      course: 'דיני עונשין'
    },
    {
      name: 'מיכל ברק',
      role: 'סטודנטית לתואר שני, אוניברסיטת בר אילן',
      content: 'הפלטפורמה הכי נוחה שהשתמשתי בה. האפשרות ללמוד בנייד בזמן נסיעות חסכה לי המון זמן. מומלץ בחום!',
      rating: 5,
      course: 'משפט חוקתי'
    }
  ];

  readonly footerLinks = {
    product: [
      { label: 'קורסים', href: '#courses' },
      { label: 'מחירים', href: '#pricing' },
      { label: 'איך זה עובד', href: '#how-it-works' },
      { label: 'המלצות', href: '#testimonials' }
    ],
    support: [
      { label: 'צור קשר', href: '/contact' },
      { label: 'שאלות נפוצות', href: '/faq' },
      { label: 'מרכז עזרה', href: '/help' }
    ],
    legal: [
      { label: 'תנאי שימוש', href: '/terms' },
      { label: 'מדיניות פרטיות', href: '/privacy' },
      { label: 'החזרים וביטולים', href: '/refunds' }
    ]
  };

  ngOnInit(): void {
    // Load featured courses
    this.catalogService.featuredCourses$(6).pipe(
      takeUntil(this.destroy$)
    ).subscribe(courses => {
      this.featuredCourses.set(courses);
      this.featuredLoading.set(false);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async onGetStarted(): Promise<void> {
    try {
      await this.authService.signInWithGoogle();
    } catch {
      // Error handled in AuthService
    }
  }

  /** Handle featured course click - navigate to public course details */
  onFeaturedCourseClick(course: Course): void {
    // Navigate to public course details (no login required to view syllabus)
    this.router.navigate(['/courses', course.id]);
  }

  /** Navigate to full catalog (public route) */
  onViewAllCourses(): void {
    this.router.navigate(['/courses']);
  }
}
