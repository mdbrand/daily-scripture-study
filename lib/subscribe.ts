export type Plan = 'free' | 'premium';

export const CONSENT_TEXT =
  'I want Morning Lamp emails. My email is only used for Morning Lamp, never sold or shared, and I can unsubscribe any time.';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return null;
  return email;
}

export function normalizePlan(raw: unknown): Plan {
  return raw === 'premium' ? 'premium' : 'free';
}

const REF_RE = /^[a-z0-9_-]{2,40}$/;

export function normalizeRef(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const ref = raw.trim().toLowerCase();
  return REF_RE.test(ref) ? ref : null;
}
