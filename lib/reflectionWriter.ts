// APPROVED FORMAT: see docs/email-format.md. Don't add, remove, or rename sections without the owner's sign-off.
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { anthropicKey, VoiceSchema } from './studyWriter';

// The Premium "Yesterday" study: one passage for what the reader shared, Behind the Verse, one voice.
export const ReflectionSchema = z.object({
  kind: z
    .enum(['reflection', 'question', 'care', 'other'])
    .describe(
      'reflection: they shared something about their day or life. question: mainly a Bible question. care: any sign of crisis, self-harm, abuse, or danger. other: unsubscribe requests, billing, spam, or nothing to reflect on.',
    ),
  passage: z
    .object({
      text: z.string().describe('Exact 2011 NIV wording, 1 to 3 consecutive verses.'),
      ref: z.string().describe('Reference with translation, e.g. "Lamentations 3:22–23 (NIV)".'),
    })
    .nullable()
    .describe('When kind is reflection: the one passage that speaks to what they felt. Otherwise null.'),
  behind: z
    .array(z.string())
    .describe('When kind is reflection: Behind the Verse, 2 or 3 short paragraphs (never more than 3). Otherwise empty.'),
  voice: VoiceSchema.nullable().describe(
    'When kind is reflection: exactly one voice from church history who wrote about or lived through this same feeling. Otherwise null.',
  ),
});
type Written = z.infer<typeof ReflectionSchema>;
export type Reflection = Omit<Written, 'behind'> & { body: string[] };

const SYSTEM = `You write the Premium section of Morning Lamp, a daily Bible study email, called "Last Night's Lamp" (subtitle: "Written for what you shared last night"). A Premium reader replied to our evening check-in, or to a study, with a few lines about their day. Tomorrow morning their email shows their words, then a short study built entirely around how they felt.

Find the feeling first. What is the disposition underneath what they wrote? Guilt after losing their temper, fear before a diagnosis, gratitude after a win, loneliness, discouragement. Every part of the study answers that one feeling:

1. Scripture: one passage (1 to 3 verses) that speaks directly to that feeling.
2. Behind the Verse: 2 or 3 short paragraphs, never more. Explain what the passage meant in its own setting (who wrote it, to whom, what was happening), then connect it to what the reader shared. Name their situation specifically and kindly; don't repeat it back word for word. End with one small, concrete step or prayer for today.
3. Voices Through History: one real person from church history who wrote about, or lived through, this same feeling, and what they came to understand. Describe it in your own words; don't put words in quotation marks unless you are certain they are an accurate translation. Give their dates and the real work it comes from. Use "Direct commentary" only if they commented on this exact passage; otherwise "Thematic connection".

Accuracy and tone:
- Quote Scripture only in the exact 2011 NIV wording. If you aren't certain of the wording, choose a different passage.
- Real people, real works, correct dates. When something is uncertain, say so.
- Speak to the reader as "you." Warm, plain, short sentences. American spelling. No em dashes.
- You are not a counselor or pastor. Don't diagnose, give medical, legal, or financial advice, or tell them what decision to make. Never shame or scold.
- Mainstream, historically orthodox Christian teaching.

Classify first:
- If the reply mainly asks a Bible question, use kind "question" (a separate answer service handles those).
- If there is any sign of crisis, self-harm, suicidal thoughts, abuse, or danger, use kind "care" and write nothing else; a person on our team will follow up.
- If there is nothing to reflect on (unsubscribe, billing, spam, a one-word reply), or the reply is feedback about Morning Lamp itself (what they like, what to change, answers to a beta-tester question), use kind "other".`;

// How this Lamp is prompted:
// - reply: they wrote back last night (the normal case).
// - season: they didn't write last night, but tapped a "season" button (e.g. Waiting). Write for that season.
// - followup: they didn't write last night or pick a season; pick up the last note they shared a few days ago.
export type LampMode = { kind: 'reply' } | { kind: 'season'; season: string } | { kind: 'followup'; daysAgo: number };

function userMessage(reply: string, mode: LampMode): string {
  if (mode.kind === 'season') {
    return `This reader did not reply last night. Earlier, they tapped a button in their email to tell us they are ${mode.season}. That is all they shared; there is no note. Write a reflection (kind "reflection") for someone in that season: find the feeling underneath it, choose the passage and the voice for that feeling, and in Behind the Verse speak to the season kindly and specifically without inventing details about their life.`;
  }
  if (mode.kind === 'followup') {
    return `This reader did not reply last night. ${mode.daysAgo <= 1 ? 'Two nights ago' : `About ${mode.daysAgo + 1} nights ago`}, they shared the note below, and we already wrote them one study for it. Write a fresh follow-up (kind "reflection") that picks up where that left off: a different passage than the obvious one, Behind the Verse that gently asks how things have moved since then (without assuming how it turned out) and offers one next step, and one voice from history for that next step.\n\n<earlier_note>\n${reply}\n</earlier_note>`;
  }
  return `The reader wrote:\n\n<reply>\n${reply}\n</reply>`;
}

export async function writeReflection(
  reply: string,
  opts: { avoidVoice?: string | null; mode?: LampMode } = {},
): Promise<Reflection> {
  const key = anthropicKey();
  const client = key ? new Anthropic({ apiKey: key }) : new Anthropic();
  const avoid = opts.avoidVoice
    ? `\n\nThe main study in the same email already features ${opts.avoidVoice}. Choose a different person for Voices Through History.`
    : '';
  const response = await client.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 12000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high', format: zodOutputFormat(ReflectionSchema) },
    system: SYSTEM,
    messages: [{ role: 'user', content: `${userMessage(reply, opts.mode ?? { kind: 'reply' })}${avoid}` }],
  });
  if (response.stop_reason === 'refusal') return { kind: 'care', passage: null, body: [], voice: null };
  const out = response.parsed_output;
  if (!out) throw new Error('The reflection writer returned an unreadable result.');
  const { behind, ...rest } = out;
  const r: Reflection = { ...rest, body: behind.slice(0, 3) };
  if (r.kind === 'reflection' && (!r.passage || r.body.length === 0 || !r.voice)) throw new Error('Reflection was incomplete.');
  return r;
}
