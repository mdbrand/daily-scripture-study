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

// A number card. With href, the whole card is clickable and opens the list behind the number.
function Stat({ label, value, href }: { label: string; value: React.ReactNode; href?: string }) {
  return (
    <div className={href ? 'stat-link' : undefined}>
      <dt>{href ? <Link href={href}>{label}</Link> : label}</dt>
      <dd>{value}</dd>
      {href && <span className="stat-go" aria-hidden="true">See who</span>}
    </div>
  );
}
const list = (filter: string) => `/admin/subscribers?filter=${filter}`;

type FunnelRow = Record<
  'signups' | 'confirmed' | 'premium' | 'got_checkin' | 'replied' | 'engaged' | 'eligible_7d' | 'kept_7d' | 'eligible_30d' | 'kept_30d',
  number
>;
type Funnel = { recent?: FunnelRow; all?: FunnelRow };

const GA4_URL = 'https://analytics.google.com/analytics/web/#/a17591468p563191583/reports/intelligenthome';

// "12 (75%)" where the percent is of the stage before; blank when there's nothing to compare yet.
function step(n: number | undefined, of: number | undefined) {
  if (n === undefined) return '–';
  if (!of) return String(n);
  return `${n} (${Math.round((n / of) * 100)}%)`;
}
function kept(k: number | undefined, eligible: number | undefined) {
  if (!eligible) return 'Not yet';
  return `${k ?? 0} of ${eligible} (${Math.round(((k ?? 0) / eligible) * 100)}%)`;
}

// Sign-up funnel: where people drop off between landing and sticking around.
function FunnelTable({ f }: { f: Funnel }) {
  const rows: { label: string; cell: (r?: FunnelRow) => string }[] = [
    { label: 'Signed up', cell: (r) => step(r?.signups, undefined) },
    { label: 'Confirmed their email', cell: (r) => step(r?.confirmed, r?.signups) },
    { label: 'Have Premium (Lamplighters + paid)', cell: (r) => step(r?.premium, r?.confirmed) },
    { label: 'Got an evening check-in', cell: (r) => step(r?.got_checkin, r?.premium) },
    { label: 'Replied to a check-in', cell: (r) => step(r?.replied, r?.got_checkin) },
    { label: 'Replied or tapped a season', cell: (r) => step(r?.engaged, r?.got_checkin) },
    { label: 'Still subscribed after 7 days', cell: (r) => kept(r?.kept_7d, r?.eligible_7d) },
    { label: 'Still subscribed after 30 days', cell: (r) => kept(r?.kept_30d, r?.eligible_30d) },
  ];
  return (
    <table className="partner-table funnel-table">
      <thead>
        <tr>
          <th>Stage</th>
          <th>Signed up in last 30 days</th>
          <th>Everyone</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Visitors</td>
          <td colSpan={2}>
            In GA4 (<a href={GA4_URL} target="_blank" rel="noopener">open reports</a>). Sign-ups by page: event{' '}
            <code>sign_up</code>, by <code>form_location</code>.
          </td>
        </tr>
        {rows.map((row) => (
          <tr key={row.label}>
            <td>{row.label}</td>
            <td>{row.cell(f.recent)}</td>
            <td>{row.cell(f.all)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function AdminHome() {
  const email = await adminEmail();
  if (!email) return <AdminSignIn next="/admin" />;

  const [o, lamplighters, today, tomorrow, funnel] = await Promise.all([
    rpc<Overview>('dss_admin_overview', { p_gate: gate() }),
    rpc<number>('dss_admin_lamplighter_count', { p_gate: gate() }),
    getStudy(pacificDate(0)),
    getStudy(pacificDate(1)),
    rpc<Funnel>('dss_admin_funnel', { p_gate: gate() }).catch(() => ({}) as Funnel),
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
        <Stat label="Getting email" value={s.mailable} href={list('getting')} />
        <Stat label="New today" value={s.new_today} href={list('today')} />
        <Stat label="New this week" value={s.new_7d} href={list('week')} />
        <Stat label="New in 30 days" value={s.new_30d} href={list('month')} />
        <Stat label="Unsubscribed" value={s.unsubscribed} href={list('unsubscribed')} />
        <Stat label="Chose Premium at sign-up" value={s.wanted_premium} href={list('chose_premium')} />
        <Stat label="Came from a partner" value={s.referred} href={list('partner')} />
        <Stat label="Flagged (bot or relay)" value={s.flagged_bot + s.privacy_relay} href={list('flagged')} />
      </dl>
      {o.signups_by_day.length > 0 && (
        <p className="form-note">
          Last 14 days: {o.signups_by_day.map((d) => `${d.day.slice(5)}: ${d.n}`).join(' · ')}
        </p>
      )}

      <h2>Sign-up funnel</h2>
      <p className="form-note" style={{ textAlign: 'left' }}>
        Each percent is of the stage above it. Retention counts confirmed readers old enough to measure.
      </p>
      <FunnelTable f={funnel} />

      <h2>Premium</h2>
      <dl className="partner-stats">
        <Stat label="Lamplighters (free for life)" value={lamplighters} href={list('lamplighters')} />
        <Stat label="Monthly ($7)" value={p.monthly} href={list('monthly')} />
        <Stat label="Yearly ($47)" value={p.yearly} href={list('yearly')} />
        <Stat label="Monthly revenue (est.)" value={money(mrr)} href={list('paid')} />
        <Stat label="Canceling at period end" value={p.canceling} href={list('canceling')} />
        <Stat label="Payment failing" value={p.past_due} href={list('past_due')} />
        <Stat label="Founders (lifetime)" value={p.founders} href={list('founders')} />
      </dl>

      <h2>Daily studies</h2>
      <dl className="partner-stats">
        <Stat label="Daily sending" value={o.sending.open ? 'On' : 'Off'} href="/admin/studies" />
        <Stat label="Emails sent, last 7 days" value={o.sending.sent_7d} href="/admin/studies" />
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
        <Stat label="Waiting 30 days" value={money(o.partners.pending_cents)} href="/admin/partners" />
        <Stat label="Ready to pay" value={money(o.partners.earned_cents)} href="/admin/partners" />
        <Stat label="Paid out" value={money(o.partners.paid_cents)} href="/admin/partners" />
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
