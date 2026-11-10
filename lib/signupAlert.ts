import { rpc } from './supabaseRpc';
import { sendEmail } from './email/send';

// "New subscriber" alert to the site owner. Fire-and-forget: callers run this inside after()
// and it never throws, so a failed alert can never affect a signup.

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://morninglamp.study';
const DEFAULT_TO = 'rob@robpene.com';

export type SignupAlertInput = {
  email: string;
  plan: string;
  formLocation: string | null; // the `source` the form sends (hero, plan picker, ...)
  pageUrl: string | null; // page the form was on
  referrer: string | null; // document.referrer
  ref: string | null; // partner code (referred_by)
  utm: Record<string, string>;
  timezone: string | null;
  emailFlag: string | null;
  geo: { city: string | null; region: string | null; country: string | null };
  at: Date;
  total: number | null;
};

export function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function geoFromHeaders(h: Headers) {
  const dec = (v: string | null) => {
    if (!v) return null;
    try {
      return decodeURIComponent(v).trim() || null;
    } catch {
      return v.trim() || null;
    }
  };
  return {
    city: dec(h.get('x-vercel-ip-city')),
    region: dec(h.get('x-vercel-ip-country-region')),
    country: dec(h.get('x-vercel-ip-country')),
  };
}

export function clean(v: unknown, max = 300): string | null {
  if (typeof v !== 'string') return null;
  const s = v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
  return s || null;
}

export function cleanUtm(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^utm_[a-z_]{1,20}$/.test(k)) continue;
    const val = clean(v, 120);
    if (val) out[k] = val;
  }
  return out;
}

function fmt(d: Date, tz: string): string | null {
  try {
    return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: tz });
  } catch {
    return null;
  }
}

export function renderSignupAlert(a: SignupAlertInput): { subject: string; html: string; text: string } {
  const pacific = fmt(a.at, 'America/Los_Angeles') ?? a.at.toISOString();
  const theirs = a.timezone && a.timezone !== 'America/Los_Angeles' ? fmt(a.at, a.timezone) : null;
  const place = [a.geo.city, a.geo.region, a.geo.country].filter(Boolean).join(', ');
  const adminLink = `${SITE}/admin/subscribers/view?email=${encodeURIComponent(a.email)}`;
  const planLabel = a.plan === 'premium' ? 'Premium early access (free to join, not paid yet)' : 'Free daily email';

  const rows: [string, string, string][] = [
    ['Email', a.email, `<strong>${esc(a.email)}</strong>`],
    ['When (Pacific)', pacific, esc(pacific)],
  ];
  if (theirs) rows.push([`When (their time, ${a.timezone})`, theirs, esc(theirs)]);
  else if (a.timezone) rows.push(['Their timezone', a.timezone, esc(a.timezone)]);
  rows.push(['Plan', planLabel, esc(planLabel)]);
  rows.push(['Form', a.formLocation ?? 'not reported', esc(a.formLocation ?? 'not reported')]);
  rows.push(['Page', a.pageUrl ?? 'not reported', esc(a.pageUrl ?? 'not reported')]);
  if (a.referrer) rows.push(['Referrer', a.referrer, esc(a.referrer)]);
  if (a.ref) rows.push(['Partner link (?ref=)', a.ref, esc(a.ref)]);
  const utm = Object.entries(a.utm);
  if (utm.length) rows.push(['UTM', utm.map(([k, v]) => `${k}=${v}`).join(', '), utm.map(([k, v]) => `${esc(k)}=${esc(v)}`).join('<br>')]);
  rows.push(['Approx. location', place || 'not available', esc(place || 'not available')]);
  if (a.emailFlag === 'privacy_relay') rows.push(['Email type', 'Privacy relay address (Apple/Firefox/etc.)', 'Privacy relay address (Apple/Firefox/etc.)']);
  rows.push(['Status', 'Not confirmed yet (double opt-in: they must tap the link in the confirmation email)', 'Not confirmed yet (double opt-in: they must tap the link in the confirmation email)']);
  if (a.total != null) rows.push(['Total subscribers', String(a.total), esc(a.total)]);

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f3ee;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#2a2622;">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e6dfd3;border-radius:8px;padding:20px 22px;">
<h1 style="font-size:18px;margin:0 0 14px;">New Morning Lamp subscriber</h1>
<table style="border-collapse:collapse;width:100%;font-size:14px;line-height:1.45;">
${rows.map(([k, , h]) => `<tr><td style="padding:6px 12px 6px 0;color:#7a6f60;vertical-align:top;white-space:nowrap;">${esc(k)}</td><td style="padding:6px 0;vertical-align:top;word-break:break-word;">${h}</td></tr>`).join('\n')}
</table>
<p style="margin:18px 0 0;font-size:14px;"><a href="${esc(adminLink)}" style="color:#8a5a12;">Open this subscriber in the admin portal</a></p>
</div></body></html>`;

  const text = `New Morning Lamp subscriber\n\n${rows.map(([k, t]) => `${k}: ${t}`).join('\n')}\n\nAdmin: ${adminLink}\n`;
  return { subject: `New Morning Lamp subscriber: ${a.email}`.replace(/[\r\n]+/g, ' '), html, text };
}

// Looks up the running total, renders and sends. Never throws.
export async function sendSignupAlert(input: Omit<SignupAlertInput, 'total'>): Promise<void> {
  try {
    const to = process.env.DSS_SIGNUP_NOTIFY_TO?.trim() || DEFAULT_TO;
    let total: number | null = null;
    const gate = process.env.DSS_DB_GATE;
    if (gate) {
      try {
        const o = await rpc<{ subscribers?: { total?: number } }>('dss_admin_overview', { p_gate: gate });
        total = typeof o?.subscribers?.total === 'number' ? o.subscribers.total : null;
      } catch (e) {
        console.error('signup alert: total lookup failed', e);
      }
    }
    await sendEmail({ to, ...renderSignupAlert({ ...input, total }) });
  } catch (e) {
    console.error('signup alert: send failed', e);
  }
}

// True only when the address is not in the table yet. Needs the admin gate; if it can't tell
// (no gate, lookup error) it returns false so we never alert on a guess.
export async function isNewSubscriber(email: string): Promise<boolean> {
  const gate = process.env.DSS_DB_GATE;
  if (!gate) return false;
  try {
    const existing = await rpc<unknown | null>('dss_admin_subscriber_get', { p_gate: gate, p_email: email });
    return existing == null;
  } catch (e) {
    console.error('signup alert: existence check failed', e);
    return false;
  }
}
