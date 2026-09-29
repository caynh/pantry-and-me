import type { ExpirationLeadDays, Ingredient } from '@pantry-and-me/shared';

export type ExpirationUrgency = 'expired' | 'soon' | 'ok' | 'none';
export type { ExpirationLeadDays };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Local calendar date as YYYY-MM-DD. */
export function todayYmd(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isValidExpirationDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Whole days from today to expiration (negative if already past). */
export function daysUntilExpiration(expirationDate: string, now = new Date()): number | null {
  if (!isValidExpirationDate(expirationDate)) return null;
  const [y, m, d] = expirationDate.split('-').map(Number);
  const expire = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((expire.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function getExpirationUrgency(
  expirationDate: string | undefined,
  leadDays: ExpirationLeadDays,
  now = new Date(),
): ExpirationUrgency {
  if (!expirationDate) return 'none';
  const days = daysUntilExpiration(expirationDate, now);
  if (days == null) return 'none';
  if (days < 0) return 'expired';
  if (days <= leadDays) return 'soon';
  return 'ok';
}

export function formatExpirationLabel(expirationDate: string, urgency: ExpirationUrgency): string {
  switch (urgency) {
    case 'expired':
      return `Expired ${expirationDate}`;
    case 'soon':
      return `Expires soon · ${expirationDate}`;
    default:
      return `Expires ${expirationDate}`;
  }
}

/** Expired + within lead days, soonest first. */
export function getExpiringSoonIngredients(
  ingredients: Ingredient[],
  leadDays: ExpirationLeadDays,
  now = new Date(),
): Ingredient[] {
  return ingredients
    .filter((item) => {
      const urgency = getExpirationUrgency(item.expirationDate, leadDays, now);
      return urgency === 'expired' || urgency === 'soon';
    })
    .sort((a, b) => (a.expirationDate ?? '').localeCompare(b.expirationDate ?? ''));
}

/**
 * Local calendar Date at 9:00 AM on (expiration − leadDays).
 * Returns null if that moment is already in the past or the date is invalid.
 */
export function reminderFireDate(
  expirationDate: string,
  leadDays: ExpirationLeadDays,
  now = new Date(),
): Date | null {
  if (!isValidExpirationDate(expirationDate)) return null;
  const [y, m, d] = expirationDate.split('-').map(Number);
  const fire = new Date(y, m - 1, d - leadDays, 9, 0, 0, 0);
  if (fire.getTime() <= now.getTime()) return null;
  return fire;
}
