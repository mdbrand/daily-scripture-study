// Public articles on morninglamp.study: season verse guides (/bible-verses/<slug>) and guides (/guides/<slug>).
// Every article is plain data; app/ArticleView.tsx renders it with full SEO + AEO structure and schema.

// The five translations the site quotes. Emails stay NIV; the site mixes these.
export type Translation = 'NIV' | 'CSB' | 'ESV' | 'NLT' | 'BSB';

export type ArticleVerse = {
  ref: string; // "Philippians 4:6–7"
  translation: Translation;
  text: string; // exact wording of that translation (checked with scripts/verse.py)
  story: string; // "The story behind it": 2–4 sentences of setting, history, or language
};

export type VerseGroup = { heading: string; intro?: string; verses: ArticleVerse[] };

// Free-form section for guides (and optional extra sections on verse guides).
export type Section = {
  heading: string;
  paragraphs?: string[];
  list?: string[]; // bulleted
  steps?: { name: string; text: string }[]; // numbered steps (also emitted as HowTo schema when howTo is set)
  table?: { head: string[]; rows: string[][] };
};

export type Faq = { q: string; a: string }; // a: 40–80 words, answer first

export type HistoryVoice = { name: string; dates: string; work: string; body: string };

export type Article = {
  slug: string;
  section: 'bible-verses' | 'books' | 'topics' | 'guides';
  keyword: string; // the search phrase this page targets
  title: string; // H1 (matches the search phrase)
  seoTitle: string; // <title>, ≤ 60 characters
  description: string; // meta description, 140–160 characters
  published: string; // YYYY-MM-DD
  updated: string; // YYYY-MM-DD
  quickAnswer: string; // 40–60 words; the direct answer AI tools and featured snippets quote
  takeaways: string[]; // 3–5 bullets
  intro: string[];
  groups?: VerseGroup[]; // verse guides
  sections?: Section[]; // guides, or extra sections after the verses
  howTo?: { name: string; totalTime?: string }; // emit HowTo schema from the first section with steps
  voice?: HistoryVoice; // one voice from church history
  faqs: Faq[]; // People Also Ask questions, answered
  season?: string; // season key (lib/seasons.ts) for the signup box
  related: string[]; // other article slugs
  sources?: { label: string; url: string }[];
};
