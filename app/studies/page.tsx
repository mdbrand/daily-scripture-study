import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBar } from '../ArticleView';
import { SiteFooter } from '../LegalShell';
import BackToTop from '../BackToTop';
import SignupForm from '../SignupForm';
import { SITE } from '@/lib/articles';
import { jsonLd, organization, website } from '@/lib/articles/schema';
import { bareRef, publicStudies, studyPath } from '@/lib/publicStudies';

export const dynamic = 'force-dynamic';

const TITLE = 'Daily Bible Studies: One Passage and the Story Behind It';
const DESCRIPTION =
  'Every Morning Lamp daily Bible study in one place: one passage a day, the history behind it, a detail most readers miss and a voice from church history.';

export const metadata: Metadata = {
  title: `${TITLE} | Morning Lamp`,
  description: DESCRIPTION,
  alternates: { canonical: '/studies' },
  openGraph: { type: 'website', url: '/studies', siteName: 'Morning Lamp', title: TITLE, description: DESCRIPTION },
};

const day = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export default async function StudiesIndex() {
  const items = await publicStudies();
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      website,
      {
        '@type': 'CollectionPage',
        '@id': `${SITE}/studies#page`,
        url: `${SITE}/studies`,
        name: TITLE,
        description: DESCRIPTION,
        hasPart: items.slice(0, 60).map((s) => ({ '@type': 'Article', headline: s.title, url: `${SITE}${studyPath(s.study_date)}`, datePublished: s.study_date })),
      },
    ],
  };
  return (
    <main className="legal-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <TopBar />
      <section className="article container">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/">Morning Lamp</Link>
        </nav>
        <h1>Daily Bible Studies</h1>
        <p className="section-intro">
          One passage a day and the story behind it: who wrote it, what was happening, one detail most readers miss, and
          a voice from 2,000 years of church history. Each study goes out by email at 5 AM, then appears here.
        </p>
        <aside className="top-cta" aria-label="Get Morning Lamp">
          <p className="top-cta-head">Get each study the morning it’s written.</p>
          <p className="top-cta-sub">Free, in your inbox at 5 AM your time. Under three minutes to read.</p>
          <SignupForm source="studies-index" tone="light" hidePlanSelect buttonLabel="Become a Lamplighter" />
        </aside>
        {items.length === 0 ? (
          <p>The first studies will appear here soon.</p>
        ) : (
          <ul className="index-list">
            {items.map((s) => (
              <li key={s.study_date}>
                <Link href={studyPath(s.study_date)}>{s.title}</Link>
                <p>
                  {day(s.study_date)} · {bareRef(s.ref)} · {s.pillar}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <SiteFooter />
      <BackToTop />
    </main>
  );
}
