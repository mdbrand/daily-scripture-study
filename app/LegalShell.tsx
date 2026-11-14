import Link from 'next/link';
import Crest from './Crest';
import BackToTop from './BackToTop';
import { LEGAL } from '@/lib/legal';

// Shared frame for the Privacy, Terms, and Contact pages.
export default function LegalShell({
  title,
  intro,
  children,
  backToTop = true,
}: {
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
  backToTop?: boolean;
}) {
  return (
    <main className="legal-page">
      <header className="legal-top">
        <nav className="topbar container" aria-label="Site">
          <Link className="wordmark" href="/">
            <Crest size={34} title="" />
            <span>{LEGAL.brand}</span>
          </Link>
          <div className="toplinks">
            <Link href="/#premium">Premium</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </nav>
      </header>
      <article className="legal container">
        <h1>{title}</h1>
        {intro}
        {children}
      </article>
      <SiteFooter />
      {backToTop && <BackToTop />}
    </main>
  );
}

export function SiteFooter() {
  return (
    <footer className="colophon">
      <div className="container">
        <p className="colophon-name">{LEGAL.brand}</p>
        <nav className="footer-links" aria-label="Footer">
          <Link href="/bible-verses">Bible Verses</Link>
          <Link href="/verse-meaning">Verse Meanings</Link>
          <Link href="/guides">Guides</Link>
          <Link href="/studies">Daily Studies</Link>
          <Link href="/churches">For Churches</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/partners">Partners</Link>
          <Link href="/my-lamp">My Lamp</Link>
        </nav>
        <p>
          © 2026 {LEGAL.company}. Scripture quotations taken from The Holy Bible, New International
          Version® NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.™ Used by permission. All
          rights reserved worldwide.
        </p>
      </div>
    </footer>
  );
}
