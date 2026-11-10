import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBar } from '../../ArticleView';
import AuthorAvatar from '../../AuthorAvatar';
import { SiteFooter } from '../../LegalShell';
import BackToTop from '../../BackToTop';
import { AUTHOR } from '@/lib/articles/author';
import { ARTICLES, articlePath } from '@/lib/articles';
import { authorSchema, jsonLd } from '@/lib/articles/schema';

export const metadata: Metadata = {
  title: 'Ezra Lampwright | Morning Lamp',
  description: AUTHOR.short,
  alternates: { canonical: AUTHOR.path },
  openGraph: { type: 'profile', url: AUTHOR.path, title: 'Ezra Lampwright', description: AUTHOR.short },
};

export default function AuthorPage() {
  const articles = [...ARTICLES].sort((a, b) => b.updated.localeCompare(a.updated) || a.title.localeCompare(b.title));
  return (
    <main className="legal-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(authorSchema()) }} />
      <TopBar />
      <section className="article container">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/">Morning Lamp</Link>
        </nav>
        <div className="author-head">
          <AuthorAvatar size={88} />
          <div>
            <h1>{AUTHOR.name}</h1>
            <p className="byline">{AUTHOR.jobTitle}</p>
          </div>
        </div>
        {AUTHOR.bio.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        <h2>Articles by {AUTHOR.name}</h2>
        <ul className="index-list">
          {articles.map((a) => (
            <li key={a.slug}>
              <Link href={articlePath(a)}>{a.title}</Link>
              <p>{a.description}</p>
            </li>
          ))}
        </ul>
      </section>
      <SiteFooter />
      <BackToTop />
    </main>
  );
}
