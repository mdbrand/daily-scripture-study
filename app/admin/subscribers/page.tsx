import type { Metadata } from 'next';
import Link from 'next/link';
import AdminShell, { AdminSignIn, adminEmail } from '../AdminShell';
import { rpc } from '@/lib/supabaseRpc';
import { gate } from '@/lib/partners';

export const metadata: Metadata = { title: 'Subscribers | Morning Lamp', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const PAGE = 100;
const FILTERS = [
  { key: 'all', label: 'Everyone' },
  { key: 'free', label: 'Free' },
  { key: 'premium', label: 'Premium' },
  { key: 'unsubscribed', label: 'Unsubscribed' },
  { key: 'flagged', label: 'Flagged' },
];

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
  studies_received: number;
};

const PREMIUM: Record<string, string> = { founder: 'Founder', monthly: 'Monthly', yearly: 'Yearly', past_due: 'Payment failing', canceled: 'Canceled' };

function date(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' });
}

function status(r: Row) {
  if (r.unsubscribed_at) return `Unsubscribed ${date(r.unsubscribed_at)}`;
  if (r.suspected_bot) return 'Flagged: likely bot';
  if (r.email_flag === 'privacy_relay') return 'Active (privacy relay address)';
  return 'Active';
}

export default async function Subscribers({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; page?: string; deleted?: string; blocked?: string; msg?: string }> }) {
  const email = await adminEmail();
  if (!email) return <AdminSignIn next="/admin/subscribers" />;

  const { q = '', filter = 'all', page = '1', deleted, blocked, msg } = await searchParams;
  const f = FILTERS.some((x) => x.key === filter) ? filter : 'all';
  const n = Math.max(1, parseInt(page, 10) || 1);
  const data = await rpc<{ total: number; rows: Row[] }>('dss_admin_subscribers', {
    p_gate: gate(),
    p_search: q,
    p_filter: f,
    p_limit: PAGE,
    p_offset: (n - 1) * PAGE,
  });
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
      <p className="form-note">
        {data.total} {data.total === 1 ? 'person' : 'people'}
        {q ? ` matching “${q}”` : ''}. Newest first.
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
                <th>Email</th><th>Joined</th><th>Premium</th><th>Status</th><th>Time zone</th><th>From</th><th>Studies</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.email}>
                  <td><input type="checkbox" name="email" value={r.email} aria-label={`Select ${r.email}`} /></td>
                  <td><Link href={`/admin/subscribers/view?email=${encodeURIComponent(r.email)}`}>{r.email}</Link></td>
                  <td>{date(r.created_at)}</td>
                  <td>{r.premium_status ? PREMIUM[r.premium_status] ?? r.premium_status : r.plan_interest === 'premium' ? 'Interested' : 'Free'}</td>
                  <td>{status(r)}</td>
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
