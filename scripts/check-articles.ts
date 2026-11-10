// Checks every article in lib/articles/content against the SEO/AEO rules. Run: npx tsx scripts/check-articles.ts [file...]
import { readdirSync } from 'node:fs';
import path from 'node:path';
import type { Article } from '../lib/articles/types';
import { seasonByKey } from '../lib/seasons';

const dir = path.join(__dirname, '..', 'lib', 'articles', 'content');
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

async function main() {
  const files = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(dir).filter((f) => f.endsWith('.ts')).map((f) => path.join(dir, f));
  const all: Article[] = [];
  for (const f of files) all.push((await import(path.resolve(f))).default as Article);
  const slugs = new Set(readdirSync(dir).map((f) => f.replace(/\.ts$/, '')));
  let bad = 0;
  for (const a of all) {
    const p: string[] = [];
    if (a.seoTitle.length > 60) p.push(`seoTitle ${a.seoTitle.length} chars (max 60)`);
    if (a.description.length < 130 || a.description.length > 165) p.push(`description ${a.description.length} chars (aim 140–160)`);
    if (!a.seoTitle.toLowerCase().includes(a.keyword.toLowerCase().replace(/ for beginners$/, '')) && !a.title.toLowerCase().includes(a.keyword.toLowerCase()))
      p.push('keyword missing from title/seoTitle');
    const qa = words(a.quickAnswer);
    if (qa < 35 || qa > 70) p.push(`quickAnswer ${qa} words (aim 40–60)`);
    if (a.faqs.length < 5) p.push(`only ${a.faqs.length} FAQs`);
    a.faqs.forEach((f) => {
      const n = words(f.a);
      if (n < 30 || n > 95) p.push(`FAQ "${f.q}" answer ${n} words (aim 40–80)`);
    });
    const verses = (a.groups ?? []).flatMap((g) => g.verses);
    const m = a.title.match(/(\d+) Verses/);
    if (m && Number(m[1]) !== verses.length) p.push(`title says ${m[1]} verses, article has ${verses.length}`);
    const counts = [...a.intro, a.description].join(' ').match(/\b(\d+) (?:Bible )?verses\b/gi) ?? [];
    counts.forEach((c) => {
      const n = Number(c.match(/\d+/)![0]);
      if (verses.length && n !== verses.length) p.push(`text says "${c}", article has ${verses.length}`);
    });
    verses.forEach((v) => {
      if (/\d-\d/.test(v.ref)) p.push(`ref "${v.ref}" uses a hyphen (use an en dash)`);
      if (!v.story || words(v.story) < 20) p.push(`thin story for ${v.ref}`);
    });
    a.related.forEach((r) => !slugs.has(r) && p.push(`related "${r}" has no article file yet`));
    if (a.season && !seasonByKey(a.season)) p.push(`unknown season "${a.season}"`);
    if (p.length) bad++;
    console.log(`${p.length ? '✗' : '✓'} ${a.section}/${a.slug} (${verses.length} verses, ${a.faqs.length} FAQs)`);
    p.forEach((x) => console.log(`    - ${x}`));
  }
  process.exit(bad ? 1 : 0);
}
main();
