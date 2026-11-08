import { after, NextResponse } from 'next/server';
import { dailySettings, sendWelcomes } from '@/lib/daily';
import { CONSENT_TEXT, normalizeEmail, normalizePlan, normalizeRef } from '@/lib/subscribe';
import { checkEmail } from '@/lib/emailCheck';
import { suggestEmail } from '@/lib/emailTypos';

export const runtime = 'nodejs';

// Best-effort limit per server instance: 5 signups per IP per 10 minutes.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  const plan = normalizePlan(body.plan);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Too many tries. Please wait a few minutes.' }, { status: 429 });
  }

  // Keep throwaway inboxes and dead domains off the list; flag privacy relays.
  const verdict = await checkEmail(email);
  if (!verdict.ok) {
    return NextResponse.json(
      {
        error: verdict.message,
        reason: verdict.reason,
        suggestion: verdict.reason === 'no_mail_server' ? suggestEmail(email) : null,
      },
      { status: 422 },
    );
  }

  const url = process.env.SUPABASE_URL;
  // The public (publishable) key is enough: it can only call the dss_subscribe() function,
  // which adds/updates one signup and can't read anything back. No secret key needed.
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('subscribe: SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY is not set');
    return NextResponse.json(
      { error: 'Sign-ups are not open quite yet. Please check back soon.' },
      { status: 503 },
    );
  }

  // A hidden field real people never see. If it's filled, keep the row but flag it
  // instead of silently dropping it, so a real person is never lost.
  const suspectedBot = typeof body.website === 'string' && body.website.trim() !== '';

  const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;

  // Partner link (?ref=code). The database keeps the first referrer.
  const ref = normalizeRef(body.ref);

  const res = await fetch(`${url}/rest/v1/rpc/dss_subscribe`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_email: email,
      p_plan: plan,
      p_source: typeof body.source === 'string' ? body.source.slice(0, 40) : null,
      p_ref: ref,
      p_suspected_bot: suspectedBot,
      p_consent: CONSENT_TEXT,
      p_user_agent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
      p_email_flag: verdict.flag,
      p_timezone:
        typeof body.timezone === 'string' && /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(body.timezone)
          ? body.timezone.slice(0, 64)
          : null,
    }),
  });

  if (!res.ok) {
    console.error('subscribe: Supabase error', res.status, await res.text());
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 502 });
  }

  // Once daily sending is open, welcome new people right away (after the response goes back).
  if (!suspectedBot && process.env.DSS_DB_GATE) {
    after(async () => {
      try {
        if ((await dailySettings()).send_open) await sendWelcomes(10);
      } catch (e) {
        console.error('subscribe: welcome email', e);
      }
    });
  }

  return NextResponse.json({ ok: true, plan });
}
