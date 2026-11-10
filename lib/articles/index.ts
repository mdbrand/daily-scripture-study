import type { Article } from './types';
import gratitude from './content/gratitude';
import strength from './content/strength';
import encouragement from './content/encouragement';
import love from './content/love';
import anxiety from './content/anxiety';
import healing from './content/healing';
import newBeginnings from './content/new-beginnings';
import friendship from './content/friendship';
import howToStudy from './content/how-to-study-the-bible';
import readingPlan2027 from './content/2027-bible-reading-plan';
import psalms from './content/psalms';
import ecclesiastes from './content/ecclesiastes';
import john from './content/john';
import acts from './content/acts';
import revelation from './content/revelation';
import forgiveness from './content/forgiveness';
import comfort from './content/comfort';
import hope from './content/hope';
import joy from './content/joy';
import grief from './content/grief';

// Every published article. Add new ones here (one file per article in ./content).
export const ARTICLES: Article[] = [
  gratitude,
  strength,
  encouragement,
  love,
  anxiety,
  healing,
  newBeginnings,
  friendship,
  howToStudy,
  readingPlan2027,
  psalms,
  ecclesiastes,
  john,
  acts,
  revelation,
  forgiveness,
  comfort,
  hope,
  joy,
  grief,
];

export const SITE = 'https://morninglamp.study';

export const articleUrl = (a: Pick<Article, 'section' | 'slug'>) => `${SITE}/${a.section}/${a.slug}`;
export const articlePath = (a: Pick<Article, 'section' | 'slug'>) => `/${a.section}/${a.slug}`;
export const articleBy = (section: Article['section'], slug: string) =>
  ARTICLES.find((a) => a.section === section && a.slug === slug) ?? null;
export const articlesIn = (section: Article['section']) =>
  ARTICLES.filter((a) => a.section === section).sort((x, y) => x.title.localeCompare(y.title));
export const relatedTo = (a: Article) =>
  a.related.map((slug) => ARTICLES.find((x) => x.slug === slug)).filter((x): x is Article => !!x);

export const SECTION_NAMES: Record<Article['section'], string> = {
  'bible-verses': 'Bible Verses',
  books: 'Books of the Bible',
  guides: 'Guides',
};

// Rough reading time for the byline.
export function readingMinutes(a: Article): number {
  const parts = [
    a.quickAnswer,
    ...a.intro,
    ...(a.groups ?? []).flatMap((g) => [g.intro ?? '', ...g.verses.flatMap((v) => [v.text, v.story])]),
    ...(a.sections ?? []).flatMap((s) => [...(s.paragraphs ?? []), ...(s.list ?? []), ...(s.steps ?? []).map((x) => x.text)]),
    a.voice?.body ?? '',
    ...a.faqs.flatMap((f) => [f.q, f.a]),
  ];
  const words = parts.join(' ').split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(words / 230));
}

// Publisher notices for each translation, shown under any page that quotes it.
export const TRANSLATION_NOTICES: Record<string, string> = {
  NIV: 'Scripture quotations marked NIV are taken from The Holy Bible, New International Version®, NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.™ Used by permission. All rights reserved worldwide.',
  ESV: 'Scripture quotations marked ESV are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.',
  CSB: 'Scripture quotations marked CSB have been taken from the Christian Standard Bible®, Copyright © 2017 by Holman Bible Publishers. Used by permission. Christian Standard Bible® and CSB® are federally registered trademarks of Holman Bible Publishers.',
  NLT: 'Scripture quotations marked NLT are taken from the Holy Bible, New Living Translation, copyright © 1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Carol Stream, Illinois 60188. All rights reserved.',
  BSB: 'Scripture quotations marked BSB are from the Berean Standard Bible, which is in the public domain.',
};

export function translationsUsed(a: Article): string[] {
  const set = new Set((a.groups ?? []).flatMap((g) => g.verses.map((v) => v.translation)));
  return ['NIV', 'CSB', 'ESV', 'NLT', 'BSB'].filter((t) => set.has(t as never));
}
