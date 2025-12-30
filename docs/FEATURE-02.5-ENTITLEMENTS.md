# Feature #2.5: Mock Purchase & Entitlements System

## Overview

This feature implements a complete entitlement system that allows users to "purchase" courses (demo mode) and access learning content. The architecture is production-ready and designed for easy integration with real payment providers (Stripe, etc.) in the future.

## Architecture

### Data Flow

```
User clicks "רכוש גישה"
         ↓
DetailsComponent.onEnroll()
         ↓
EntitlementsRepo.purchaseDemoCourse(courseId, price)
         ↓
Check if entitlement exists (idempotent)
         ↓
   ┌─────┴─────┐
   │           │
Exists?    Doesn't exist?
   │           │
   │           ↓
   │    Create document at:
   │    /users/{uid}/entitlements/{entId}
   │           │
   └─────┬─────┘
         ↓
Invalidate cache → UI updates
         ↓
Navigate to /app/courses/:id/learn
```

## Firestore Data Model

### Entitlements Subcollection

**Path:** `/users/{uid}/entitlements/{entId}`

```typescript
interface Entitlement {
  id: string;                        // Document ID (auto-generated)
  type: 'course' | 'path' | 'bundle'; // Entitlement type
  refId: string;                     // Course ID (or path/bundle ID)
  purchasedAt: Timestamp;            // When purchased
  source: 'demo' | 'payment';        // Purchase source
  pricePaidIls?: number;             // Price paid (optional)
}
```

### Example Document

```json
{
  "type": "course",
  "refId": "intro-criminal-law",
  "purchasedAt": "2024-01-15T10:30:00Z",
  "source": "demo",
  "pricePaidIls": 149
}
```

## Core Implementation

### EntitlementsRepo (`core/repos/entitlements.repo.ts`)

The repository handles all Firestore operations for entitlements.

**Key Methods:**

| Method | Description |
|--------|-------------|
| `myEntitlements$()` | Observable of user's entitlements (real-time) |
| `hasCourseEntitlement$(courseId)` | Check if user has access to course |
| `getMyCourseIds$()` | Get list of purchased course IDs |
| `purchaseDemoCourse(courseId, price)` | Create demo entitlement |
| `invalidateCache()` | Force refresh of cached data |

**Idempotent Purchase:**

```typescript
async purchaseDemoCourse(courseId: string, priceIls: number): Promise<void> {
  // Step 1: Check if already purchased (prevents duplicates)
  const q = query(entitlementsRef,
    where('type', '==', 'course'),
    where('refId', '==', courseId)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    console.log('Already purchased');
    return; // Idempotent - no duplicate
  }

  // Step 2: Create entitlement
  await setDoc(entitlementRef, {
    type: 'course',
    refId: courseId,
    purchasedAt: Timestamp.now(),
    source: 'demo',
    pricePaidIls: priceIls
  });

  // Step 3: Invalidate cache
  this.invalidateCache();
}
```

### Entitlement Guard (`core/guards/entitlement.guard.ts`)

Protects the `/app/courses/:id/learn` route.

