import type { Metadata } from 'next';
import Link from 'next/link';
import LegalShell from '../LegalShell';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Contact | Morning Lamp',
  description: 'Email Morning Lamp. We read every message.',
  alternates: { canonical: '/contact' },
};

const mailto = `mailto:${LEGAL.email}?subject=${encodeURIComponent('Hello, Morning Lamp')}`;

export default function ContactPage() {
  return (
    <LegalShell title="Contact us">
      <div className="contact-card">
        <p className="contact-lede">
          The best way to reach us is email. Whether it’s a question, a prayer request, a correction, or
          a kind word, we read every message.
        </p>
        <a className="button contact-button" href={mailto}>
          Email {LEGAL.email}
        </a>
        <p className="contact-fallback">
          If the button doesn’t open your email app, write to us directly at{' '}
          <strong>{LEGAL.email}</strong>.
        </p>
      </div>

      <h2>Already a subscriber?</h2>
      <p>
        Just reply to any Morning Lamp email. That’s also how you ask a Bible question: one question a day,
        on the free edition and Premium alike.
      </p>

      <h2>Privacy and account requests</h2>
      <p>
        To unsubscribe, update your email, or have your information deleted, email us from the address
        you subscribed with. Our <Link href="/privacy">Privacy Policy</Link> explains your rights.
      </p>
    </LegalShell>
  );
}
