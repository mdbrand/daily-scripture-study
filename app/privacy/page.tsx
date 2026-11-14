import type { Metadata } from 'next';
import Link from 'next/link';
import LegalShell from '../LegalShell';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Privacy Policy | Morning Lamp',
  description: 'How Morning Lamp collects, uses, and protects your information.',
  alternates: { canonical: '/privacy' },
};

const mail = <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>;

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      intro={
        <p className="legal-meta">
          Effective {LEGAL.effective}. This policy explains what {LEGAL.brand} collects, why, and the
          choices you have. In short: we use your information to send you Morning Lamp, we never sell
          it, and you can ask us to delete it at any time.
        </p>
      }
    >
      <h2>1. Who we are</h2>
      <p>
        {LEGAL.brand} ({LEGAL.site}) is a daily Bible study by email, operated by {LEGAL.company}, a{' '}
        {LEGAL.state} company (“we,” “us”). Questions about this policy can be sent to {mail}.
      </p>

      <h2>2. Information we collect</h2>
      <h3>Information you give us</h3>
      <ul>
        <li>
          <strong>Your email address</strong> and the edition you choose (free or Premium) when you sign
          up.
        </li>
        <li>
          <strong>Replies and questions</strong> you send us, such as a Bible question or a note about
          your day.
        </li>
        <li>
          <strong>Premium details</strong> you choose to share, such as your season of life, what
          you’re carrying, people you’re praying for, and replies about your day. This can be personal
          and sometimes sensitive, including religious beliefs. Sharing it is always optional.
        </li>
        <li>
          <strong>Payment details</strong> for Premium are entered with our payment processor, Stripe.
          We do not see or store your full card number.
        </li>
        <li>
          <strong>Partner details</strong> if you join the partner program, such as your referral link
          name and the payout and tax information you give Stripe.
        </li>
      </ul>
      <h3>Information collected automatically</h3>
      <ul>
        <li>
          <strong>Usage and device information</strong>, such as pages visited, browser type, and
          approximate location, collected through Google Analytics (loaded by Google Tag Manager)
          using cookies and similar technologies.
        </li>
        <li>
          <strong>Referral codes.</strong> If you arrive through a partner’s link, we save the code in
          your browser and with your signup so the right partner gets credit.
        </li>
        <li>
          <strong>Technical information</strong>, such as your browser’s user-agent and IP address,
          used to deliver the site and prevent spam and abuse. We do not store your IP address with
          your signup.
        </li>
        <li>
          <strong>Email engagement</strong>, such as whether an email was delivered or opened and
          which links in it were clicked. We do not store your IP address with this.
        </li>
      </ul>

      <h2>3. How we use your information</h2>
      <ul>
        <li>To send the daily study and other emails you signed up for.</li>
        <li>To answer your Bible questions and, for Premium members, to write emails for your life.</li>
        <li>To process subscriptions, payments, and partner commissions.</li>
        <li>To keep the service safe, including blocking fake or throwaway sign-ups and fraud.</li>
        <li>To understand what is working and improve Morning Lamp.</li>
        <li>To meet legal obligations and enforce our <Link href="/terms">Terms</Link>.</li>
      </ul>
      <p>
        <strong>We never sell your personal information</strong>, and we never use what you share
        with us about your life to show you ads.
      </p>

      <h2>4. AI assistance</h2>
      <p>
        Our content, including the daily study, Premium emails and answers to Bible questions, is
        prepared with the help of artificial intelligence services. Replies you send us arrive in
        our inbox and can be read by the Morning Lamp team. When needed to write your email or answer, the
        relevant parts of what you shared are sent to those services for that purpose only.
      </p>
      <p>
        <strong>Memory for Premium readers.</strong> So that Last Night’s Lamp can pick up something
        you shared before, we keep the notes you send about your day and a short list of things from
        them that were still going on, in your own words with the date you wrote them. A later study
        may refer to one of these, and an evening check-in may ask you one follow-up question about
        it. On your <a href="/my-lamp">My Lamp page</a> you can see everything we hold from your
        notes, download it, keep a note out of memory, pause memory, or delete any of it.
      </p>

      <h2>5. Who we share information with</h2>
      <p>We share information only with service providers that help us run Morning Lamp:</p>
      <ul>
        <li>Vercel (website hosting)</li>
        <li>Supabase (secure database)</li>
        <li>Resend (sending and receiving email)</li>
        <li>Google Analytics and Google Tag Manager (site analytics)</li>
        <li>Stripe (payments and partner payouts)</li>
        <li>AI service providers (writing personalized content and answers)</li>
      </ul>
      <p>
        Partners can see how many people joined through their link and what they earned. They do not
        see your email address or anything you share with us. We may also disclose information if the
        law requires it, to protect people’s safety, or as part of a merger or sale of the business,
        in which case this policy would continue to apply.
      </p>

      <h2>6. Cookies and analytics</h2>
      <p>
        We use cookies and similar technologies for analytics and to remember a partner referral. You
        can block or delete cookies in your browser settings, and you can opt out of Google Analytics
        with Google’s{' '}
        <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener noreferrer" target="_blank">
          browser add-on
        </a>
        . The site works without analytics cookies.
      </p>

      <h2>7. Emails and unsubscribing</h2>
      <p>
        Every email includes a way to unsubscribe. You can also email {mail} and we will remove you.
        Unsubscribing stops the emails. It does not delete your information, and neither does
        canceling Premium. The next section explains how to delete it.
      </p>

      <h2>8. How long we keep information</h2>
      <p>
        We keep your information until you delete it or ask us to. That includes after you
        unsubscribe: we stop emailing you, but your email address, the date you unsubscribed, any
        notes you sent, and the record of emails we sent you stay on file. We keep the unsubscribe
        record so we don’t email you again.
      </p>
      <p>
        Premium readers can delete their own notes, and what is remembered from them, at any time on
        the <a href="/my-lamp">My Lamp page</a>.
      </p>
      <p>
        When you ask us to delete your data, we delete your subscriber record and what is stored with
        it: your notes and the studies written from them, what is remembered from them, and the
        records of emails sent to you and whether they were opened or clicked. If you have an active
        paid membership, it has to be canceled first. We keep the payment, partner payout and tax
        records the law requires, and our payment processor, Stripe, keeps its own records.
      </p>
      <p>
        Emails you send us also reach our team inbox. Deleting notes on the My Lamp page does not
        remove those emails. Ask us and we will delete them too.
      </p>

      <h2>9. Your rights and choices</h2>
      <p>
        You can ask to access, correct, download, or delete your personal information, and to stop
        receiving emails, by writing to {mail}. Premium readers can also see, download and delete
        their own notes at any time on the <a href="/my-lamp">My Lamp page</a>. We will verify the
        request comes from you and respond within the time the law allows. We will not treat you differently for using these rights.
      </p>
      <p>
        <strong>California residents</strong> have these rights under the California Consumer Privacy
        Act, including the right to know what we collect and to request deletion and correction. We
        do not sell or share personal information for cross-context behavioral advertising.{' '}
        <strong>Residents of the EU, UK, and similar regions</strong> may also object to or restrict
        certain processing and may complain to a local data protection authority. We process
        information to provide the service you asked for, with your consent, and for our legitimate
        interest in running and protecting Morning Lamp.
      </p>

      <h2>10. Security</h2>
      <p>
        We use reputable providers, encrypted connections, and access controls to protect your
        information. No system is perfectly secure, so we also keep what we collect to what we need.
      </p>

      <h2>11. Children</h2>
      <p>
        Morning Lamp is not directed to children under 13, and we do not knowingly collect their
        information. If you believe a child under 13 has signed up, contact us and we will delete it.
      </p>

      <h2>12. Changes to this policy</h2>
      <p>
        When we change this policy, we update the date at the top of this page.
      </p>

      <h2>13. Contact</h2>
      <p>
        {LEGAL.company}, operator of {LEGAL.brand}. Email {mail}, or visit our{' '}
        <Link href="/contact">contact page</Link>.
      </p>
    </LegalShell>
  );
}
