import type { Metadata } from 'next';
import Link from 'next/link';
import LegalShell from '../../LegalShell';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = { title: 'Unsubscribe | Morning Lamp', robots: { index: false, follow: false } };

export default async function Unsubscribe({
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
      <LegalShell title="You’re unsubscribed">
        <p>You won’t get any more Morning Lamp emails. Thank you for reading with us.</p>
        <p>
          If you have a Premium membership, unsubscribing doesn’t cancel it. To cancel billing, write to{' '}
          <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
        </p>
        <p>
          Changed your mind? <Link href="/">Sign up again</Link> anytime.
        </p>
      </LegalShell>
    );
  }
  if (done === '0') {
    return (
      <LegalShell title="We couldn’t find that subscription">
        <p>
          This unsubscribe link may be out of date. Write to <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> and
          we’ll remove you by hand.
        </p>
      </LegalShell>
    );
  }

  return (
    <LegalShell title="Unsubscribe from Morning Lamp?">
      <p>You’ll stop getting the daily study and all other Morning Lamp emails.</p>
      <form action={`/api/unsubscribe/${token}`} method="post">
        <input type="hidden" name="from" value="page" />
        <button type="submit" className="button">Unsubscribe</button>
      </form>
      <p className="form-note">
        <Link href="/">Keep my subscription</Link>
      </p>
    </LegalShell>
  );
}
