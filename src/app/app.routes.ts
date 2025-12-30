import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { guestGuard } from '@core/guards/guest.guard';
import { entitlementGuard } from '@core/guards/entitlement.guard';
import { adminGuard } from '@core/guards/admin.guard';
import { superadminGuard } from '@core/guards/superadmin.guard';

export const routes: Routes = [
  // Public landing page (redirects authenticated users to profile)
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
        redirectTo: 'profile',
        pathMatch: 'full'
      }
    ]
  },

  // Admin routes (requires admin or superadmin role)
  {
    path: 'admin',
    loadComponent: () =>
      import('@features/admin/admin-shell/admin-shell.component').then(
        (m) => m.AdminShellComponent
      ),
    canActivate: [authGuard, adminGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('@features/admin/dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent
          ),
      },
      {
        path: 'courses',
        loadComponent: () =>
          import('@features/admin/courses/course-list/course-list.component').then(
            (m) => m.CourseListComponent
          ),
      },
      {
        path: 'courses/new',
        loadComponent: () =>
          import('@features/admin/courses/course-editor/course-editor.component').then(
            (m) => m.CourseEditorComponent
          ),
      },
      {
        path: 'courses/:courseId/edit',
        loadComponent: () =>
          import('@features/admin/courses/course-editor/course-editor.component').then(
            (m) => m.CourseEditorComponent
          ),
      },
      {
        path: 'courses/:courseId/outline',
        loadComponent: () =>
          import(
            '@features/admin/courses/course-outline-editor/course-outline-editor.component'
          ).then((m) => m.CourseOutlineEditorComponent),
      },
      {
        path: 'courses/:courseId/lessons',
        loadComponent: () =>
          import('@features/admin/lessons/lesson-list/lesson-list.component').then(
            (m) => m.LessonListComponent
          ),
      },
      {
        path: 'courses/:courseId/lessons/new',
        loadComponent: () =>
          import('@features/admin/lessons/lesson-editor/lesson-editor.component').then(
            (m) => m.LessonEditorComponent
          ),
      },
      {
        path: 'courses/:courseId/lessons/:lessonId/edit',
        loadComponent: () =>
          import('@features/admin/lessons/lesson-editor/lesson-editor.component').then(
            (m) => m.LessonEditorComponent
          ),
      },
      {
        path: 'courses/:courseId/questions',
        loadComponent: () =>
          import('@features/admin/questions/question-list/question-list.component').then(
            (m) => m.QuestionListComponent
          ),
      },
      {
        path: 'courses/:courseId/questions/new',
        loadComponent: () =>
          import(
            '@features/admin/questions/question-editor/question-editor.component'
          ).then((m) => m.QuestionEditorComponent),
      },
      {
        path: 'courses/:courseId/questions/:questionId/edit',
        loadComponent: () =>
          import(
            '@features/admin/questions/question-editor/question-editor.component'
          ).then((m) => m.QuestionEditorComponent),
      },
      // Superadmin-only routes
      {
        path: 'users',
        loadComponent: () =>
          import('@features/admin/users/user-list/user-list.component').then(
            (m) => m.UserListComponent
          ),
        canActivate: [superadminGuard],
      },
      {
        path: 'users/:userId',
        loadComponent: () =>
          import('@features/admin/users/user-detail/user-detail.component').then(
            (m) => m.UserDetailComponent
          ),
        canActivate: [superadminGuard],
      },
      {
        path: 'invites',
        loadComponent: () =>
          import('@features/admin/invites/invite-list/invite-list.component').then(
            (m) => m.InviteListComponent
          ),
        canActivate: [superadminGuard],
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },

  // Fallback - redirect unknown routes to landing
  {
    path: '**',
    redirectTo: ''
  }
];
