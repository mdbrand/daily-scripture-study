import type { MetadataRoute } from 'next';
import { ARTICLES, SITE, articleUrl } from '@/lib/articles';

export default function sitemap(): MetadataRoute.Sitemap {
  const newest = (section?: string) =>
    ARTICLES.filter((a) => !section || a.section === section)
      .map((a) => a.updated)
      .sort()
      .at(-1);
  return [
    { url: `${SITE}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/bible-verses`, lastModified: newest('bible-verses'), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/books`, lastModified: newest('books'), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/topics`, lastModified: newest('topics'), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/guides`, lastModified: newest('guides'), changeFrequency: 'weekly', priority: 0.8 },
    ...ARTICLES.map((a) => ({
      url: articleUrl(a),
      lastModified: a.updated,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: `${SITE}/authors/ezra-lampwright`, lastModified: newest(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/contact`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE}/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
