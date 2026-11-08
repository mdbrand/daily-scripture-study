import { NextResponse } from 'next/server';
import { dailySettings, generateStudy, getStudy, pacificDate, sendDue } from '@/lib/daily';
import { anthropicKey } from '@/lib/studyWriter';
import { sendEmail } from '@/lib/email/send';

export const runtime = 'nodejs';
export const maxDuration = 300;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://morninglamp.study';

// Every hour (Vercel Cron, see vercel.json): send the study to everyone for whom it's now 5 AM.
// Does nothing until sending is switched on (dss_config.daily_send_open = 'true').
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const settings = await dailySettings();
  if (!settings.send_open) return NextResponse.json({ ok: true, skipped: 'sending is not switched on' });

  const today = pacificDate(0);
  try {
    // Safety net: if yesterday's writing failed, try again before anyone's 5 AM passes.
    if (anthropicKey() && !(await getStudy(today))) await generateStudy(today).catch((e) => console.error('fallback writer', e));
    const result = await sendDue();
    if (!result.done) await alert(`The ${new Date().toISOString().slice(11, 13)}:00 UTC send didn’t finish: ${result.reason}. Sent ${result.sent}.`);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('daily send', e);
    await alert(`Sending failed: ${msg.slice(0, 300)}`);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

async function alert(message: string) {
  const admins = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!admins.length) return;
  await sendEmail({
    to: admins,
    subject: 'Morning Lamp: problem with today’s send',
    html: `<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">${message.replace(/</g, '&lt;')}</p><p><a href="${SITE}/admin/studies">Open the study review page</a></p>`,
    text: `${message}\n\n${SITE}/admin/studies`,
  }).catch(() => {});
}
