import type { Article } from './types';
import { ARTICLES, SECTION_NAMES, SITE, articleUrl } from './index';
import { AUTHOR } from './author';

// JSON-LD (schema.org) for articles, section pages, and the site itself.

export const ORG_ID = `${SITE}/#organization`;
export const SITE_ID = `${SITE}/#website`;

export const organization = {
  '@type': 'Organization',
  '@id': ORG_ID,
  name: 'Morning Lamp',
  url: SITE,
  logo: { '@type': 'ImageObject', url: `${SITE}/apple-icon`, width: 180, height: 180 },
  description:
    'A free daily Bible study by email: one passage, the history behind it, and a voice from 2,000 years of faith, in under three minutes.',
  email: 'hello@morninglamp.study',
  parentOrganization: { '@type': 'Organization', name: 'Mission Driven Brand, LLC' },
};

export const AUTHOR_ID = `${SITE}${AUTHOR.path}#person`;

export const author = {
  '@type': 'Person',
  '@id': AUTHOR_ID,
  name: AUTHOR.name,
  url: `${SITE}${AUTHOR.path}`,
  image: `${SITE}/authors/ezra-lampwright/avatar.svg`,
  jobTitle: AUTHOR.jobTitle,
  description: AUTHOR.short,
  worksFor: { '@id': ORG_ID },
  knowsAbout: ['Bible study', 'Biblical history', 'Church history', 'Scripture'],
};

export const website = {
  '@type': 'WebSite',
  '@id': SITE_ID,
  url: SITE,
  name: 'Morning Lamp',
  publisher: { '@id': ORG_ID },
  inLanguage: 'en-US',
};

export function siteSchema() {
  return { '@context': 'https://schema.org', '@graph': [organization, website] };
}

function breadcrumb(items: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
  };
}

export function articleSchema(a: Article) {
  const url = articleUrl(a);
  const graph: Record<string, unknown>[] = [
    organization,
    website,
    author,
    {
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: a.title,
      description: a.description,
      datePublished: a.published,
      dateModified: a.updated,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      url,
      image: `${SITE}/opengraph-image.png`,
      author: { '@id': AUTHOR_ID },
      publisher: { '@id': ORG_ID },
      isPartOf: { '@id': SITE_ID },
      inLanguage: 'en-US',
      keywords: a.keyword,
      about: { '@type': 'Thing', name: a.keyword },
      abstract: a.quickAnswer,
      speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.answer-box', '.takeaways'] },
    },
    breadcrumb([
      { name: 'Morning Lamp', url: SITE },
      { name: SECTION_NAMES[a.section], url: `${SITE}/${a.section}` },
      { name: a.title, url },
    ]),
    {
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: a.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ];
  if (a.groups?.length) {
    graph.push({
      '@type': 'ItemList',
      '@id': `${url}#verses`,
      name: a.title,
      itemListElement: a.groups
        .flatMap((g) => g.verses)
        .map((v, i) => ({ '@type': 'ListItem', position: i + 1, name: `${v.ref} (${v.translation})`, description: v.text })),
    });
  }
  const steps = a.howTo ? a.sections?.find((s) => s.steps?.length)?.steps : undefined;
  if (a.howTo && steps) {
    graph.push({
      '@type': 'HowTo',
      '@id': `${url}#howto`,
      name: a.howTo.name,
      ...(a.howTo.totalTime ? { totalTime: a.howTo.totalTime } : {}),
      step: steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.name, text: s.text })),
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

export function sectionSchema(section: Article['section'], items: Article[]) {
  const url = `${SITE}/${section}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      website,
      {
        '@type': 'CollectionPage',
        '@id': url,
        url,
        name: SECTION_NAMES[section],
        isPartOf: { '@id': SITE_ID },
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: items.map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: articleUrl(a), name: a.title })),
        },
      },
      breadcrumb([
        { name: 'Morning Lamp', url: SITE },
        { name: SECTION_NAMES[section], url },
      ]),
    ],
  };
}

export function authorSchema() {
  const url = `${SITE}${AUTHOR.path}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      website,
      { ...author, mainEntityOfPage: url },
      {
        '@type': 'ProfilePage',
        '@id': url,
        url,
        name: AUTHOR.name,
        mainEntity: { '@id': AUTHOR_ID },
        isPartOf: { '@id': SITE_ID },
        hasPart: ARTICLES.map((a) => ({ '@type': 'Article', headline: a.title, url: articleUrl(a) })),
      },
      breadcrumb([
        { name: 'Morning Lamp', url: SITE },
        { name: AUTHOR.name, url },
      ]),
    ],
  };
}

// Safe for a <script type="application/ld+json"> tag.
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');
