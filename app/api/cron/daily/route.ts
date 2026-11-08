import { NextResponse } from 'next/server';
import { rpc } from '@/lib/supabaseRpc';
import { stripe } from '@/lib/stripe';
import { sendEmail } from '@/lib/email/send';
import { gate, money, PAYOUT_MIN_CENTS } from '@/lib/partners';
import { dailySettings, generateStudy, getStudy, pacificDate, sendWelcomes } from '@/lib/daily';
import { anthropicKey } from '@/lib/studyWriter';
import { sendWeeklyFeedback } from '@/lib/lamplighters';

export const runtime = 'nodejs';
export const maxDuration = 300;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://morninglamp.study';

type Batch = { code: string; email: string; stripe_account_id: string; amount_cents: number; commission_ids: string[] };
type ListRow = {
  code: string;
  email: string;
  status: string;
  payouts_enabled: boolean;
  clicks: number;
  signups: number;
  pending_cents: number;
  earned_cents: number;
  paid_cents: number;
};
type PayoutResult = { code: string; email: string; amount_cents: number; transfer_id: string | null; error: string | null };

// Runs every morning (Vercel Cron, see vercel.json).
// Daily: commissions older than 30 days move from "pending" to "earned".
// On the 1st (UTC): pay earned balances of $25+ to partners through Stripe Connect,
// email each partner their monthly statement, and email the admin a summary.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const now = new Date();
  const monthly = now.getUTCDate() === 1 || url.searchParams.get('run') === 'monthly';
  const period = now.toISOString().slice(0, 7); // e.g. 2026-12

  const matured = await rpc<number>('dss_mature_commissions', { p_gate: gate() });
  const studies = await studyChores();
  if (!monthly) return NextResponse.json({ ok: true, matured, ...studies });

  // 1. Payouts
  const batch = await rpc<Batch[]>('dss_payout_batch', { p_gate: gate(), p_min_cents: PAYOUT_MIN_CENTS });
  const payouts: PayoutResult[] = [];
  for (const b of batch) {
    let transferId: string | null = null;
    let error: string | null = null;
    try {
      const t = await stripe<{ id: string }>(
        'POST',
        '/transfers',
        {
          amount: b.amount_cents,
          currency: 'usd',
          destination: b.stripe_account_id,
          description: `Morning Lamp partner commissions (${period})`,
          transfer_group: `ml-partners-${period}`,
          metadata: { app: 'morning-lamp', partner_code: b.code, period, commissions: String(b.commission_ids.length) },
        },
        `ml-payout-${b.code}-${period}`,
      );
      transferId = t.id;
    } catch (e) {
      error = e instanceof Error ? e.message.slice(0, 500) : String(e);
    }
    await rpc('dss_record_payout', {
      p_gate: gate(),
      p_code: b.code,
      p_commission_ids: b.commission_ids,
      p_amount_cents: b.amount_cents,
      p_transfer_id: transferId,
      p_error: error,
    });
    payouts.push({ code: b.code, email: b.email, amount_cents: b.amount_cents, transfer_id: transferId, error });
  }

  // 2. Partner statements
  const partners = await rpc<ListRow[]>('dss_partner_list', { p_gate: gate() });
  const monthName = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  let statements = 0;
  for (const p of partners) {
    if (p.status !== 'active') continue;
    const paid = payouts.find((x) => x.code === p.code && x.transfer_id);
    const hasActivity = p.pending_cents + p.earned_cents + p.paid_cents > 0 || p.signups > 0;
    if (!hasActivity) continue;
    try {
      await sendEmail({ to: p.email, ...statementEmail(p, paid?.amount_cents ?? 0, monthName) });
      statements++;
    } catch (e) {
      console.error('partner statement', p.code, e);
    }
  }

  // 3. Admin summary
  const admins = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (admins.length) {
    try {
      await sendEmail({ to: admins, ...adminEmail(monthName, matured, payouts, partners) });
    } catch (e) {
      console.error('admin summary', e);
    }
  }

  return NextResponse.json({
    ok: true,
    matured,
    ...studies,
    payouts: payouts.map(({ code, amount_cents, transfer_id, error }) => ({ code, amount_cents, paid: !!transfer_id, error })),
    statements,
  });
}

