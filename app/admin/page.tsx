import type { Metadata } from 'next';
import Link from 'next/link';
import AdminShell, { AdminSignIn, adminEmail } from './AdminShell';
import { rpc } from '@/lib/supabaseRpc';
import { gate, money } from '@/lib/partners';
import { getStudy, pacificDate, postalAddress } from '@/lib/daily';
import { PLANS } from '@/lib/plans';

export const metadata: Metadata = { title: 'Admin | Morning Lamp', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

type Overview = {
  subscribers: Record<'total' | 'mailable' | 'unsubscribed' | 'flagged_bot' | 'privacy_relay' | 'new_today' | 'new_7d' | 'new_30d' | 'wanted_premium' | 'referred', number>;
  premium: Record<'monthly' | 'yearly' | 'canceling' | 'past_due' | 'canceled' | 'founders', number>;
  partners: { count: number; pending_cents: number; earned_cents: number; paid_cents: number };
  sending: { open: boolean; sent_7d: number };
  sources: { label: string; n: number }[];
  timezones: { label: string; n: number }[];
  signups_by_day: { day: string; n: number }[];
};

function Stat({ label, value, href }: { label: string; value: React.ReactNode; href?: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{href ? <Link href={href}>{value}</Link> : value}</dd>
    </div>
  );
}

export default async function AdminHome() {
  const email = await adminEmail();
  if (!email) return <AdminSignIn next="/admin" />;

  const [o, today, tomorrow] = await Promise.all([
    rpc<Overview>('dss_admin_overview', { p_gate: gate() }),
    getStudy(pacificDate(0)),
    getStudy(pacificDate(1)),
  ]);
  const s = o.subscribers;
  const p = o.premium;
  const mrr = p.monthly * PLANS.monthly.cents + Math.round((p.yearly * PLANS.yearly.cents) / 12);
  const studyLine = (st: typeof today) =>
    st ? `${st.content.title} (${st.status === 'held' ? 'on hold' : st.sent_count ? `sent to ${st.sent_count}` : 'ready'})` : 'Not written yet';

  return (
    <AdminShell title="Overview" active="/admin" email={email}>
      <h2>Subscribers</h2>
      <dl className="partner-stats">
        <Stat label="Total sign-ups" value={s.total} href="/admin/subscribers" />
        <Stat label="Getting email" value={s.mailable} />
        <Stat label="New today" value={s.new_today} />
        <Stat label="New this week" value={s.new_7d} />
        <Stat label="New in 30 days" value={s.new_30d} />
        <Stat label="Unsubscribed" value={s.unsubscribed} href="/admin/subscribers?filter=unsubscribed" />
        <Stat label="Chose Premium at sign-up" value={s.wanted_premium} />
        <Stat label="Came from a partner" value={s.referred} />
        <Stat label="Flagged (bot or relay)" value={s.flagged_bot + s.privacy_relay} href="/admin/subscribers?filter=flagged" />
      </dl>
      {o.signups_by_day.length > 0 && (
        <p className="form-note">
          Last 14 days: {o.signups_by_day.map((d) => `${d.day.slice(5)}: ${d.n}`).join(' · ')}
        </p>
      )}

      <h2>Premium</h2>
      <dl className="partner-stats">
        <Stat label="Monthly ($7)" value={p.monthly} href="/admin/subscribers?filter=premium" />
        <Stat label="Yearly ($47)" value={p.yearly} href="/admin/subscribers?filter=premium" />
        <Stat label="Monthly revenue (est.)" value={money(mrr)} />
        <Stat label="Canceling at period end" value={p.canceling} />
        <Stat label="Payment failing" value={p.past_due} />
        <Stat label="Founders (lifetime)" value={p.founders} />
      </dl>

      <h2>Daily studies</h2>
      <dl className="partner-stats">
        <Stat label="Daily sending" value={o.sending.open ? 'On' : 'Off'} href="/admin/studies" />
        <Stat label="Emails sent, last 7 days" value={o.sending.sent_7d} />
        <Stat label="Mailing address" value={postalAddress() ? 'Set' : 'Missing'} />
      </dl>
      <p>
        <strong>Today:</strong> <Link href={`/admin/studies?date=${pacificDate(0)}`}>{studyLine(today)}</Link>
        <br />
        <strong>Tomorrow:</strong> <Link href={`/admin/studies?date=${pacificDate(1)}`}>{studyLine(tomorrow)}</Link>
      </p>

      <h2>Partners</h2>
      <dl className="partner-stats">
        <Stat label="Partners" value={o.partners.count} href="/admin/partners" />
        <Stat label="Waiting 30 days" value={money(o.partners.pending_cents)} />
        <Stat label="Ready to pay" value={money(o.partners.earned_cents)} />
        <Stat label="Paid out" value={money(o.partners.paid_cents)} />
      </dl>

      <h2>Where sign-ups come from</h2>
      <div className="admin-two">
        <table className="partner-table">
          <thead><tr><th>Form</th><th>Sign-ups</th></tr></thead>
          <tbody>{o.sources.map((r) => <tr key={r.label}><td>{r.label}</td><td>{r.n}</td></tr>)}</tbody>
        </table>
        <table className="partner-table">
          <thead><tr><th>Time zone</th><th>Sign-ups</th></tr></thead>
          <tbody>{o.timezones.map((r) => <tr key={r.label}><td>{r.label}</td><td>{r.n}</td></tr>)}</tbody>
        </table>
      </div>
    </AdminShell>
  );
}
