import type { Metadata } from 'next';
import Link from 'next/link';
import LegalShell from '../../LegalShell';
import { LEGAL } from '@/lib/legal';
import TrackOnce from '../../TrackOnce';
import { GIFTS, giftKey } from '@/lib/gifts';

// The printable plan they asked for when they signed up, handed over the moment they confirm.
function GiftBox({ gift }: { gift: keyof typeof GIFTS }) {
  const g = GIFTS[gift];
  return (
    <div className="gift-box">
      <p className="gift-title">Your {g.name} is ready.</p>
      <p>{g.about} Print as many copies as you like.</p>
      <a className="button" href={g.href} target="_blank" rel="noopener">
        Open my plan (PDF)
      </a>
    </div>
  );
}

export const metadata: Metadata = { title: 'Confirm your email | Morning Lamp', robots: { index: false, follow: false } };

export default async function Confirm({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string; founding?: string; gift?: string }>;
}) {
  const { token } = await params;
  const { done, founding, gift: rawGift } = await searchParams;
  const gift = giftKey(rawGift);

  if (done === '1' && founding !== undefined) {
    const n = Number(founding);
    return (
      <LegalShell title="Welcome, Founding Lamplighter.">
        <TrackOnce event="email_confirmed" params={{ method: 'email', lamplighter: 'founding' }} onceKey={`confirm_${token}`} />
        {gift && <GiftBox gift={gift} />}
        <p>
          You’re in{Number.isFinite(n) && n > 0 ? `, and you’re Founding Lamplighter #${n}` : ''}. Premium is on for you,
          free, for life.
        </p>
        <p>
          Your study arrives each morning at 5 AM your time. Around 8 PM we’ll check in to ask how your day went; reply
          with a line, and the next morning brings Last Night’s Lamp, a short study written for your day.
        </p>
        <p className="form-note" style={{ textAlign: 'left' }}>
          A welcome email is on its way. If you don’t see it, check Promotions or Spam and move it to your inbox.
        </p>
      </LegalShell>
    );
  }
  if (done === '1') {
    return (
      <LegalShell title="You’re in.">
        <TrackOnce event="email_confirmed" params={{ method: 'email' }} onceKey={`confirm_${token}`} />
        {gift && <GiftBox gift={gift} />}
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
      <LegalShell title={gift ? 'You’re already confirmed' : 'That link didn’t work'}>
        {gift && <GiftBox gift={gift} />}
        <p>
          It may be old or already used. <Link href="/">Sign up again</Link> to get a fresh link, or write to{' '}
          <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
        </p>
      </LegalShell>
    );
  }
  return (
    <LegalShell title="Confirm your email">
      <p>
        {gift
          ? `One tap and your ${GIFTS[gift].name} opens. Your free daily study also starts at 5 AM your time.`
          : 'One tap and you’re set. Your free daily study arrives at 5 AM your time.'}
      </p>
      <form action={`/api/confirm/${token}${gift ? `?gift=${gift}` : ''}`} method="post">
        <button type="submit" className="button">{gift ? 'Confirm and open my plan' : 'Confirm my email'}</button>
      </form>
    </LegalShell>
  );
}
