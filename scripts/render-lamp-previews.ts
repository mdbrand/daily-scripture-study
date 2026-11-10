// Renders the four Last Night's Lamp versions to public/_preview/ for a visual check (not deployed: gitignored dir).
import { writeFileSync } from 'node:fs';
import { renderDailyEmail } from '../lib/email/templates';
import { sampleFreeStudy } from '../lib/email/samples';
import { SAMPLE_YESTERDAY } from '../lib/daily';

const footer = { unsubscribeUrl: 'https://morninglamp.study/u/x', postalAddress: '21151 S Western Ave, Torrance, CA', seasonBase: 'https://morninglamp.study/s/TOKEN' };
const base = { ...sampleFreeStudy, edition: 'premium' as const };
const variants = {
  reply: { ...base, yesterday: SAMPLE_YESTERDAY },
  season: { ...base, yesterday: { ...SAMPLE_YESTERDAY, reply: 'Season: Waiting', meta: { source: 'season' as const, season: 'waiting' } } },
  followup: { ...base, yesterday: { ...SAMPLE_YESTERDAY, meta: { source: 'followup' as const, from_date: '2026-11-08' } } },
  none: { ...base, yesterday: undefined },
};
for (const [k, v] of Object.entries(variants)) {
  const m = renderDailyEmail(v, footer);
  writeFileSync(`public/_preview/lamp-${k}.html`, m.html);
  if (k === 'none') writeFileSync(`public/_preview/lamp-none.txt`, m.text);
}
console.log('ok');
