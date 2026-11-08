import type { Metadata } from 'next';
import Link from 'next/link';
import LegalShell from '../LegalShell';
import { getSessionEmail } from '@/lib/session';
import { getPartnerProfile, isPremium, money, PAYOUT_MIN_CENTS, type PartnerProfile } from '@/lib/partners';
import { CopyLink, JoinForm, SignInForm } from './PartnerForms';

export const metadata: Metadata = {
  title: 'Partners | Morning Lamp',
  description: 'Share Morning Lamp and earn 30% of every Premium payment from people you refer.',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const SITE = 'https://morninglamp.study';

const notices: Record<string, string> = {
  invalid: 'That sign-in link isn’t valid. Request a new one below.',
  expired: 'That sign-in link has expired or was already used. Request a new one below.',
  ready: 'Payouts are set up. Earned commissions will be sent to your bank on the 1st of each month.',
  pending: 'Stripe still needs a few details before payouts can go out. You can finish anytime.',
  error: 'We couldn’t reach Stripe just now. Please try again in a minute.',
  soon: 'Payout setup opens soon. Your commissions are tracked in the meantime and will be waiting for you.',
};

function sourceLabel(s: string) {
  return s === 'founder' ? 'Founders membership' : 'Premium subscription';
}

function date(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ signin?: string; payouts?: string }>;
}) {
  const { signin, payouts } = await searchParams;
  const email = await getSessionEmail();
  const notice = notices[signin ?? ''] || notices[payouts ?? ''];

  if (!email) {
    return (
      <LegalShell
        title="Morning Lamp partners"
        intro={
          <p className="legal-lede">
            Premium members can share Morning Lamp and earn 30% of every payment from the people they
            refer, for as long as those people stay subscribed.
          </p>
        }
      >
        {notice && <p className="partner-notice" role="status">{notice}</p>}
        <h2>Sign in</h2>
        <p>Use the email address your Morning Lamp membership is under. We’ll send you a one-time link.</p>
        <SignInForm />
        <p className="form-note">
          Not a member yet? <Link href="/#premium">See Premium</Link>.
        </p>
      </LegalShell>
    );
  }

  let profile: PartnerProfile;
  try {
    profile = await getPartnerProfile(email);
  } catch (e) {
    console.error('partner profile', e);
    return (
      <LegalShell title="Partners">
        <p>We couldn’t load your partner account just now. Please refresh in a minute.</p>
      </LegalShell>
    );
  }

  const signOut = (
    <form action="/api/auth/logout" method="post" className="partner-signout">
      <span>Signed in as {email}</span>
      <button type="submit" className="link-button">Sign out</button>
    </form>
  );

  if (!profile.partner) {
    if (!isPremium(profile.premium_status)) {
      return (
        <LegalShell title="Partners">
          {signOut}
          <p>
            The partner program is for Premium members. Once your Premium membership is active, come back here
            to get your link.
          </p>
          <p>
            <Link className="button" href="/#premium">See Premium</Link>
          </p>
        </LegalShell>
      );
    }
    const suggested = email.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24);
    return (
      <LegalShell
        title="Become a partner"
        intro={
          <p className="legal-lede">
            Share your link. When someone you refer pays for Premium, you earn 30% of what they pay, every
            month or year they stay. Commissions become payable 30 days after each payment and are paid to
            your bank on the 1st of the month.
          </p>
        }
      >
        {signOut}
        <JoinForm suggested={suggested.length >= 3 ? suggested : ''} />
      </LegalShell>
    );
  }

  const p = profile.partner;
  const s = profile.stats!;
  const url = `${SITE}/?ref=${p.code}`;

  return (
    <LegalShell title="Your partner dashboard">
      {signOut}
      {notice && <p className="partner-notice" role="status">{notice}</p>}
      {p.status !== 'active' && (
        <p className="partner-notice" role="status">
          Your partner account is paused. Write to hello@morninglamp.study if you have questions.
        </p>
      )}

      <h2>Your link</h2>
      <CopyLink url={url} />
      <p className="form-note">
        When you share it, say that you earn a commission. Something as simple as “I get a small commission if
        you join” is enough.
      </p>

      <h2>So far</h2>
      <dl className="partner-stats">
        <div><dt>Visits</dt><dd>{s.clicks}</dd></div>
        <div><dt>Free sign-ups</dt><dd>{s.signups}</dd></div>
        <div><dt>Paying members</dt><dd>{s.paying}</dd></div>
        <div><dt>Waiting 30 days</dt><dd>{money(s.pending_cents)}</dd></div>
        <div><dt>Ready to pay</dt><dd>{money(s.earned_cents)}</dd></div>
        <div><dt>Paid to you</dt><dd>{money(s.paid_cents)}</dd></div>
      </dl>

      <h2>Payouts</h2>
      {p.payouts_enabled ? (
        <p>
          Payouts go to your bank through Stripe on the 1st of each month once you have at least{' '}
          {money(PAYOUT_MIN_CENTS)} ready. Smaller balances roll over to the next month.
        </p>
      ) : (
        <p>
          We pay partners through Stripe. Add your bank details once (Stripe asks for your name, address, and
          the last 4 digits of your SSN for tax reporting) and payouts will start automatically.
        </p>
      )}
      <form action="/api/partners/connect" method="post">
        <button type="submit" className="button">
          {p.payouts_enabled ? 'Open my Stripe payouts' : p.stripe_account_id ? 'Finish payout setup' : 'Set up payouts'}
        </button>
      </form>

      <h2>Recent commissions</h2>
      {profile.recent && profile.recent.length > 0 ? (
        <table className="partner-table">
          <thead>
            <tr><th>Date</th><th>From</th><th>Commission</th><th>Status</th></tr>
          </thead>
          <tbody>
            {profile.recent.map((r, i) => (
              <tr key={i}>
                <td>{date(r.created_at)}</td>
                <td>{sourceLabel(r.source)}</td>
                <td>{money(r.commission_cents)}</td>
                <td>
                  {r.status === 'pending'
                    ? `Ready ${date(r.earn_after)}`
                    : r.status === 'earned'
                      ? 'Ready to pay'
                      : r.status === 'paid'
                        ? 'Paid'
                        : 'Voided'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No commissions yet. Share your link with someone who would enjoy a few quiet minutes in Scripture.</p>
      )}
    </LegalShell>
  );
}
