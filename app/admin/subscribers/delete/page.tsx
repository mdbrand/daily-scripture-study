import type { Metadata } from 'next';
import Link from 'next/link';
import AdminShell, { AdminSignIn, adminEmail } from '../../AdminShell';

export const metadata: Metadata = { title: 'Delete subscribers | Morning Lamp', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

// Confirm step before deleting one or more subscribers for good.
export default async function ConfirmDelete({ searchParams }: { searchParams: Promise<{ email?: string | string[] }> }) {
  const admin = await adminEmail();
  if (!admin) return <AdminSignIn next="/admin/subscribers" />;
  const { email } = await searchParams;
  const emails = (Array.isArray(email) ? email : email ? [email] : []).filter(Boolean).slice(0, 200);

  return (
    <AdminShell title="Delete subscribers" active="/admin/subscribers" email={admin}>
      {emails.length === 0 ? (
        <p>
          Nothing selected. <Link href="/admin/subscribers">Back to subscribers</Link>
        </p>
      ) : (
        <>
          <p>
            Delete {emails.length === 1 ? 'this person' : `these ${emails.length} people`} for good? This removes them from
            the list, along with their study history, replies, and any Lamplighter application.{' '}
            <strong>It can’t be undone.</strong> Anyone with an active paid membership is skipped; cancel them in Stripe
            first.
          </p>
          <ul>
            {emails.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <form action="/api/admin/subscribers" method="post">
            <input type="hidden" name="action" value="delete" />
            {emails.map((e) => (
              <input key={e} type="hidden" name="email" value={e} />
            ))}
            <button type="submit" className="button" style={{ background: '#8a2a1f' }}>
              Delete {emails.length === 1 ? 'permanently' : `${emails.length} permanently`}
            </button>{' '}
            <Link href="/admin/subscribers" style={{ marginLeft: 16 }}>Cancel</Link>
          </form>
        </>
      )}
    </AdminShell>
  );
}
