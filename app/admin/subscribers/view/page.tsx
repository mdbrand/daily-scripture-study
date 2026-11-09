import type { Metadata } from 'next';
import Link from 'next/link';
import AdminShell, { AdminSignIn, adminEmail } from '../../AdminShell';
import { rpc } from '@/lib/supabaseRpc';
import { gate } from '@/lib/partners';
import { confirmStatus } from '@/lib/lamplighters';

export const metadata: Metadata = { title: 'Subscriber | Morning Lamp', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

type Sub = {
  email: string;
  created_at: string;
  plan_interest: string;
  premium_status: string | null;
  timezone: string | null;
  source: string | null;
  referred_by: string | null;
  unsubscribed_at: string | null;
  suspected_bot: boolean;
  email_flag: string | null;
  welcomed_at: string | null;
  beta_until: string | null;
  admin_note: string | null;
  user_agent: string | null;
  has_premium: boolean;
  studies_received: number;
  last_study: string | null;
  replies: number;
  lamplighter: string | null;
  subscription: { plan: string; status: string; current_period_end: string | null; cancel_at_period_end: boolean } | null;
  founder: boolean;
  partner_code: string | null;
};

const MSG: Record<string, string> = {
  saved: 'Saved.',
  spam: 'Marked as spam: flagged and unsubscribed. They won’t get any more email. You can delete them below.',
};

const when = (d: string | null) =>
  d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Los_Angeles' }) : '–';
const dateOnly = (d: string | null) =>
  d && d !== 'infinity' ? new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }) : '';

export default async function SubscriberView({ searchParams }: { searchParams: Promise<{ email?: string; msg?: string }> }) {
  const admin = await adminEmail();
  if (!admin) return <AdminSignIn next="/admin/subscribers" />;
  const { email = '', msg } = await searchParams;
  const s = email ? await rpc<Sub | null>('dss_admin_subscriber_get', { p_gate: gate(), p_email: email }) : null;

  if (!s) {
    return (
      <AdminShell title="Subscriber" active="/admin/subscribers" email={admin}>
        <p>That subscriber wasn’t found. They may have been deleted.</p>
        <p><Link href="/admin/subscribers">Back to subscribers</Link></p>
      </AdminShell>
    );
  }

  const confirmed = (await confirmStatus([s.email])).confirmed[s.email] === true;
  const paid = s.subscription && ['active', 'trialing', 'past_due'].includes(s.subscription.status);
  const status = s.unsubscribed_at
    ? `Unsubscribed ${when(s.unsubscribed_at)}`
    : s.suspected_bot
      ? 'Flagged as spam or bot'
      : confirmed
        ? 'Active'
        : 'Waiting for email confirmation';

  return (
    <AdminShell title={s.email} active="/admin/subscribers" email={admin}>
      <p className="form-note"><Link href="/admin/subscribers">← All subscribers</Link></p>
      {msg && <p className="partner-notice" role="status">{MSG[msg] ?? msg}</p>}

      <dl className="partner-stats">
        <div><dt>Status</dt><dd style={{ fontSize: 18 }}>{status}</dd></div>
        <div><dt>Edition</dt><dd style={{ fontSize: 18 }}>{s.has_premium ? 'Premium' : 'Free'}</dd></div>
        <div><dt>Joined</dt><dd style={{ fontSize: 18 }}>{when(s.created_at)}</dd></div>
        <div><dt>Studies received</dt><dd>{s.studies_received}</dd></div>
        <div><dt>Replies about their day</dt><dd>{s.replies}</dd></div>
        <div><dt>Came from</dt><dd style={{ fontSize: 18 }}>{[s.source, s.referred_by && `partner ${s.referred_by}`].filter(Boolean).join(', ') || '–'}</dd></div>
      </dl>
      <p className="form-note">
        {s.subscription
          ? `Stripe: ${s.subscription.plan} plan, ${s.subscription.status}${s.subscription.cancel_at_period_end ? ', canceling at period end' : ''}. `
          : ''}
        {s.founder ? 'Founder. ' : ''}
        {s.lamplighter ? `Lamplighter: ${s.lamplighter}. ` : ''}
        {s.beta_until === 'infinity' ? 'Free Premium for life. ' : ''}
        {s.partner_code ? `Partner link: ${s.partner_code}. ` : ''}
        {s.email_flag === 'privacy_relay' ? 'Uses a privacy relay address. ' : ''}
        {s.welcomed_at ? `Welcome email sent ${when(s.welcomed_at)}.` : 'No welcome email yet.'}
      </p>

      <h2>Edit</h2>
      <form action="/api/admin/subscribers" method="post" className="partner-form" style={{ maxWidth: 560 }}>
        <input type="hidden" name="action" value="save" />
        <input type="hidden" name="email" value={s.email} />
        <label htmlFor="new_email">Email</label>
        <input id="new_email" name="new_email" type="email" defaultValue={s.email} />
        <label htmlFor="timezone">Time zone (e.g. America/New_York; blank uses Pacific)</label>
        <input id="timezone" name="timezone" defaultValue={s.timezone ?? ''} />
        <label htmlFor="plan_interest">Chose at sign-up</label>
        <select id="plan_interest" name="plan_interest" defaultValue={s.plan_interest} style={{ fontSize: 17, padding: '12px 10px', borderRadius: 6, border: '1px solid var(--rule)' }}>
          <option value="free">Free</option>
          <option value="premium">Premium</option>
        </select>
        <label className="partner-check">
          <input type="checkbox" name="lifetime" defaultChecked={s.beta_until === 'infinity'} />
          <span>Free Premium for life (Lamplighters)</span>
        </label>
        <label htmlFor="beta_until">Or free Premium until a date (comp). Leave blank for none.</label>
        <input id="beta_until" name="beta_until" type="date" defaultValue={dateOnly(s.beta_until)} />
        <label className="partner-check">
          <input type="checkbox" name="confirmed" defaultChecked={confirmed} />
          <span>Email confirmed (only confirmed people get email)</span>
        </label>
        <label className="partner-check">
          <input type="checkbox" name="unsubscribed" defaultChecked={!!s.unsubscribed_at} />
          <span>Unsubscribed (gets no email)</span>
        </label>
        <label className="partner-check">
          <input type="checkbox" name="suspected_bot" defaultChecked={s.suspected_bot} />
          <span>Flagged as spam or bot (gets no email)</span>
        </label>
        <label htmlFor="admin_note">Private note</label>
        <textarea id="admin_note" name="admin_note" rows={3} defaultValue={s.admin_note ?? ''} style={{ fontFamily: 'var(--ui)', fontSize: 16, padding: 12, border: '1px solid var(--rule)', borderRadius: 6 }} />
        <button type="submit">Save changes</button>
      </form>

      <h2>Spam or not a real person?</h2>
      <p>
        <strong>Mark as spam</strong> stops all email and keeps the record. <strong>Delete</strong> removes them for good.
        {paid ? ' This person has an active paid membership, so cancel it in Stripe before deleting.' : ''}
      </p>
      <form action="/api/admin/subscribers" method="post" style={{ display: 'inline-block', marginRight: 16 }}>
        <input type="hidden" name="action" value="spam" />
        <input type="hidden" name="email" value={s.email} />
        <button type="submit" className="button">Mark as spam</button>
      </form>
      <Link href={`/admin/subscribers/delete?email=${encodeURIComponent(s.email)}`}>Delete…</Link>

      {s.user_agent && <p className="form-note" style={{ marginTop: 32 }}>Signed up from: {s.user_agent}</p>}
    </AdminShell>
  );
}
