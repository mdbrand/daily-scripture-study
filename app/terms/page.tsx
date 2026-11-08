import type { Metadata } from 'next';
import Link from 'next/link';
import LegalShell from '../LegalShell';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Terms & Conditions | Morning Lamp',
  description: 'The terms for using Morning Lamp, Premium, and the partner program.',
  alternates: { canonical: '/terms' },
};

const mail = <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>;

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms & Conditions"
      intro={
        <p className="legal-meta">
          Effective {LEGAL.effective}. These terms are an agreement between you and {LEGAL.company}{' '}
          (“we,” “us”), which operates {LEGAL.brand}. By signing up for or using Morning Lamp, you
          agree to them and to our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      }
    >
      <h2>1. What Morning Lamp is</h2>
      <p>
        Morning Lamp is a daily Bible study delivered by email. The free edition is a study sent to
        all subscribers. Premium is a paid edition with content written for your life. The partner
        program lets Premium members earn commissions for referring others to Premium. Some Premium
        and partner features are still being released; we may add, change, or retire features over
        time.
      </p>

      <h2>2. Who can use it</h2>
      <p>
        You must be at least 13 years old to subscribe. If you are under 18, you need a parent or
        guardian’s permission, and a parent or guardian must handle any paid subscription. You agree
        to give us a real email address you control.
      </p>

      <h2>3. Premium subscriptions</h2>
      <ul>
        <li>
          Premium costs $7 per month (US dollars, plus any applicable tax), billed through Stripe, and
          renews automatically each month until you cancel.
        </li>
        <li>
          You can cancel anytime. Cancellation takes effect at the end of your current billing
          month, and you keep Premium until then.
        </li>
        <li>
          Payments are non-refundable for partial months, except where the law requires a refund. If
          you were charged in error, contact us and we will make it right.
        </li>
        <li>
          If we change the price, we will tell you by email at least 30 days before it applies to
          you. Any price we promised to lock in for you, such as a founding-member price, will be
          honored as described when you joined.
        </li>
        <li>Joining the Premium early-access list does not charge you anything.</li>
      </ul>

      <h2>4. Bible questions</h2>
      <p>
        Subscribers may ask Bible questions by replying to our emails: up to one question per day on
        the free edition and two per day on Premium. We may answer extra questions on a later day,
        combine similar questions, or decline questions that are abusive or outside the purpose of
        Morning Lamp.
      </p>

      <h2>5. Important: what our content is and isn’t</h2>
      <p>
        Morning Lamp is a Bible study companion for education and encouragement. Scripture is our
        authority, and we work to cite real sources, but our studies and answers may contain errors
        and are not a replacement for your church, a pastor, or professional advice. Nothing we send
        is medical, mental health, legal, or financial advice. Some content is prepared with the help
        of artificial intelligence.
      </p>
      <p>
        <strong>If you are in crisis</strong> or thinking about harming yourself, call or text 988
        (the Suicide and Crisis Lifeline in the U.S.) or call 911 right away.
      </p>

      <h2>6. What you send us</h2>
      <p>
        You own the replies, questions, and other content you send us. You give us permission to use
        it to provide and improve Morning Lamp for you. We will not publish anything you send, even
        anonymously, without your permission. Please don’t send anything unlawful, threatening, or
        that you don’t have the right to share.
      </p>

      <h2>7. Partner program</h2>
      <ul>
        <li>
          <strong>Eligibility.</strong> Partners must have an active Premium membership and agree to
          these terms. We may approve, decline, or remove partners.
        </li>
        <li>
          <strong>Commission.</strong> Partners earn 30% of each Premium subscription payment we
          actually receive from a member they referred, not counting taxes, refunds, or chargebacks.
          Commissions recur for as long as the referred member keeps paying and the partner remains
          an active Premium member in good standing.
        </li>
        <li>
          <strong>When it’s earned (net 30).</strong> A commission is earned only after the referred
          member has paid for and completed that month. Payments that are refunded or disputed during
          that time earn nothing. Earned commissions are paid out on a regular schedule, and a minimum
          payout amount may apply.
        </li>
        <li>
          <strong>Credit.</strong> A referral is credited to the first partner link the member used.
          Your own subscription, and accounts you control, never count.
        </li>
        <li>
          <strong>Honest promotion.</strong> You must clearly tell people you may earn from your link,
          as the U.S. Federal Trade Commission requires. No spam, fake accounts, misleading claims,
          paid search ads on the Morning Lamp name, or pretending to speak for us.
        </li>
        <li>
          <strong>Payouts and taxes.</strong> Payouts are made through Stripe. You must give Stripe
          accurate payout and tax information, and you are responsible for your own taxes. Partners
          are independent, not our employees or agents.
        </li>
        <li>
          <strong>Fraud.</strong> We may withhold, reverse, or cancel commissions connected to fraud,
          abuse, or a breach of these terms, and may offset later payouts for chargebacks.
        </li>
        <li>
          <strong>Changes.</strong> We may change or end the partner program with at least 30 days’
          notice by email. Commissions already earned before a change will still be paid.
        </li>
      </ul>

      <h2>8. Acceptable use</h2>
      <p>
        Don’t misuse Morning Lamp: no automated sign-ups, no attempts to break or overload the site,
        no reselling or republishing our studies as your own, and no using it to harass anyone.
      </p>

      <h2>9. Our content</h2>
      <p>
        Morning Lamp’s studies, design, name, and crest belong to {LEGAL.company}. You may share
        individual emails with friends and quote short passages with credit to Morning Lamp. Scripture
        quotations are from The Holy Bible, New International Version® NIV®, Copyright © 1973, 1978,
        1984, 2011 by Biblica, Inc.™, used by permission.
      </p>

      <h2>10. Ending your use</h2>
      <p>
        You can unsubscribe or cancel at any time. We may suspend or end access for anyone who
        breaks these terms or misuses the service.
      </p>

      <h2>11. Disclaimers and limits of liability</h2>
      <p>
        Morning Lamp is provided “as is” and “as available,” without warranties of any kind, to the
        extent the law allows. To the extent the law allows, {LEGAL.company} is not liable for
        indirect, incidental, or consequential damages, and our total liability for any claim is
        limited to the amount you paid us in the 12 months before the claim, or $50 if you have not
        paid us anything. Some places don’t allow these limits, so they may not fully apply to you.
      </p>

      <h2>12. Governing law</h2>
      <p>
        These terms are governed by the laws of the State of {LEGAL.state}, without regard to its
        conflict-of-law rules. Any dispute will be handled in the state or federal courts located in{' '}
        {LEGAL.venue}, unless the law where you live requires otherwise.
      </p>

      <h2>13. Changes to these terms</h2>
      <p>
        If we make important changes, we will update the date above and let subscribers know by
        email before they take effect. Continuing to use Morning Lamp after that means you accept the
        updated terms.
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions about these terms? Email {mail} or visit our{' '}
        <Link href="/contact">contact page</Link>.
      </p>
    </LegalShell>
  );
}
