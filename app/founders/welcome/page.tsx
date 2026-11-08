import type { Metadata } from 'next';
import Link from 'next/link';
import LegalShell from '../../LegalShell';
import { stripe } from '@/lib/stripe';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Welcome, Founder | Morning Lamp',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

type Session = {
  payment_status: string;
  amount_total: number;
  customer_details?: { email?: string };
  metadata?: Record<string, string>;
};

async function loadSession(id: string | undefined): Promise<Session | null> {
  if (!id || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return null;
  try {
    return await stripe<Session>('GET', `/checkout/sessions/${id}`);
  } catch {
    return null;
  }
}

export default async function FoundersWelcome({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const session = await loadSession(session_id);
  const paid = session?.payment_status === 'paid' && session.metadata?.kind === 'founder';

  if (!paid) {
    return (
      <LegalShell title="We couldn’t confirm that payment">
        <p>
          If you just paid, it can take a moment to confirm. Check your email for a receipt from Stripe,
          or write to us at <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> and we’ll sort it out.
        </p>
        <p>
          <Link href="/#founders">Back to the Founders Membership</Link>
        </p>
      </LegalShell>
    );
  }

  const email = session!.customer_details?.email ?? session!.metadata?.email;
  return (
    <LegalShell title="Welcome, Founder.">
      <div className="contact-card">
        <p className="contact-lede">
          Thank you. Your Founders Membership is confirmed: lifetime Morning Lamp Premium for a single
          payment of ${Math.round(session!.amount_total / 100)}.
        </p>
        <p>
          A receipt from Stripe is on its way to <strong>{email}</strong>. Your free daily study starts
          now, and Premium begins the day it launches. We’ll email you before then.
        </p>
      </div>
      <h2>While you wait</h2>
      <ul>
        <li>Reply to any Morning Lamp email with a Bible question. As a Founder you can ask two a day.</li>
        <li>
          Know someone who would love this? <Link href="/partners">Join the partner program</Link> and
          earn 30% on everyone you refer.
        </li>
        <li>
          Questions about your membership? Just email{' '}
          <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
        </li>
      </ul>
    </LegalShell>
  );
}
