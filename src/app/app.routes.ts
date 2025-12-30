import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { guestGuard } from '@core/guards/guest.guard';
import { entitlementGuard } from '@core/guards/entitlement.guard';

export const routes: Routes = [
  // Public landing page (redirects authenticated users to dashboard)
  {
    path: '',
    loadComponent: () => import('@features/landing/landing.component').then(m => m.LandingComponent),
    canActivate: [guestGuard]
  },

  // Public catalog (no auth required - browse all courses)
  {
    path: 'courses',
    loadComponent: () => import('@features/courses/catalog/catalog.component').then(m => m.CatalogComponent)
  },

  // Public course details (no auth required - view syllabus)
  {
    path: 'courses/:id',
    loadComponent: () => import('@features/courses/details/details.component').then(m => m.DetailsComponent)
  },

  // Protected routes (requires authentication)
  {
    path: 'app',
    loadComponent: () => import('@features/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('@features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'courses',
        loadComponent: () => import('@features/courses/catalog/catalog.component').then(m => m.CatalogComponent)
      },
      {
        path: 'courses/:id',
        loadComponent: () => import('@features/courses/details/details.component').then(m => m.DetailsComponent)
      },
      {
        path: 'courses/:id/learn',
        loadComponent: () => import('@features/courses/learn/learn.component').then(m => m.LearnComponent),
        canActivate: [entitlementGuard]
      },
      {
        path: 'courses/:id/learn/:lessonId',
        loadComponent: () => import('@features/courses/lesson/lesson.component').then(m => m.LessonComponent),
        canActivate: [entitlementGuard]
      },
      {
        path: 'library',
        loadComponent: () => import('@features/library/library.component').then(m => m.LibraryComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('@features/profile/profile.component').then(m => m.ProfileComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },

  // Fallback - redirect unknown routes to landing
  {
    path: '**',
    redirectTo: ''
  }
];
