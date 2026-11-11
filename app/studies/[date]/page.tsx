import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TopBar } from '../../ArticleView';
import { SiteFooter } from '../../LegalShell';
import BackToTop from '../../BackToTop';
import SignupForm from '../../SignupForm';
import AuthorAvatar from '../../AuthorAvatar';
import { AUTHOR } from '@/lib/articles/author';
import { SITE, TRANSLATION_NOTICES } from '@/lib/articles';
import { AUTHOR_ID, ORG_ID, SITE_ID, author, jsonLd, organization, website } from '@/lib/articles/schema';
import { dateLabel } from '@/lib/daily';
import { bareRef, gatewayUrl, publicStudies, publicStudy, showsPassageText, studyPath } from '@/lib/publicStudies';

export const dynamic = 'force-dynamic';

const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…`);

// LORD in small caps, as printed in English Bibles.
function Scripture({ text }: { text: string }) {
  const parts = text.split(/\b(LORD)\b/);
  return <>{parts.map((p, i) => (p === 'LORD' ? <span key={i} className="sc">Lord</span> : p))}</>;
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  const s = await publicStudy(date);
  if (!s) return { title: 'Not found | Morning Lamp', robots: { index: false } };
  const c = s.content;
  const title = `${clip(c.title, 80)} (${bareRef(c.passage.ref)})`;
  const description = clip(c.intro, 158);
  return {
    title: `${title} | Morning Lamp`,
    description,
    alternates: { canonical: studyPath(date) },
    openGraph: { type: 'article', url: studyPath(date), siteName: 'Morning Lamp', title, description, publishedTime: date },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function StudyPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const s = await publicStudy(date);
  if (!s) notFound();
  const c = s.content;
  const ref = bareRef(c.passage.ref);
  const all = await publicStudies();
  const i = all.findIndex((x) => x.study_date === date);
  const newer = i > 0 ? all[i - 1] : null;
  const older = i >= 0 && i < all.length - 1 ? all[i + 1] : null;
  const voice = (c.voices ?? [])[0];
  const url = `${SITE}${studyPath(date)}`;
  const withText = showsPassageText(date);
  // A passage that already carries its own quotation marks doesn't get a second pair around it.
  const quoted = /[“”]/.test(c.passage.text);
  const share = `mailto:?subject=${encodeURIComponent(c.title)}&body=${encodeURIComponent(
    `I thought you’d like this short Bible study on ${ref}:\n\n${url}`,
  )}`;

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      website,
      author,
      {
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: c.title,
        description: clip(c.intro, 158),
        datePublished: date,
        dateModified: date,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        url,
        image: `${SITE}/opengraph-image.png`,
        author: { '@id': AUTHOR_ID },
        publisher: { '@id': ORG_ID },
        isPartOf: { '@id': SITE_ID },
        inLanguage: 'en-US',
        about: { '@type': 'Thing', name: ref },
        articleSection: c.pillar,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Morning Lamp', item: SITE },
          { '@type': 'ListItem', position: 2, name: 'Daily Bible Studies', item: `${SITE}/studies` },
          { '@type': 'ListItem', position: 3, name: c.title, item: url },
        ],
      },
    ],
  };

  return (
    <main className="legal-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <TopBar />
      <article className="article container">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/">Morning Lamp</Link> <span aria-hidden="true">›</span> <Link href="/studies">Daily Bible Studies</Link>
        </nav>
        <p className="study-kicker">
          Daily Bible study · <time dateTime={date}>{dateLabel(date)}</time>
        </p>
        <h1>{c.title}</h1>
        <div className="byline">
          <AuthorAvatar size={40} />
          <p>
            By <Link href={AUTHOR.path} rel="author">{AUTHOR.name}</Link> · {ref} · about 3 minutes
          </p>
        </div>

        <div className="verse-card study-passage">
          {withText ? (
            <blockquote>
              <p>
                {quoted ? '' : '“'}
                <Scripture text={c.passage.text} />
                {quoted ? '' : '”'}
              </p>
              <cite>{c.passage.ref.replace(/\s*\((\w+)\)\s*$/, ', $1')}</cite>
            </blockquote>
          ) : (
            <p>
              Today’s passage: <strong>{ref}</strong>.{' '}
              <a href={gatewayUrl(c.passage.ref)} rel="noopener" target="_blank">
                Read it in the NIV
              </a>
              .
            </p>
          )}
        </div>

        <p>{c.intro}</p>

        <aside className="top-cta" aria-label="Get Morning Lamp">
          <p className="top-cta-head">Get tomorrow’s study in your inbox.</p>
          <p className="top-cta-sub">
            This is today’s Morning Lamp: one passage and the story behind it, free at 5 AM. Under three minutes to read.
          </p>
          <SignupForm source={`study-top-${date}`} tone="light" hidePlanSelect buttonLabel="Become a Lamplighter" />
        </aside>

        <section aria-labelledby="behind-the-verse">
          <h2 id="behind-the-verse">Behind the verse</h2>
          {c.behind.slice(0, 3).map((b, n) => (
            <p key={n}>
              <Scripture text={b} />
            </p>
          ))}
        </section>

        <section className="answer-box study-detail" aria-label="One detail you might miss">
          <p className="answer-label">One detail you might miss</p>
          <p>
            <Scripture text={c.detail} />
          </p>
        </section>

        {voice && (
          <section aria-labelledby="voices-through-history">
            <h2 id="voices-through-history">Voices through history</h2>
            <div className="voice-card">
              <p className="voice-name">
                {voice.name} <span>({voice.dates})</span>
              </p>
              <p className="voice-work">{voice.kind}</p>
              <p>
                <Scripture text={voice.body} />
              </p>
              <p className="voice-source">Source: {voice.source}</p>
            </div>
          </section>
        )}

        {c.readMore.length > 0 && (
          <section aria-labelledby="where-to-read-more">
            <h2 id="where-to-read-more">Where to read more</h2>
            <ul>
              {c.readMore.map((l) => (
                <li key={l.label}>
                  {l.passage_ref ? (
                    <a href={gatewayUrl(l.passage_ref)} rel="noopener" target="_blank">
                      {l.label}
                    </a>
                  ) : (
                    l.label
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="study-share">
          Know one person who’d like this? <a href={share}>Send it to them</a>.
        </p>

        <aside className="article-cta" aria-label="Get Morning Lamp">
          <p className="kicker">Morning Lamp</p>
          <h2>Every verse has a story. Read one each morning.</h2>
          <p>
            One passage, the history behind it, and a voice from 2,000 years of faith. Free, in your inbox at 5 AM,
            under three minutes to read.
          </p>
          <SignupForm source={`study-${date}`} tone="light" hidePlanSelect buttonLabel="Become a Lamplighter" />
        </aside>

        {(newer || older) && (
          <nav className="related study-nav" aria-label="More daily studies">
            <h2>More daily studies</h2>
            <ul>
              {newer && (
                <li>
                  Next: <Link href={studyPath(newer.study_date)}>{newer.title}</Link>
                </li>
              )}
              {older && (
                <li>
                  Previous: <Link href={studyPath(older.study_date)}>{older.title}</Link>
                </li>
              )}
              <li>
                <Link href="/studies">All daily studies</Link>
              </li>
            </ul>
          </nav>
        )}

        <aside className="author-box" aria-label="About the author">
          <AuthorAvatar size={56} />
          <div>
            <p className="author-name">
              <Link href={AUTHOR.path} rel="author">{AUTHOR.name}</Link>
            </p>
            <p>{AUTHOR.short}</p>
          </div>
        </aside>

        <div className="notices">
          <p>{TRANSLATION_NOTICES.NIV}</p>
        </div>
      </article>
      <SiteFooter />
      <BackToTop />
    </main>
  );
}
