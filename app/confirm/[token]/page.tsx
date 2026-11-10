import type { Metadata } from 'next';
import Link from 'next/link';
import LegalShell from '../../LegalShell';
import { LEGAL } from '@/lib/legal';
import TrackOnce from '../../TrackOnce';

export const metadata: Metadata = { title: 'Confirm your email | Morning Lamp', robots: { index: false, follow: false } };

export default async function Confirm({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { token } = await params;
  const { done } = await searchParams;

  if (done === '1') {
    return (
      <LegalShell title="You’re in.">
        <TrackOnce event="email_confirmed" params={{ method: 'email' }} onceKey={`confirm_${token}`} />
        <p>Your email is confirmed. Your first study arrives at 5 AM your time.</p>
        <p className="form-note" style={{ textAlign: 'left' }}>
          If you don’t see it, check your Promotions or Spam folder and move it to your inbox, so the rest find you.
        </p>
        <p>
          <Link href="/#premium">See what Premium adds</Link>
        </p>
      </LegalShell>
    );
  }
  if (done === '0') {
    return (
      <LegalShell title="That link didn’t work">
        <p>
          It may be old or already used. <Link href="/">Sign up again</Link> to get a fresh link, or write to{' '}
          <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
        </p>
      </LegalShell>
    );
  }
  return (
    <LegalShell title="Confirm your email">
      <p>One tap and you’re set. Your free daily study arrives at 5 AM your time.</p>
      <form action={`/api/confirm/${token}`} method="post">
        <button type="submit" className="button">Confirm my email</button>
      </form>
    </LegalShell>
  );
}
