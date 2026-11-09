import type { Metadata } from 'next';
import Link from 'next/link';
import AdminShell, { AdminSignIn, adminEmail } from '../AdminShell';
import { rpc } from '@/lib/supabaseRpc';
import { gate } from '@/lib/partners';
import { confirmStatus } from '@/lib/lamplighters';

export const metadata: Metadata = { title: 'Subscribers | Morning Lamp', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const PAGE = 100;
// Chips shown above the list; every Overview card links to one of LABELS.
const FILTERS = [
  { key: 'all', label: 'Everyone' },
  { key: 'getting', label: 'Getting email' },
  { key: 'free', label: 'Free' },
  { key: 'premium', label: 'Premium' },
  { key: 'lamplighters', label: 'Lamplighters' },
  { key: 'unconfirmed', label: 'Not confirmed yet' },
  { key: 'unsubscribed', label: 'Unsubscribed' },
  { key: 'flagged', label: 'Flagged' },
];
const LABELS: Record<string, string> = {
  ...Object.fromEntries(FILTERS.map((x) => [x.key, x.label])),
  today: 'New today',
  week: 'New this week',
  month: 'New in the last 30 days',
  chose_premium: 'Chose Premium at sign-up',
  partner: 'Came from a partner',
  monthly: 'Monthly Premium ($7)',
  yearly: 'Yearly Premium ($47)',
  paid: 'Paying for Premium',
  canceling: 'Canceling at period end',
  past_due: 'Payment failing',
  founders: 'Founders (lifetime)',
};

type Row = {
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
  lamplighter: string | null;
  studies_received: number;
};

const PREMIUM: Record<string, string> = { founder: 'Founder', monthly: 'Monthly', yearly: 'Yearly', past_due: 'Payment failing', canceled: 'Canceled' };

function date(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' });
}

// Type: Lamplighter (free Premium for life), a paid plan, comped Premium until a date, or Free.
function type(r: Row) {
  if (r.lamplighter === 'accepted') return 'Lamplighter';
  if (r.premium_status) return PREMIUM[r.premium_status] ?? r.premium_status;
  if (r.beta_until && r.beta_until !== 'infinity' && new Date(r.beta_until) > new Date()) return `Premium until ${date(r.beta_until)}`;
  return 'Free';
}

function status(r: Row) {
  if (r.unsubscribed_at) return `Unsubscribed ${date(r.unsubscribed_at)}`;
  if (r.suspected_bot) return 'Flagged: likely bot';
  if (r.email_flag === 'privacy_relay') return 'Active (privacy relay address)';
  return 'Active';
}

export default async function Subscribers({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; page?: string; deleted?: string; blocked?: string; msg?: string; addmsg?: string; added?: string; existing?: string; invited?: string; skipped?: string }> }) {
  const email = await adminEmail();
  if (!email) return <AdminSignIn next="/admin/subscribers" />;

  const { q = '', filter = 'all', page = '1', deleted, blocked, msg, addmsg, added = '0', existing = '0', invited = '0', skipped } = await searchParams;
  const f = filter in LABELS ? filter : 'all';
  const n = Math.max(1, parseInt(page, 10) || 1);
  const data = await rpc<{ total: number; rows: Row[] }>('dss_admin_subscribers', {
    p_gate: gate(),
    p_search: q,
    p_filter: f,
    p_limit: PAGE,
    p_offset: (n - 1) * PAGE,
  });
  const conf = await confirmStatus(data.rows.map((r) => r.email));
  const pages = Math.max(1, Math.ceil(data.total / PAGE));
  const link = (o: { filter?: string; page?: number }) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    const ff = o.filter ?? f;
    if (ff !== 'all') sp.set('filter', ff);
    if ((o.page ?? 1) > 1) sp.set('page', String(o.page));
    const s = sp.toString();
    return `/admin/subscribers${s ? `?${s}` : ''}`;
  };

  return (
    <AdminShell title="Subscribers" active="/admin/subscribers" email={email}>
      {deleted && (
        <p className="partner-notice" role="status">
          Deleted {deleted} {deleted === '1' ? 'subscriber' : 'subscribers'}.
          {blocked ? ` Skipped (active paid membership, cancel in Stripe first): ${blocked.split(',').join(', ')}.` : ''}
        </p>
      )}
      {msg === 'error' && <p className="partner-notice" role="alert">That didn’t work. Please try again.</p>}
      {addmsg === 'none' && <p className="partner-notice" role="alert">No email addresses found in what you pasted.</p>}
      {(addmsg === 'start' || addmsg === 'invite') && (
        <p className="partner-notice" role="status">
          Added {added} new {added === '1' ? 'person' : 'people'}
          {existing !== '0' ? `, updated ${existing} already on the list` : ''}.{' '}
          {addmsg === 'start'
            ? 'They’ll get the daily study starting with the next 5 AM send.'
            : `Sent ${invited} confirm ${invited === '1' ? 'invite' : 'invites'}. They’ll start once they tap “Yes, start my daily study.”`}
          {skipped ? ` Skipped: ${skipped}.` : ''}
        </p>
      )}
      <details className="admin-add" open={!!addmsg && addmsg !== 'start' && addmsg !== 'invite'}>
        <summary>Add people</summary>
        <form action="/api/admin/subscribers" method="post" className="partner-form" style={{ maxWidth: 620 }}>
          <input type="hidden" name="action" value="add" />
          <label htmlFor="add-emails">Email addresses (one per line, or separated by commas)</label>
          <textarea
            id="add-emails"
            name="emails"
            rows={4}
            required
            placeholder={'friend@example.com\nmom@example.com'}
            style={{ fontFamily: 'var(--ui)', fontSize: 16, padding: 12, border: '1px solid var(--rule)', borderRadius: 6 }}
          />
          <label htmlFor="add-tz">Time zone (optional, e.g. America/New_York; blank uses Pacific)</label>
          <input id="add-tz" name="timezone" />
          <label className="partner-check">
            <input type="checkbox" name="premium" />
            <span>Make them Lamplighters (Premium free for life)</span>
          </label>
          <p className="admin-add-buttons">
            <button type="submit" name="mode" value="invite">Send confirm invite</button>
            <button type="submit" name="mode" value="start" className="button-secondary">Start them right away</button>
          </p>
          <p className="form-note">
            <strong>Send confirm invite</strong> emails them “Rob signed you up for Morning Lamp” with a button; nothing else
            arrives until they tap it. <strong>Start them right away</strong> skips that step, so only use it for people who
            already told you they want it. People who unsubscribed before are never re-added.
          </p>
        </form>
      </details>
      <form className="partner-row" action="/admin/subscribers" method="get">
        <input name="q" defaultValue={q} placeholder="Search by email" aria-label="Search by email" />
        {f !== 'all' && <input type="hidden" name="filter" value={f} />}
        <button type="submit">Search</button>
      </form>
      <p className="admin-filters">
        {FILTERS.map((x) => (
          <Link key={x.key} href={link({ filter: x.key })} aria-current={x.key === f ? 'page' : undefined}>
            {x.label}
          </Link>
        ))}
      </p>
      {!FILTERS.some((x) => x.key === f) && (
        <p className="partner-notice" role="status">
          Showing: <strong>{LABELS[f]}</strong>. <Link href={link({ filter: 'all' })}>Show everyone</Link>
        </p>
      )}
      <p className="form-note">
        {data.total} {data.total === 1 ? 'person' : 'people'}
        {q ? ` matching “${q}”` : ''}. Newest first. {conf.unconfirmed_total} still need to confirm their email before they get anything.
      </p>
      {data.rows.length === 0 ? (
        <p>No one matches that.</p>
      ) : (
        <form action="/admin/subscribers/delete" method="get">
        <div style={{ overflowX: 'auto' }}>
          <table className="partner-table">
            <thead>
              <tr>
                <th><span className="sr-only">Select</span></th>
                <th>Email</th><th>Joined</th><th>Type</th><th>Status</th><th>Time zone</th><th>From</th><th>Studies</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.email}>
                  <td><input type="checkbox" name="email" value={r.email} aria-label={`Select ${r.email}`} /></td>
                  <td><Link href={`/admin/subscribers/view?email=${encodeURIComponent(r.email)}`}>{r.email}</Link></td>
                  <td>{date(r.created_at)}</td>
                  <td>{type(r)}</td>
                  <td>{!r.unsubscribed_at && !r.suspected_bot && conf.confirmed[r.email] === false ? 'Waiting for email confirmation' : status(r)}</td>
                  <td>{r.timezone ?? 'Pacific (default)'}</td>
                  <td>{[r.source, r.referred_by && `partner: ${r.referred_by}`].filter(Boolean).join(', ') || '–'}</td>
                  <td>{r.studies_received}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 16 }}>
          <button type="submit" className="link-button">Delete selected…</button>
          <span className="form-note"> You’ll confirm on the next screen. Click an email to edit that person or mark them as spam.</span>
        </p>
        </form>
      )}
      {pages > 1 && (
        <p className="form-note">
          {n > 1 && <Link href={link({ page: n - 1 })}>Previous</Link>} Page {n} of {pages}{' '}
          {n < pages && <Link href={link({ page: n + 1 })}>Next</Link>}
        </p>
      )}
    </AdminShell>
  );
}