function shell(inner: string, why = 'You’re getting this because you’re a Morning Lamp partner.') {
  return `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;color:#24323b">${inner}
  <p style="font-family:Arial,sans-serif;font-size:12px;color:#5b676d;margin-top:32px">Morning Lamp · Mission Driven Brand, LLC · ${why}</p></div>`;
}

function row(label: string, value: string) {
  return `<tr><td style="padding:8px 0;border-bottom:1px solid #ddd0b9;font-family:Arial,sans-serif;font-size:15px">${label}</td><td style="padding:8px 0;border-bottom:1px solid #ddd0b9;font-family:Arial,sans-serif;font-size:15px;text-align:right"><strong>${value}</strong></td></tr>`;
}

function statementEmail(p: ListRow, paidNow: number, monthName: string) {
  const rollover =
    p.earned_cents > 0
      ? p.payouts_enabled
        ? `Your ${money(p.earned_cents)} ready to pay is under the ${money(PAYOUT_MIN_CENTS)} minimum, so it rolls over to next month.`
        : `You have ${money(p.earned_cents)} ready to pay. Set up payouts on your dashboard so we can send it.`
      : '';
  const html = shell(`
    <p style="font-size:22px;color:#172b38;margin:0 0 12px">Your ${monthName} partner statement</p>
    <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">${
      paidNow > 0
        ? `We sent <strong>${money(paidNow)}</strong> to your bank through Stripe today. It usually arrives in 2–3 business days.`
        : 'No payout went out this month.'
    } ${rollover}</p>
    <table style="width:100%;border-collapse:collapse;margin:18px 0">
      ${row('Visits to your link', String(p.clicks))}
      ${row('Free sign-ups', String(p.signups))}
      ${row('Waiting 30 days', money(p.pending_cents))}
      ${row('Ready to pay', money(p.earned_cents))}
      ${row('Paid to you, all time', money(p.paid_cents))}
    </table>
    <p style="margin:24px 0"><a href="${SITE}/partners" style="background:#172b38;color:#faf7f0;padding:13px 24px;border-radius:6px;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold">Open your dashboard</a></p>
    <p style="font-family:Arial,sans-serif;font-size:14px;color:#5b676d">Thank you for sharing Morning Lamp.</p>`);
  const text = `Your ${monthName} partner statement\n\n${
    paidNow > 0 ? `We sent ${money(paidNow)} to your bank through Stripe today.` : 'No payout went out this month.'
  } ${rollover}\n\nVisits: ${p.clicks}\nFree sign-ups: ${p.signups}\nWaiting 30 days: ${money(p.pending_cents)}\nReady to pay: ${money(
    p.earned_cents,
  )}\nPaid to you, all time: ${money(p.paid_cents)}\n\nDashboard: ${SITE}/partners`;
  return { subject: `Your Morning Lamp partner statement for ${monthName}`, html, text };
}

