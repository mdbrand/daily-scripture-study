import type { Metadata } from 'next';
import AdminShell, { AdminSignIn, adminEmail } from '../AdminShell';
import { lamplighterStats, listApplications } from '@/lib/lamplighters';

export const metadata: Metadata = { title: 'Lamplighters | Morning Lamp', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const messages: Record<string, string> = {
  accepted: 'Accepted. They have 90 days of free Premium and a welcome email is on its way.',
  declined: 'Declined. They stay on the free daily study; no email is sent.',
  full: 'All spots are taken. Raise the number of spots to accept more.',
  error: 'That didn’t work. Try again in a minute.',
};

const date = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' });

function Decide({ email }: { email: string }) {
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      <form action="/api/admin/lamplighters" method="post" style={{ display: 'inline' }}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="action" value="accept" />
        <button type="submit" className="button" style={{ padding: '6px 14px', fontSize: 14 }}>Accept</button>
      </form>{' '}
      <form action="/api/admin/lamplighters" method="post" style={{ display: 'inline' }}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="action" value="decline" />
        <button type="submit" className="link-button">Decline</button>
      </form>
    </span>
  );
}

export default async function Lamplighters({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const email = await adminEmail();
  if (!email) return <AdminSignIn next="/admin/lamplighters" />;
  const { msg } = await searchParams;
  const [stats, apps] = await Promise.all([lamplighterStats(), listApplications()]);
  const waiting = apps.filter((a) => a.status === 'applied');

  return (
    <AdminShell title="Lamplighters" active="/admin/lamplighters" email={email}>
      {msg && messages[msg] && <p className="partner-notice" role="status">{messages[msg]}</p>}
      <dl className="partner-stats">
        <div><dt>Spots</dt><dd>{stats.spots}</dd></div>
        <div><dt>Accepted</dt><dd>{stats.accepted}</dd></div>
        <div><dt>Spots left</dt><dd>{stats.left}</dd></div>
        <div><dt>Waiting for review</dt><dd>{waiting.length}</dd></div>
      </dl>
      <p className="form-note">
        Accepted Lamplighters get Premium free for 90 days (Last Night’s Lamp and the evening check-in), plus one short
        feedback question each Friday. Their replies come to your inbox. The number of spots is the
        <code> lamplighter_spots</code> setting in the database; ask to change it.
      </p>
      {apps.length === 0 ? (
        <p>No applications yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="partner-table">
            <thead>
              <tr><th>Email</th><th>Why they want in</th><th>Applied</th><th>Status</th></tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.email}>
                  <td>{a.email}</td>
                  <td style={{ maxWidth: 360 }}>{a.why}</td>
                  <td>{date(a.created_at)}</td>
                  <td>
                    {a.status === 'applied' ? (
                      <Decide email={a.email} />
                    ) : a.status === 'accepted' ? (
                      `Accepted${a.beta_until ? `, Premium until ${date(a.beta_until)}` : ''}`
                    ) : (
                      'Declined'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
