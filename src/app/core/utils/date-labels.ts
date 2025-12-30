import { Timestamp } from '@angular/fire/firestore';

/**
 * Returns Hebrew relative date label
 * @param date - Firestore Timestamp or Date
 * @returns Hebrew relative date string
 */
export function getRelativeDateLabel(date: Timestamp | Date | null | undefined): string {
  if (!date) return '';

  const now = new Date();
  const target = date instanceof Date ? date : date.toDate();
  const diffMs = now.getTime() - target.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'בקרוב';
  if (diffDays === 0) return 'היום';
  if (diffDays === 1) return 'אתמול';
  if (diffDays === 2) return 'לפני יומיים';
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  if (diffDays < 14) return 'לפני שבוע';
  if (diffDays < 21) return 'לפני שבועיים';
  if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
  if (diffDays < 60) return 'לפני חודש';
  if (diffDays < 365) return `לפני ${Math.floor(diffDays / 30)} חודשים`;
  return 'לפני יותר משנה';
}

/**
 * Format a date for display
 * @param date - Firestore Timestamp or Date
 * @returns Formatted date string in Hebrew locale
 */
export function formatDate(date: Timestamp | Date | null | undefined): string {
  if (!date) return '';

  const target = date instanceof Date ? date : date.toDate();
  return target.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}
