import { after, NextResponse } from 'next/server';
import { handleReply, senderAddress } from '@/lib/reflections';
import { recordReply, recordWebhook } from '@/lib/emailEvents';
import { verifyResendWebhook } from '@/lib/webhookVerify';
import { LEGAL } from '@/lib/legal';

export const runtime = 'nodejs';
export const maxDuration = 120;

type ReceivedEvent = { type: string; data: { email_id: string; from: string; to: string[]; subject: string } };

const FROM_US = /@morninglamp\.study\b/i;

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Resend calls this when mail arrives at @morninglamp.study. We relay it to the owner's inbox,
// with Reply-To set to the original sender so replies go straight back to them.
// It also sends delivery news (delivered, bounced, marked as spam) for emails we sent, which we keep
// for the admin engagement page.
export async function POST(req: Request) {
  const body = await req.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const key = process.env.RESEND_API_KEY || process.env.Resend_API_Key;
  const forwardTo = process.env.DSS_FORWARD_TO;
  if (!secret || !key || !forwardTo) {
    console.error('inbound: missing RESEND_WEBHOOK_SECRET, RESEND_API_KEY, or DSS_FORWARD_TO');
    return NextResponse.json({ error: 'not configured' }, { status: 503 });
  }
  if (!verifyResendWebhook(body, req.headers, secret)) {
    return NextResponse.json({ error: 'bad signature' }, { status: 401 });
  }

  const event = JSON.parse(body) as ReceivedEvent;
  if (event.type !== 'email.received') {
    // The Resend account is shared with other sites; only our own emails are looked up.
    const ours = FROM_US.test(event.data?.from || '');
    const saved = ours ? await recordWebhook(event.type, event.data?.email_id, req.headers.get('svix-id')) : false;
    return NextResponse.json({ ok: true, type: event.type, saved });
  }

  const H = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const got = await fetch(`https://api.resend.com/emails/receiving/${event.data.email_id}`, { headers: H });
  if (!got.ok) {
    console.error('inbound: could not load email', got.status, await got.text());
    return NextResponse.json({ error: 'load failed' }, { status: 502 });
  }
  const email = (await got.json()) as {
    from: string;
    to: string[];
    subject: string | null;
    html: string | null;
    text: string | null;
    reply_to: string[] | null;
  };

  const sender = email.reply_to?.[0] || email.from;
  const banner = `From: ${email.from}\nTo: ${email.to.join(', ')}\n\n`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { ...H, 'Idempotency-Key': `inbound-${event.data.email_id}` },
    body: JSON.stringify({
      from: `${LEGAL.brand} Inbox <${LEGAL.email}>`,
      to: forwardTo.split(',').map((s) => s.trim()),
      reply_to: sender,
      subject: `[Morning Lamp] ${email.subject || '(no subject)'}`,
      text: banner + (email.text || ''),
      html: email.html
        ? `<p style="font-family:Arial,sans-serif;font-size:13px;color:#5b676d;border-bottom:1px solid #ddd;padding-bottom:8px;margin-bottom:16px;">From: ${escapeHtml(email.from)}<br>To: ${escapeHtml(email.to.join(', '))}</p>${email.html}`
        : undefined,
    }),
  });
  if (!res.ok) {
    console.error('inbound: forward failed', res.status, await res.text());
    return NextResponse.json({ error: 'forward failed' }, { status: 502 });
  }
  // A Premium reader's note about their day becomes tomorrow's "Yesterday" reflection.
  after(async () => {
    // Any note back from a subscriber counts as a reply on the engagement page.
    await recordReply(senderAddress(sender), `reply-${event.data.email_id}`);
    try {
      const r = await handleReply(sender, email.text);
      if (r.handled) console.log('inbound: reflection', r);
    } catch (e) {
      console.error('inbound: reflection', e);
    }
  });
  return NextResponse.json({ ok: true });
}
