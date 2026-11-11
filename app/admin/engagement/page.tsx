import type { Metadata } from 'next';
import Link from 'next/link';
import AdminShell, { AdminSignIn, adminEmail } from '../AdminShell';
import { rpc } from '@/lib/supabaseRpc';
import { gate } from '@/lib/partners';

export const metadata: Metadata = { title: 'Engagement | Morning Lamp', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

type Counts = Record<'sent' | 'delivered' | 'bounced' | 'complained' | 'opened' | 'apple_only' | 'clicked' | 'readers', number>;
type People = Record<'readers' | 'engaged' | 'apple_readers' | 'mailed' | 'replies' | 'repliers' | 'unsubscribed' | 'season_taps', number>;
type Win = '7d' | '30d' | 'all';
type Engagement = {
  since: string | null;
  windows: Partial<Record<Win, Partial<Record<'study' | 'checkin' | 'welcome' | 'total', Counts>>>>;
  people: Partial<Record<Win, People>>;
  days: { date: string; title: string | null; sent: number; opened: number; apple_only: number; clicked: number }[];
  links: { link: string; clicks: number; people: number }[];
  readers: { email: string; sent: number; opened: number; apple_only: number; clicked: number; replies: number; last_seen: string | null }[];
};

const WINDOWS: { key: Win; label: string }[] = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'all', label: 'All time' },
];
const KINDS = [
  { key: 'study', label: 'Morning study' },
  { key: 'checkin', label: 'Evening check-in' },
  { key: 'welcome', label: 'Welcome email' },
] as const;

const pct = (n: number, of: number) => (of > 0 ? `${Math.round((n / of) * 100)}%` : '–');
// Emails where we can actually tell: everything except the ones only Apple's privacy relay loaded.
const measurable = (c: Counts) => c.sent - c.apple_only;
const openRate = (c: Counts) => pct(c.opened, measurable(c));
const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const when = (t: string | null) =>
  t ? new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' }) : '–';

function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
      {note && <span className="stat-note">{note}</span>}
    </div>
  );
}

