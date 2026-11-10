import Link from 'next/link';
import Crest from './Crest';
import SignupForm from './SignupForm';
import { SiteFooter } from './LegalShell';
import BackToTop from './BackToTop';
import type { Article } from '@/lib/articles/types';
import {
  SECTION_NAMES,
  TRANSLATION_NOTICES,
  articlePath,
  readingMinutes,
  relatedTo,
  translationsUsed,
} from '@/lib/articles';
import { articleSchema, jsonLd } from '@/lib/articles/schema';
import { seasonByKey } from '@/lib/seasons';
import { AUTHOR } from '@/lib/articles/author';
import AuthorAvatar from './AuthorAvatar';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const longDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

// LORD in small caps, as printed in English Bibles.
function Scripture({ text }: { text: string }) {
  const parts = text.split(/\b(LORD)\b/);
  return <>{parts.map((p, i) => (p === 'LORD' ? <span key={i} className="sc">Lord</span> : p))}</>;
}

export function TopBar() {
  return (
    <header className="legal-top">
      <nav className="topbar container" aria-label="Site">
        <Link className="wordmark" href="/">
          <Crest size={34} title="" />
          <span>Morning Lamp</span>
        </Link>
        <div className="toplinks">
          <Link href="/bible-verses">Bible Verses</Link>
          <Link href="/books">Books</Link>
          <Link href="/guides">Guides</Link>
          <Link href="/#premium">Premium</Link>
        </div>
      </nav>
    </header>
  );
}

