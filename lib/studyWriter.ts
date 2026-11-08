import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { sampleFreeStudy } from './email/samples';

// What Claude writes for one day. The date label, pillar, and links are filled in by code.
export const StudyContentSchema = z.object({
  subject: z.string().describe('Email subject line, under 70 characters, specific to the passage.'),
  title: z.string().describe('Headline for the study, one sentence.'),
  passage: z.object({
    text: z.string().describe('Exact 2011 NIV wording, 1 to 3 consecutive verses.'),
    ref: z.string().describe('Reference with translation, e.g. "Psalm 46:10 (NIV)".'),
  }),
  intro: z.string().describe('Two or three sentences that open the study.'),
  behind: z.array(z.string()).describe('2 to 4 short paragraphs of historical and literary background.'),
  detail: z.string().describe('One concrete detail in or near the passage that most readers miss.'),
  voices: z
    .array(
      z.object({
        name: z.string(),
        dates: z.string().describe('Birth and death years, e.g. "1483–1546".'),
        kind: z.enum(['Direct commentary', 'Thematic connection']),
        body: z.string().describe('What this person wrote or did, in plain words. Paraphrase; no invented quotations.'),
        source: z.string().describe('The real work it comes from, with an approximate date.'),
      }),
    )
    .describe('1 or 2 voices from church history.'),
  readMore: z
    .array(
      z.object({
        label: z.string(),
        passage_ref: z.string().nullable().describe('A Bible reference to link to, or null for a book or hymn.'),
      }),
    )
    .describe('2 or 3 places to keep reading.'),
  verseForLife: z.object({
    text: z.string().describe('Exact 2011 NIV wording of a second, related passage (1 or 2 verses).'),
    ref: z.string(),
    note: z.string().describe('Two or three sentences applying it to everyday life. Premium readers see this.'),
  }),
});
export type StudyContent = z.infer<typeof StudyContentSchema> & { pillar: string };

// One pillar per weekday, Sunday first, so each week covers the whole range.
export const PILLARS = [
  'Worship and the character of God',
  'Prayer and God’s presence',
  'Perseverance, peace, and trust',
  'Love, family, and friendship',
  'Wisdom for work and daily life',
  'Grace, forgiveness, and starting over',
  'Hope and the promises of God',
];

const SYSTEM = `You write Morning Lamp, a free daily Bible study email read by Christians of every age and season of life: single, married, raising kids, grieving, starting over. Readers get about five minutes each morning.

What a study does: takes one short passage, explains what it meant in its first setting (history, language, literary context), points out one detail people miss, and brings in one or two voices from church history. It is warm and clear, never preachy, and never assumes the reader is a scholar.

Accuracy matters more than anything else, because readers trust this:
- Quote Scripture only in the exact wording of the 2011 New International Version. Choose passages whose NIV wording you know precisely. If you are not certain of the exact wording, choose a different passage.
- State as fact only what is well established. When scholars disagree or the text doesn't say (dates, authorship, settings), say so plainly, as in "Many readers connect this to ..., but the text doesn't say."
- Voices from history must be real people and real works with correct dates. Describe what they wrote in your own words; do not put words in quotation marks unless you are certain they are an accurate translation. Label a voice "Thematic connection" unless the person actually commented on this passage.
- Hebrew or Greek words: give the transliteration and a careful gloss, only when it helps.

Style: plain, short sentences; American spelling; no em dashes (use commas, colons, or parentheses); no hype; no "In today's world". Address the reader as "you" only in the intro and the verse for life note. Mainstream, broadly evangelical and historically orthodox; where Christian traditions differ, say so fairly and briefly.`;

export type RecentStudy = { title: string | null; ref: string | null };

export async function writeStudy(opts: { date: string; pillar: string; recent: RecentStudy[] }): Promise<StudyContent> {
  const client = new Anthropic();
  const avoid = opts.recent
    .filter((r) => r.ref)
    .map((r) => `- ${r.ref}: ${r.title ?? ''}`)
    .join('\n');
  const example = {
    subject: sampleFreeStudy.subject,
    title: sampleFreeStudy.title,
    passage: sampleFreeStudy.passage,
    intro: sampleFreeStudy.intro,
    behind: sampleFreeStudy.behind,
    detail: sampleFreeStudy.detail,
    voices: sampleFreeStudy.voices,
  };

  const response = await client.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high', format: zodOutputFormat(StudyContentSchema) },
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Write the study for ${opts.date}. This week's theme for this day is: ${opts.pillar}.

Pick a passage that fits the theme and that we haven't used recently. Vary between Old and New Testament, and between well-known and less familiar passages.

Recently used (do not repeat these passages):
${avoid || '(none yet)'}

Here is a past study, for tone and depth only. Do not reuse its passage or wording:
${JSON.stringify(example, null, 2)}`,
      },
    ],
  });

  if (response.stop_reason === 'refusal') throw new Error('The study writer declined this request.');
  if (response.stop_reason === 'max_tokens') throw new Error('The study was cut off before it finished.');
  const out = response.parsed_output;
  if (!out) throw new Error('The study writer returned an unreadable result.');
  return { ...out, pillar: opts.pillar };
}