export default async function AdminEngagement({ searchParams }: { searchParams: Promise<{ win?: string }> }) {
  const email = await adminEmail();
  if (!email) return <AdminSignIn next="/admin/engagement" />;

  const { win: q } = await searchParams;
  const win: Win = q === '7d' || q === 'all' ? q : '30d';
  const e = await rpc<Engagement>('dss_admin_engagement', { p_gate: gate() });
  const kinds = e.windows[win] ?? {};
  const t = kinds.total;
  const p = e.people[win];
  const hasDelivery = !!t && t.delivered + t.bounced + t.complained > 0;

  return (
    <AdminShell title="Engagement" active="/admin/engagement" email={email}>
      <p className="admin-filters">
        {WINDOWS.map((w) => (
          <Link key={w.key} href={`/admin/engagement?win=${w.key}`} aria-current={w.key === win ? 'page' : undefined}>
            {w.label}
          </Link>
        ))}
      </p>

      {!t ? (
        <p>
          No tracked emails in this period yet. Open and click tracking starts with the next email that goes out
          {e.since ? '' : ' (nothing has been sent since it was switched on)'}. Replies and unsubscribes below are already counted.
        </p>
      ) : (
        <>
          <h2>The numbers</h2>
          <dl className="partner-stats">
            <Stat label="Emails sent" value={t.sent} note={`to ${t.readers} ${t.readers === 1 ? 'reader' : 'readers'}`} />
            <Stat
              label="Open rate (real opens only)"
              value={openRate(t)}
              note={`${t.opened} of ${measurable(t)} emails we can measure`}
            />
            <Stat label="Click rate" value={pct(t.clicked, t.sent)} note={`${t.clicked} of ${t.sent} emails had a link clicked`} />
            <Stat
              label="Clicks per open"
              value={pct(t.clicked, t.opened)}
              note={`${t.clicked} of ${t.opened} opened emails`}
            />
            <Stat
              label="Apple Mail auto-opens (left out)"
              value={t.apple_only}
              note={`${pct(t.apple_only, t.sent)} of emails; can’t tell if they were read`}
            />
            <Stat
              label="Lowest possible open rate"
              value={pct(t.opened, t.sent)}
              note="if nobody on Apple Mail read theirs"
            />
          </dl>
        </>
      )}

      {p && (
        <>
          <h2>Readers</h2>
          <dl className="partner-stats">
            <Stat
              label="Reply rate"
              value={pct(p.repliers, p.mailed)}
              note={`${p.repliers} of ${p.mailed} readers wrote back (${p.replies} ${p.replies === 1 ? 'reply' : 'replies'})`}
            />
            <Stat
              label="Engaged readers"
              value={t ? pct(p.engaged, p.readers) : '–'}
              note={t ? `${p.engaged} of ${p.readers} opened, clicked or replied` : 'starts with the next send'}
            />
            <Stat
              label="Unsubscribe rate"
              value={pct(p.unsubscribed, p.mailed)}
              note={`${p.unsubscribed} of ${p.mailed} readers left`}
            />
            <Stat label="Season taps" value={p.season_taps} note="readers who picked a season" />
            <Stat
              label="Readers on Apple Mail privacy"
              value={t ? p.apple_readers : '–'}
              note="only auto-opens seen, so reading can’t be confirmed"
            />
            {t && (
              <Stat
                label="Delivered"
                value={hasDelivery ? pct(t.delivered, t.sent) : '–'}
                note={hasDelivery ? `${t.bounced} bounced, ${t.complained} marked as spam` : 'delivery reports not switched on yet'}
              />
            )}
          </dl>
        </>
      )}

      {t && (
        <>
          <h2>By email</h2>
          <table className="partner-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Sent</th>
                <th>Opened</th>
                <th>Apple auto-open only</th>
                <th>Open rate</th>
                <th>Clicked</th>
                <th>Click rate</th>
              </tr>
            </thead>
            <tbody>
              {KINDS.map((k) => {
                const c = kinds[k.key];
                if (!c) return null;
                return (
                  <tr key={k.key}>
                    <td>{k.label}</td>
                    <td>{c.sent}</td>
                    <td>{c.opened}</td>
                    <td>{c.apple_only}</td>
                    <td>{openRate(c)}</td>
                    <td>{c.clicked}</td>
                    <td>{pct(c.clicked, c.sent)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {e.days.length > 0 && (
        <>
          <h2>Morning studies, last 14 days</h2>
          <table className="partner-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Study</th>
                <th>Sent</th>
                <th>Opened</th>
                <th>Apple auto-open only</th>
                <th>Open rate</th>
                <th>Clicked</th>
              </tr>
            </thead>
            <tbody>
              {e.days.map((d) => (
                <tr key={d.date}>
                  <td style={{ whiteSpace: 'nowrap' }}>{day(d.date)}</td>
                  <td>
                    <Link href={`/admin/studies?date=${d.date}`}>{d.title || 'Study'}</Link>
                  </td>
                  <td>{d.sent}</td>
                  <td>{d.opened}</td>
                  <td>{d.apple_only}</td>
                  <td>{pct(d.opened, d.sent - d.apple_only)}</td>
                  <td>{d.clicked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {e.links.length > 0 && (
        <>
          <h2>Most-clicked links, last 30 days</h2>
          <table className="partner-table">
            <thead>
              <tr>
                <th>Link</th>
                <th>Clicks</th>
                <th>Readers</th>
              </tr>
            </thead>
            <tbody>
              {e.links.map((l) => (
                <tr key={l.link}>
                  <td style={{ wordBreak: 'break-word' }}>{l.link}</td>
                  <td>{l.clicks}</td>
                  <td>{l.people}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {e.readers.length > 0 && (
        <>
          <h2>Reader by reader (since tracking began)</h2>
          <table className="partner-table">
            <thead>
              <tr>
                <th>Reader</th>
                <th>Emails</th>
                <th>Opened</th>
                <th>Apple auto-open only</th>
                <th>Clicked</th>
                <th>Replies</th>
                <th>Last active</th>
              </tr>
            </thead>
            <tbody>
              {e.readers.map((r) => (
                <tr key={r.email}>
                  <td style={{ wordBreak: 'break-word' }}>
                    <Link href={`/admin/subscribers/view?email=${encodeURIComponent(r.email)}`}>{r.email}</Link>
                  </td>
                  <td>{r.sent}</td>
                  <td>{r.opened}</td>
                  <td>{r.apple_only}</td>
                  <td>{r.clicked}</td>
                  <td>{r.replies}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{when(r.last_seen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2>How to read this</h2>
      <ul>
        <li>
          <strong>Opened</strong> means a real mail app loaded the email, or the reader clicked a link in it. Apple Mail
          loads every email by itself the moment it arrives, read or not, so those are counted separately and left out
          of the open rate.
        </li>
        <li>
          <strong>Open rate</strong> is opens divided by the emails we can measure (everything except Apple auto-opens).
          The “lowest possible” figure assumes not one Apple Mail reader opened theirs, so the truth sits between the two.
        </li>
        <li>
          <strong>Clicks and replies</strong> are the firmest numbers here: a person has to do them. Link-checking
          robots that tap every link at once are left out.
        </li>
        <li>Preview and test copies sent from the admin are never counted.</li>
        {e.since && <li>Open and click tracking began {when(e.since)}. Emails sent before then have replies only.</li>}
      </ul>
    </AdminShell>
  );
}
