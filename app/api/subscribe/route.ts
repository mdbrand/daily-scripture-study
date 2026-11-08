import { NextResponse } from 'next/server';
import { CONSENT_TEXT, normalizeEmail, normalizePlan, normalizeRef } from '@/lib/subscribe';

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
    }),
  });

  if (!res.ok) {
    console.error('subscribe: Supabase error', res.status, await res.text());
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, plan });
}
