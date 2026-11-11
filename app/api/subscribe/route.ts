import { after, NextResponse } from 'next/server';
import { looksLikeBot, signupAllowed, tooFast } from '@/lib/spam';
import { sendConfirmation } from '@/lib/confirm';
import { CONSENT_TEXT, normalizeEmail, normalizePlan, normalizeRef } from '@/lib/subscribe';
import { checkEmail } from '@/lib/emailCheck';
import { giftKey } from '@/lib/gifts';
import { suggestEmail } from '@/lib/emailTypos';
import { clean, cleanUtm, geoFromHeaders, isNewSubscriber, sendSignupAlert } from '@/lib/signupAlert';

export const runtime = 'nodejs';

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

  // Spam layer 1: Vercel BotID. Bots get a normal-looking reply and nothing is saved.
  if (await looksLikeBot()) return NextResponse.json({ ok: true, plan });
  // Spam layer 2: rate limits shared across all servers.
  if (!(await signupAllowed(req, 'subscribe'))) {
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
  // Spam layer 3: the hidden field, and forms submitted faster than a person can type.
  const suspectedBot = (typeof body.website === 'string' && body.website.trim() !== '') || tooFast(body.t);

  const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;

  // Partner link (?ref=code). The database keeps the first referrer.
  const ref = normalizeRef(body.ref);

  // dss_subscribe() returns nothing, so ask first whether this address is already on the list.
  // Real (non-flagged) first-time signups only; any failure just means no alert.
  const notify = !suspectedBot && (await isNewSubscriber(email));

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

  // Spam layer 4: confirm-your-email. Nothing else is sent until they tap the link.
  if (!suspectedBot && process.env.DSS_DB_GATE) {
    after(async () => {
      try {
        await sendConfirmation(email, { origin: new URL(req.url).origin, gift: giftKey(body.gift) });
      } catch (e) {
        console.error('subscribe: confirmation email', e);
      }
    });
  }

  // Owner alert for a brand-new, saved signup. Errors are caught inside; never affects the signup.
  if (notify) {
    const alert = {
      email,
      plan,
      formLocation: clean(body.source, 40),
      pageUrl: clean(body.page),
      referrer: clean(body.referrer),
      ref,
      utm: cleanUtm(body.utm),
      timezone: clean(body.timezone, 64),
      emailFlag: verdict.flag ?? null,
      geo: geoFromHeaders(req.headers),
      at: new Date(),
    };
    after(() => sendSignupAlert(alert));
  }

  return NextResponse.json({ ok: true, plan });
}