```typescript
export const entitlementGuard: CanActivateFn = (route) => {
  const courseId = route.paramMap.get('id');

  return entitlementsRepo.hasCourseEntitlement$(courseId).pipe(
    map(hasAccess => {
      if (!hasAccess) {
        // Redirect to course details page
        return router.createUrlTree(['/app/courses', courseId]);
      }
      return true;
    })
  );
};
```

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Public courses (read-only)
    match /courses/{courseId} {
      allow read: if resource.data.isPublished == true;
      allow write: if false;

      match /outline/{itemId} {
        allow read: if true;
        allow write: if false;
      }
    }

    // User documents
    match /users/{userId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;

      // Entitlements subcollection
      match /entitlements/{entId} {
        allow read: if request.auth != null
                    && request.auth.uid == userId;

        allow create: if request.auth != null
          && request.auth.uid == userId
          && request.resource.data.keys().hasAll(['type', 'refId', 'purchasedAt', 'source'])
          && request.resource.data.type in ['course', 'path', 'bundle']
          && request.resource.data.source in ['demo', 'payment'];

        allow update, delete: if false;
      }
    }
  }
}
```

**Security Highlights:**
- Users can only read/write their OWN entitlements
- Required fields are validated
- Field values are validated (type, source)
- Updates/deletes prevented for audit trail

## User Flows

### Purchase Flow (Course Details Page)

1. User views course details at `/app/courses/:id`
2. If not entitled, sees "רכוש גישה ב-₪XX" button
3. Clicks button → `purchaseDemoCourse()` called
4. Entitlement created in Firestore
5. UI updates to show "המשך לקורס" button
6. User clicks → navigates to `/app/courses/:id/learn`

### My Library Flow

1. User navigates to `/app/library`
2. `myEntitlements$()` fetches user's entitlements
3. Course IDs extracted from entitlements
4. Course details fetched for each ID
5. Grid displays purchased courses
6. Click course → navigate to learn page

### Route Protection Flow

1. User tries to access `/app/courses/:id/learn`
2. `entitlementGuard` checks `hasCourseEntitlement$(id)`
3. If entitled → allow access
4. If not entitled → redirect to `/app/courses/:id`

## File Structure

```
src/app/
├── core/
│   ├── models/
│   │   └── entitlement.interface.ts    # Entitlement types
│   ├── repos/
│   │   └── entitlements.repo.ts        # Firestore operations
│   └── guards/
│       └── entitlement.guard.ts        # Route protection
│
├── features/
│   ├── courses/
│   │   ├── details/                    # Course details + purchase
│   │   └── learn/                      # Learning page (protected)
│   └── library/                        # My purchased courses
│
firebase/
└── firestore.rules                     # Security rules
```

## Routes

| Route | Component | Guard | Description |
|-------|-----------|-------|-------------|
| `/app/courses` | CatalogComponent | authGuard | Course catalog |
| `/app/courses/:id` | DetailsComponent | authGuard | Course details |
| `/app/courses/:id/learn` | LearnComponent | authGuard + entitlementGuard | Learning (protected) |
| `/app/library` | LibraryComponent | authGuard | My courses |

## Testing

### Manual Testing Checklist

1. **Purchase Flow:**
   - [ ] Click purchase button
   - [ ] Verify Firestore document created
   - [ ] Verify button changes to "המשך לקורס"
   - [ ] Click again - no duplicate created (idempotent)

2. **Route Protection:**
   - [ ] Try accessing `/app/courses/:id/learn` without purchase
   - [ ] Verify redirect to course details
   - [ ] Purchase course, then access learn page
   - [ ] Verify access granted

3. **My Library:**
   - [ ] Purchase a course
   - [ ] Navigate to `/app/library`
   - [ ] Verify course appears in grid
   - [ ] Click course → navigates to learn page

### Viewing Firestore Data

1. Open Firebase Console
2. Go to Firestore Database
3. Navigate to: `users/{your-uid}/entitlements`
4. View entitlement documents

### Clearing Test Data

To re-test purchase flow:
1. Open Firebase Console → Firestore
2. Delete documents in `users/{uid}/entitlements`
3. Refresh app - course shows as unpurchased

## Future Enhancements

### Payment Integration (Stripe)

Replace `purchaseDemoCourse()` with Cloud Function:

```typescript
// Cloud Function (future)
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  const session = await stripe.checkout.sessions.create({
    line_items: [{ price: data.priceId, quantity: 1 }],
    mode: 'payment',
    success_url: `${origin}/app/courses/${data.courseId}/learn`,
    cancel_url: `${origin}/app/courses/${data.courseId}`,
  });
  return { sessionId: session.id };
});

// Webhook handler
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const event = stripe.webhooks.constructEvent(...);

  if (event.type === 'checkout.session.completed') {
    // Create entitlement with source: 'payment'
    await admin.firestore()
      .doc(`users/${userId}/entitlements/${entId}`)
      .set({
        type: 'course',
        refId: courseId,
        purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'payment',
        pricePaidIls: amount
      });
  }
});
```

### Additional Features

- **Refunds:** Add `refundedAt` field, check in guard
- **Subscriptions:** Add `expiresAt` field for time-limited access
- **Bundles:** Support `type: 'bundle'` for course packages
- **Progress Tracking:** Add `progress` subcollection per entitlement

## Troubleshooting

### "Permission Denied" Error

1. Check Firestore rules are deployed
2. Verify user is authenticated
3. Check rule validation (required fields)

### Purchase Not Working

1. Check browser console for Firestore errors
2. Verify `purchasedAt` uses `Timestamp.now()`
3. Check `source` is 'demo' or 'payment'

### UI Not Updating After Purchase

1. `invalidateCache()` must be called after `setDoc()`
2. Component must subscribe to `hasCourseEntitlement$()`
3. Check for RxJS subscription issues

## Related Documentation

- [Feature #2: Course Catalog](./FEATURE-02-COURSE-CATALOG.md)
- [Firebase Setup](./FIREBASE-SETUP.md)
