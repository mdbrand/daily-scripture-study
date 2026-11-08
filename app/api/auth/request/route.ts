import { NextResponse } from 'next/server';
import { normalizeEmail } from '@/lib/subscribe';
import { newLoginToken } from '@/lib/session';
import { rpc } from '@/lib/supabaseRpc';
import { sendEmail } from '@/lib/email/send';
import { LEGAL } from '@/lib/legal';

export const runtime = 'nodejs';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://morninglamp.study';
const hits = new Map<string, number[]>();

// Emails a one-time sign-in link (valid 30 minutes). Always answers the same way,
// so it never reveals whether an address is subscribed.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail((body as Record<string, unknown>).email);
  if (!email) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });

  const now = Date.now();
  const recent = (hits.get(email) ?? []).filter((t) => now - t < 15 * 60 * 1000);
  if (recent.length >= 3) return NextResponse.json({ ok: true });
  hits.set(email, [...recent, now]);

  const gate = process.env.DSS_DB_GATE;
  if (!gate) return NextResponse.json({ error: 'Sign-in is unavailable right now.' }, { status: 503 });

  const { token, hash } = newLoginToken();
  await rpc('dss_create_login_token', { p_gate: gate, p_email: email, p_token_hash: hash, p_ttl_minutes: 30 });

  const reqOrigin = new URL(req.url).origin;
  const origin = reqOrigin.startsWith('http://localhost') ? reqOrigin : SITE;
  const next = typeof (body as Record<string, unknown>).next === 'string' && String((body as Record<string, unknown>).next).startsWith('/')
    ? String((body as Record<string, unknown>).next)
    : '/partners';
  const link = `${origin}/partners/verify?token=${token}&next=${encodeURIComponent(next)}`;

  try {
    await sendEmail({
      to: email,
      subject: 'Your Morning Lamp sign-in link',
      text: `Tap to sign in to Morning Lamp:\n\n${link}\n\nThis link works once and expires in 30 minutes. If you didn't ask for it, you can ignore this email.`,
      html: `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:24px;color:#24323b">
        <p style="font-size:20px;color:#172b38;margin:0 0 12px">Sign in to ${LEGAL.brand}</p>
        <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">Tap the button to sign in. This link works once and expires in 30 minutes.</p>
        <p style="margin:24px 0"><a href="${link}" style="background:#172b38;color:#faf7f0;padding:13px 24px;border-radius:6px;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold">Sign in</a></p>
        <p style="font-family:Arial,sans-serif;font-size:13px;color:#5b676d">If you didn’t ask for this, you can ignore it.</p></div>`,
    });
  } catch (e) {
    console.error('auth request email', e);
    return NextResponse.json({ error: 'We couldn’t send the email. Please try again.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