function adminEmail(monthName: string, matured: number, payouts: PayoutResult[], partners: ListRow[]) {
  const sent = payouts.filter((p) => p.transfer_id);
  const failed = payouts.filter((p) => !p.transfer_id);
  const total = sent.reduce((n, p) => n + p.amount_cents, 0);
  const pending = partners.reduce((n, p) => n + p.pending_cents, 0);
  const earned = partners.reduce((n, p) => n + p.earned_cents, 0);
  const lines = payouts
    .map((p) => `${p.code}: ${money(p.amount_cents)} ${p.transfer_id ? `paid (${p.transfer_id})` : `FAILED: ${p.error}`}`)
    .join('\n');
  const html = shell(`
    <p style="font-size:22px;color:#172b38;margin:0 0 12px">Partner payouts for ${monthName}</p>
    <table style="width:100%;border-collapse:collapse;margin:18px 0">
      ${row('Partners', String(partners.length))}
      ${row('Commissions matured today', String(matured))}
      ${row('Payouts sent', `${sent.length} (${money(total)})`)}
      ${row('Payouts failed', String(failed.length))}
      ${row('Still waiting 30 days', money(pending))}
      ${row('Ready but not paid (under minimum or no bank)', money(earned))}
    </table>
    ${lines ? `<pre style="font-family:Menlo,monospace;font-size:13px;white-space:pre-wrap">${lines.replace(/</g, '&lt;')}</pre>` : ''}
    <p style="font-family:Arial,sans-serif;font-size:15px"><a href="${SITE}/admin/partners">Open the partner report</a></p>`);
  return {
    subject: `Morning Lamp partner payouts: ${money(total)} sent${failed.length ? `, ${failed.length} failed` : ''}`,
    html,
    text: `Partner payouts for ${monthName}\nSent: ${sent.length} (${money(total)})\nFailed: ${failed.length}\n\n${lines}\n\n${SITE}/admin/partners`,
  };
}

function adminList() {
  return (process.env.ADMIN_EMAILS || '').split(',').map((x) => x.trim()).filter(Boolean);
}

// Writes tomorrow's study (so there's a day to review it), emails the admins a preview link,
// and, once sending is open, welcomes anyone who joined since yesterday.
async function studyChores() {
  const tomorrow = pacificDate(1);
  const out: { study: string; welcomed?: number; lamplighterFeedback?: number } = { study: 'exists' };
  const admins = adminList();
  if (!anthropicKey()) out.study = 'skipped: no Anthropic API key is set';
  else try {
    if (!(await getStudy(tomorrow))) {
      const c = await generateStudy(tomorrow);
      out.study = 'written';
      if (admins.length) {
        await sendEmail({
          to: admins,
          subject: `Tomorrow’s Morning Lamp: ${c.title}`,
          html: shell(`<p style="font-size:22px;color:#172b38;margin:0 0 8px">${esc(c.title)}</p>
            <p style="font-family:Arial,sans-serif;font-size:15px;color:#5b676d;margin:0 0 16px">${esc(c.passage.ref)} · ${esc(c.pillar)}</p>
            <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">It goes out automatically tomorrow morning. Please read it over and check the Scripture wording. If anything is off, put it on hold from the review page.</p>
            <p style="margin:24px 0"><a href="${SITE}/admin/studies?date=${tomorrow}" style="background:#172b38;color:#faf7f0;padding:13px 24px;border-radius:6px;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold">Review tomorrow’s study</a></p>`, 'Sent to Morning Lamp admins.'),
          text: `${c.title}\n${c.passage.ref}\n\nReview it: ${SITE}/admin/studies?date=${tomorrow}`,
        });
      }
    }
  } catch (e) {
    out.study = 'failed';
    console.error('study writer', e);
    if (admins.length) {
      await sendEmail({
        to: admins,
        subject: 'Morning Lamp: tomorrow’s study could not be written',
        html: shell(`<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">The study for ${tomorrow} failed to generate. The send job will try once more before sending. Error: ${esc(String(e instanceof Error ? e.message : e).slice(0, 300))}</p>
          <p><a href="${SITE}/admin/studies?date=${tomorrow}">Open the review page</a></p>`, 'Sent to Morning Lamp admins.'),
      }).catch(() => {});
    }
  }
  try {
    if ((await dailySettings()).send_open) {
      out.welcomed = await sendWelcomes(100);
      // Fridays (Pacific): one short feedback question to active Lamplighters.
      const weekday = new Date(`${pacificDate(0)}T12:00:00Z`).getUTCDay();
      if (weekday === 5) out.lamplighterFeedback = await sendWeeklyFeedback();
    }
  } catch (e) {
    console.error('welcomes / lamplighter feedback', e);
  }
  return out;
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
