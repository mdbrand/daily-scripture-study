import type { MetadataRoute } from 'next';
import { ARTICLES, SITE, articleUrl } from '@/lib/articles';
import { publicStudies, studyPath } from '@/lib/publicStudies';

// Built on request so each day's study shows up without a deploy.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const studies = await publicStudies();
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
    { url: `${SITE}/verse-meaning`, lastModified: newest('verse-meaning'), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/guides`, lastModified: newest('guides'), changeFrequency: 'weekly', priority: 0.8 },
    ...ARTICLES.map((a) => ({
      url: articleUrl(a),
      lastModified: a.updated,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: `${SITE}/studies`, lastModified: studies[0]?.study_date, changeFrequency: 'daily', priority: 0.8 },
    ...studies.map((s) => ({
      url: `${SITE}${studyPath(s.study_date)}`,
      lastModified: s.study_date,
      changeFrequency: 'yearly' as const,
      priority: 0.6,
    })),
    { url: `${SITE}/churches`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/authors/ezra-lampwright`, lastModified: newest(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/contact`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE}/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
