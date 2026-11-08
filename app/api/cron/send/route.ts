import { NextResponse } from 'next/server';
import { dailySettings, generateStudy, getStudy, pacificDate, sendStudy } from '@/lib/daily';
import { sendEmail } from '@/lib/email/send';

export const runtime = 'nodejs';
export const maxDuration = 300;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://morninglamp.study';

// Early each morning (Vercel Cron, see vercel.json): send today's study to every subscriber.
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
    if (!(await getStudy(today))) await generateStudy(today); // yesterday's attempt failed; try once more
    const result = await sendStudy(today);
    if (!result.done) await alert(`Today’s study (${today}) did not finish sending: ${result.reason}. Sent ${result.sent}.`);
    return NextResponse.json({ ok: true, date: today, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('daily send', e);
    await alert(`Today’s study (${today}) failed to send: ${msg.slice(0, 300)}`);
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
