import { after, NextResponse } from 'next/server';
import { CONSENT_TEXT, normalizeEmail } from '@/lib/subscribe';
import { checkEmail } from '@/lib/emailCheck';
import { suggestEmail } from '@/lib/emailTypos';
import { rpc } from '@/lib/supabaseRpc';
import { sendEmail } from '@/lib/email/send';
import { lamplighterStats } from '@/lib/lamplighters';
import { looksLikeBot, signupAllowed, tooFast } from '@/lib/spam';
import { sendConfirmation } from '@/lib/confirm';

export const runtime = 'nodejs';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://morninglamp.study';

// Lamplighter application: email + one line on why. Also joins the free daily list.
export async function POST(req: Request) {
  if (await looksLikeBot()) return NextResponse.json({ ok: true, status: 'applied' });
  if (!(await signupAllowed(req, 'lamplighter'))) {
    return NextResponse.json({ error: 'Too many tries. Please wait a few minutes.' }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  // Bot traps: the hidden field, or submitted faster than a person can type.
  if ((typeof body.website === 'string' && body.website.trim()) || tooFast(body.t)) return NextResponse.json({ ok: true, status: 'applied' });
  const email = normalizeEmail(body.email);
  if (!email) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  const why = typeof body.why === 'string' ? body.why.trim().slice(0, 500) : '';
  if (why.length < 3) return NextResponse.json({ error: 'Tell us in a line why you’d like to join.' }, { status: 400 });

  const verdict = await checkEmail(email);
  if (!verdict.ok) {
    return NextResponse.json(
      { error: verdict.message, suggestion: verdict.reason === 'no_mail_server' ? suggestEmail(email) : null },
      { status: 422 },
    );
  }
  const stats = await lamplighterStats();
  if (!stats.open) return NextResponse.json({ error: 'All Lamplighter spots are taken. You can still join the free daily study.' }, { status: 409 });

  const tz = typeof body.timezone === 'string' && /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(body.timezone) ? body.timezone : null;
  const result = await rpc<{ ok: boolean; status: string }>('dss_lamplighter_apply', {
    p_email: email,
    p_why: why,
    p_timezone: tz,
    p_user_agent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
    p_consent: CONSENT_TEXT,
  });

  if (result.status === 'applied') {
    after(async () => {
      try {
        await sendConfirmation(email, { lamplighter: true, origin: new URL(req.url).origin });
        const admins = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean);
        if (admins.length) {
          const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          await sendEmail({
            to: admins,
            subject: `New Lamplighter application: ${email}`,
            replyTo: email,
            html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6"><p><strong>${esc(email)}</strong> applied to be a Lamplighter.</p><blockquote style="border-left:3px solid #a8834a;margin:0;padding:4px 14px">${esc(why)}</blockquote><p><a href="${SITE}/admin/lamplighters">Review applications</a> (${stats.left} spots left)</p></div>`,
            text: `${email} applied to be a Lamplighter.\n\n${why}\n\nReview: ${SITE}/admin/lamplighters`,
          });
        }
      } catch (e) {
        console.error('lamplighter emails', e);
      }
    });
  }
  return NextResponse.json({ ok: true, status: result.status });
}
