import Link from 'next/link';
import { TopBar } from './ArticleView';
import { SiteFooter } from './LegalShell';
import BackToTop from './BackToTop';
import type { Article } from '@/lib/articles/types';
import { SECTION_NAMES, articlePath, articlesIn } from '@/lib/articles';
import { jsonLd, sectionSchema } from '@/lib/articles/schema';

export default function SectionIndex({ section, intro }: { section: Article['section']; intro: string }) {
  const items = articlesIn(section);
  return (
    <main className="legal-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(sectionSchema(section, items)) }} />
      <TopBar />
      <section className="article container">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/">Morning Lamp</Link>
        </nav>
        <h1>{SECTION_NAMES[section]}</h1>
        <p className="section-intro">{intro}</p>
        <ul className="index-list">
          {items.map((a) => (
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
