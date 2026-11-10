import type { Metadata } from 'next';
import type { Article } from './types';
import { SECTION_NAMES, articleBy, articlePath, articlesIn } from './index';

// Shared route helpers for /bible-verses/[slug] and /guides/[slug].
export const paramsFor = (section: Article['section']) => () => articlesIn(section).map((a) => ({ slug: a.slug }));

export function metadataFor(section: Article['section'], slug: string): Metadata {
  const a = articleBy(section, slug);
  if (!a) return { title: 'Not found | Morning Lamp', robots: { index: false } };
  const path = articlePath(a);
  return {
    title: a.seoTitle,
    description: a.description,
    alternates: { canonical: path },
    keywords: [a.keyword, SECTION_NAMES[section], 'Bible study', 'Morning Lamp'],
    openGraph: {
      type: 'article',
      url: path,
      siteName: 'Morning Lamp',
      title: a.title,
      description: a.description,
      publishedTime: a.published,
      modifiedTime: a.updated,
    },
    twitter: { card: 'summary_large_image', title: a.title, description: a.description },
  };
}