export default function ArticleView({ a }: { a: Article }) {
  const season = seasonByKey(a.season);
  // Book guides lead with who wrote it, when and what it's about; the key verses come after.
  const sectionsFirst = a.section === 'books';
  const groupHeads = (a.groups ?? []).map((g) => g.heading);
  const sectionHeads = (a.sections ?? []).map((s) => s.heading);
  const toc = [
    ...(sectionsFirst ? [...sectionHeads, ...groupHeads] : [...groupHeads, ...sectionHeads]),
    ...(a.voice ? ['A voice from church history'] : []),
    'Common questions',
  ];
  const related = relatedTo(a);
  const notices = translationsUsed(a);

  return (
    <main className="legal-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(articleSchema(a)) }} />
      <TopBar />
      <article className="article container">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/">Morning Lamp</Link> <span aria-hidden="true">›</span>{' '}
          <Link href={`/${a.section}`}>{SECTION_NAMES[a.section]}</Link>
        </nav>
        <h1>{a.title}</h1>
        <div className="byline">
          <AuthorAvatar size={40} />
          <p>
            By <Link href={AUTHOR.path} rel="author">{AUTHOR.name}</Link> · Updated{' '}
            <time dateTime={a.updated}>{longDate(a.updated)}</time> · {readingMinutes(a)} min read
          </p>
        </div>

        <section className="answer-box" aria-label="Quick answer">
          <p className="answer-label">Quick answer</p>
          <p>{a.quickAnswer}</p>
        </section>

        <section className="takeaways" aria-label="Key takeaways">
          <h2>Key takeaways</h2>
          <ul>
            {a.takeaways.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>

        {a.intro.map((p, i) => (
          <p key={i}>{p}</p>
        ))}

        <nav className="toc" aria-label="On this page">
          <p className="toc-label">On this page</p>
          <ol>
            {toc.map((t) => (
              <li key={t}>
                <a href={`#${slugify(t)}`}>{t}</a>
              </li>
            ))}
          </ol>
        </nav>

        {sectionsFirst ? (
          <>
        {(a.sections ?? []).map((s) => (
          <section key={s.heading} aria-labelledby={slugify(s.heading)}>
            <h2 id={slugify(s.heading)}>{s.heading}</h2>
            {(s.paragraphs ?? []).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {s.list && (
              <ul>
                {s.list.map((li) => (
                  <li key={li}>{li}</li>
                ))}
              </ul>
            )}
            {s.steps && (
              <ol className="steps">
                {s.steps.map((st) => (
                  <li key={st.name}>
                    <strong>{st.name}.</strong> {st.text}
                  </li>
                ))}
              </ol>
            )}
            {s.table && (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      {s.table.head.map((h) => (
                        <th key={h} scope="col">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.table.rows.map((r, i) => (
                      <tr key={i}>
                        {r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}

        {(a.groups ?? []).map((g) => (
          <section key={g.heading} aria-labelledby={slugify(g.heading)}>
            <h2 id={slugify(g.heading)}>{g.heading}</h2>
            {g.intro && <p>{g.intro}</p>}
            {g.verses.map((v) => (
              <div className="verse-card" key={`${v.ref}-${v.translation}`}>
                <h3>
                  {v.ref} <span className="tr">({v.translation})</span>
                </h3>
                <blockquote>
                  <p>
                    “<Scripture text={v.text} />”
                  </p>
                  <cite>
                    {v.ref}, {v.translation}
                  </cite>
                </blockquote>
                <p className="story">
                  <strong>The story behind it: </strong>
                  {v.story}
                </p>
              </div>
            ))}
          </section>
        ))}

          </>
        ) : (
          <>
        {(a.groups ?? []).map((g) => (
          <section key={g.heading} aria-labelledby={slugify(g.heading)}>
            <h2 id={slugify(g.heading)}>{g.heading}</h2>
            {g.intro && <p>{g.intro}</p>}
            {g.verses.map((v) => (
              <div className="verse-card" key={`${v.ref}-${v.translation}`}>
                <h3>
                  {v.ref} <span className="tr">({v.translation})</span>
                </h3>
                <blockquote>
                  <p>
                    “<Scripture text={v.text} />”
                  </p>
                  <cite>
                    {v.ref}, {v.translation}
                  </cite>
                </blockquote>
                <p className="story">
                  <strong>The story behind it: </strong>
                  {v.story}
                </p>
              </div>
            ))}
          </section>
        ))}

        {(a.sections ?? []).map((s) => (
          <section key={s.heading} aria-labelledby={slugify(s.heading)}>
            <h2 id={slugify(s.heading)}>{s.heading}</h2>
            {(s.paragraphs ?? []).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {s.list && (
              <ul>
                {s.list.map((li) => (
                  <li key={li}>{li}</li>
                ))}
              </ul>
            )}
            {s.steps && (
              <ol className="steps">
                {s.steps.map((st) => (
                  <li key={st.name}>
                    <strong>{st.name}.</strong> {st.text}
                  </li>
                ))}
              </ol>
            )}
            {s.table && (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      {s.table.head.map((h) => (
                        <th key={h} scope="col">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.table.rows.map((r, i) => (
                      <tr key={i}>
                        {r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}

          </>
        )}

        {a.voice && (
          <section aria-labelledby="a-voice-from-church-history">
            <h2 id="a-voice-from-church-history">A voice from church history</h2>
            <div className="voice-card">
              <p className="voice-name">
                {a.voice.name} <span>({a.voice.dates})</span>
              </p>
              <p className="voice-work">{a.voice.work}</p>
              <p>{a.voice.body}</p>
            </div>
          </section>
        )}

        <aside className="article-cta" aria-label="Get Morning Lamp">
          <p className="kicker">Morning Lamp</p>
          <h2>{season ? `A short Bible study for ${season.phrase}, every morning` : 'Every verse has a story. Read one each morning.'}</h2>
          <p>
            One passage, the history behind it, and a voice from 2,000 years of faith. Free, in your inbox at 5 AM,
            under three minutes to read.
          </p>
          <SignupForm source={`article-${a.slug}`} tone="light" hidePlanSelect buttonLabel="Start free" />
        </aside>

        <section aria-labelledby="common-questions">
          <h2 id="common-questions">Common questions</h2>
          {a.faqs.map((f) => (
            <div className="faq" key={f.q}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
        </section>

        {related.length > 0 && (
          <nav className="related" aria-label="Related">
            <h2>Keep reading</h2>
            <ul>
              {related.map((r) => (
                <li key={r.slug}>
                  <Link href={articlePath(r)}>{r.title}</Link>
                </li>
              ))}
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

        {a.sources && a.sources.length > 0 && (
          <section className="sources" aria-label="Sources">
            <h2>Sources</h2>
            <ul>
              {a.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} rel="noopener" target="_blank">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {notices.length > 0 && (
          <div className="notices">
            {notices.map((t) => (
              <p key={t}>{TRANSLATION_NOTICES[t]}</p>
            ))}
          </div>
        )}
      </article>
      <SiteFooter />
      <BackToTop />
    </main>
  );
}
