# CourtSync - Learning Management System

A modern, production-ready Learning Management System (LMS) built with Angular 21 and Firebase. Features Hebrew UI with LTR direction, Google authentication, and a beautiful responsive design.

## Features

- **Google Authentication** - Sign in with Google using Firebase Auth (popup method)
- **Theme System** - Light/Dark/System themes with persistence
- **Hebrew UI** - All text in Hebrew with enforced LTR direction
- **Responsive Design** - Mobile-first design that works on all devices
- **Firebase Backend** - Firestore for data storage, Firebase Auth for authentication
- **GitHub Pages Ready** - Configured for easy deployment to GitHub Pages

## Tech Stack

- **Framework**: Angular 21 (standalone components)
- **Backend**: Firebase (Auth + Firestore)
- **Styling**: Tailwind CSS + SCSS
- **Authentication**: Google Sign-in (popup)
- **Deployment**: GitHub Pages

## Project Structure

```
src/app/
├── core/                 # Singleton services, guards, models
│   ├── guards/          # Route guards (auth, guest)
│   ├── models/          # TypeScript interfaces
│   └── services/        # Auth, UserProfile, Theme services
├── shared/              # Reusable components
│   └── components/      # Button, Header, ThemeToggle
├── features/            # Feature modules
│   ├── landing/         # Public landing page
│   ├── shell/           # Authenticated layout wrapper
│   └── dashboard/       # User dashboard
└── styles/              # Global SCSS files
    ├── _theme-tokens.scss
    ├── _direction.scss
    └── _tailwind-overrides.scss
```

## Prerequisites

- Node.js 18+ and npm
- Angular CLI 21+
- Firebase account (for authentication)

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Configuration

The Firebase configuration is already set up in `src/environments/environment.ts`. If you need to use your own Firebase project:

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Google Sign-in in Authentication > Sign-in method
3. Create a Firestore database
4. Update the configuration in `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  }
};
```

### 3. Deploy Firestore Rules

Deploy the security rules from `firebase/firestore.rules` to your Firebase project:

```bash
firebase deploy --only firestore:rules
```

### 4. Start Development Server

```bash
npm start
# or
ng serve
```

Navigate to `http://localhost:4200/`. The app will automatically reload on file changes.

## Building for Production

```bash
npm run build:prod
# or
ng build --configuration production
```

Build artifacts will be stored in `dist/court-sync/browser`.

## Deployment to GitHub Pages

### Automatic Deployment

```bash
npm run deploy
```

This command:
1. Builds the production version
2. Deploys to the `gh-pages` branch

### Manual Deployment

1. Build the production version:
   ```bash
   ng build --configuration production
   ```

2. Deploy using angular-cli-ghpages:
   ```bash
   npx angular-cli-ghpages --dir=dist/court-sync/browser
   ```

### Post-Deployment

After deploying, configure your Firebase project:

1. Go to Firebase Console > Authentication > Settings
2. Add your GitHub Pages URL to Authorized domains:
   - `yuda85.github.io`

## Firebase Configuration

### Firestore Security Rules

The app uses these security rules (`firebase/firestore.rules`):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### User Profile Schema

When a user signs in, their profile is created/updated at `users/{uid}`:

```typescript
interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  roles: string[];         // Default: ['student']
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
}
```

## Theme System

The app supports three theme modes:

- **System** - Follows OS preference
- **Light** - Light theme
- **Dark** - Dark theme

Theme preference is persisted in localStorage under `courtsync-theme`.

### CSS Variables

Theme colors are defined in `src/styles/_theme-tokens.scss`:

```scss
html[data-theme="light"] {
  --color-bg-primary: #ffffff;
  --color-text-primary: #0f172a;
  // ...
}

html[data-theme="dark"] {
  --color-bg-primary: #0f172a;
  --color-text-primary: #f8fafc;
  // ...
}
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start development server |
| `npm run build` | Build for production |
| `npm run build:prod` | Build for production (explicit) |
| `npm test` | Run unit tests |
| `npm run deploy` | Build and deploy to GitHub Pages |

## Routes

| Path | Component | Guard | Description |
|------|-----------|-------|-------------|
| `/` | LandingComponent | guestGuard | Public landing page |
| `/app` | ShellComponent | authGuard | Authenticated shell |
| `/app/dashboard` | DashboardComponent | authGuard | User dashboard |

## License

MIT
