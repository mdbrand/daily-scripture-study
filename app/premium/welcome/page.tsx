import type { Metadata } from 'next';
import Link from 'next/link';
import LegalShell from '../../LegalShell';
import { stripe } from '@/lib/stripe';
import { LEGAL } from '@/lib/legal';
import TrackOnce from '../../TrackOnce';

export const metadata: Metadata = {
  title: 'Welcome to Premium | Morning Lamp',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

type Session = {
  status: string;
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

export default async function PremiumWelcome({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const s = await loadSession(session_id);
  const ok = s?.status === 'complete' && s.metadata?.kind === 'premium';

  if (!ok) {
    return (
      <LegalShell title="We couldn’t confirm that subscription">
        <p>
          If you just subscribed, it can take a moment to confirm. Check your email for a receipt from
          Stripe, or write to us at <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
        </p>
        <p>
          <Link href="/#pricing">Back to Premium pricing</Link>
        </p>
      </LegalShell>
    );
  }

  const yearly = s!.metadata?.plan === 'yearly';
  const email = s!.customer_details?.email ?? s!.metadata?.email;
  return (
    <LegalShell title="Welcome to Premium.">
      <TrackOnce
        event="purchase"
        onceKey={`purchase_${session_id}`}
        params={{
          transaction_id: session_id,
          currency: 'USD',
          value: s!.amount_total / 100,
          items: [{ item_id: `premium_${yearly ? 'yearly' : 'monthly'}`, item_name: `Premium ${yearly ? 'yearly' : 'monthly'}`, price: s!.amount_total / 100, quantity: 1 }],
        }}
      />
      <div className="contact-card">
        <p className="contact-lede">
          Thank you. Your {yearly ? 'yearly' : 'monthly'} Premium membership is active:{' '}
          {yearly ? '$47 a year' : '$7 a month'}.
        </p>
        <p>
          A receipt from Stripe is on its way to <strong>{email}</strong>. Your Premium emails will
          come from {LEGAL.email.replace('hello@', 'study@')}.
        </p>
      </div>
      <h2>What happens next</h2>
      <ul>
        <li>Reply to any study with a line or two about your day. The next morning, your email includes a short study written for what you shared.</li>
        <li>Reply to any Morning Lamp email with a Bible question, one a day.</li>
        <li>
          Know someone who would love this? <Link href="/partners">Join the partner program</Link> and earn
          30% of every payment from friends who subscribe.
        </li>
        <li>
          You can cancel anytime; your plan stays active until the end of the period you paid for. Email{' '}
          <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> with any questions.
        </li>
      </ul>
    </LegalShell>
  );
}
