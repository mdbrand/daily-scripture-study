import { SECTION_NAMES, articleUrl, articlesIn } from '@/lib/articles';

export const dynamic = 'force-static';

// https://llmstxt.org — a plain map of the site for AI assistants and answer engines.
export function GET() {
  const section = (s: 'bible-verses' | 'books' | 'topics' | 'guides') =>
    [`## ${SECTION_NAMES[s]}`, '', ...articlesIn(s).map((a) => `- [${a.title}](${articleUrl(a)}): ${a.quickAnswer}`), ''].join('\n');
  const body = [
    '# Morning Lamp',
    '',
    '> Morning Lamp is a free daily Bible study by email. Each morning at 5 AM local time: one Bible passage, the history and context behind it, one detail readers often miss, and one voice from 2,000 years of church history, in under three minutes. Premium ($7/month) adds Last Night’s Lamp, a short study written in response to what the reader shared the evening before.',
    '',
    'Every verse on this site is quoted exactly from one of five translations (NIV, CSB, ESV, NLT, BSB) and labeled. Each verse comes with "the story behind it": who wrote it, when, and what it meant to its first readers. Where scholars disagree, the articles say so.',
    '',
    'Articles are written under the pen name Ezra Lampwright, which stands for Morning Lamp’s writing desk: https://morninglamp.study/authors/ezra-lampwright',
    '',
    '- Sign up (free): https://morninglamp.study/',
    '- Contact: hello@morninglamp.study',
    '',
    section('bible-verses'),
    section('books'),
    section('topics'),
    section('guides'),
    '## About',
    '',
    '- [Morning Lamp home](https://morninglamp.study/): what the daily study includes and a sample email',
    '- [Privacy policy](https://morninglamp.study/privacy)',
    '- [Terms](https://morninglamp.study/terms)',
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
