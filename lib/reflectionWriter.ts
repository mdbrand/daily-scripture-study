// APPROVED FORMAT: see docs/email-format.md. Don't add, remove, or rename sections without the owner's sign-off.
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { anthropicKey, VoiceSchema } from './studyWriter';
import { noteNight, type MemoryItem } from './memory';
import { chapterKey, distinctVoices, type RecentLamp, type UsedPassages } from './lampVariety';

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
  recall: z
    .string()
    .nullable()
    .describe('The id of the one earlier item this study picks back up. Null when no earlier items are given, or none of them is about the same thing as tonight’s note.'),
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

Every Lamp is written for one person, so it should never read like a template:
- Don't open with "<Book> <chapter> opens..." or "<Book> was written to...". Each Lamp is told how to open and close below; follow that.
- Avoid stock lines: "That desire is a good one", "But notice", "Notice that", "For today, try one small thing", "God sees it", "You are not alone". Say it in words that fit this reader.

Classify first:
- If the reply mainly asks a Bible question, use kind "question" (a separate answer service handles those).
- If there is any sign of crisis, self-harm, suicidal thoughts, abuse, or danger, use kind "care" and write nothing else; a person on our team will follow up.
- If there is nothing to reflect on (unsubscribe, billing, spam, a one-word reply), or the reply is feedback about Morning Lamp itself (what they like, what to change, answers to a beta-tester question), use kind "other".`;

// How this Lamp is prompted:
// - reply: they wrote back last night (the normal case).
// - season: they didn't write last night, but tapped a "season" button (e.g. Waiting). Write for that season.
// - followup: they didn't write last night or pick a season; pick up the last note they shared a few days ago.
//   round 1 = the first morning with no reply; round 2 = the second in a row (Nov 23 2026: no carbon copies).
export type LampMode = { kind: 'reply' } | { kind: 'season'; season: string } | { kind: 'followup'; daysAgo: number; round?: number };

export function userMessage(reply: string, mode: LampMode): string {
  if (mode.kind === 'season') {
    return `This reader did not reply last night. Earlier, they tapped a button in their email to tell us they are ${mode.season}. That is all they shared; there is no note. Write a reflection (kind "reflection") for someone in that season: find the feeling underneath it, choose the passage and the voice for that feeling, and in Behind the Verse speak to the season kindly and specifically without inventing details about their life.`;
  }
  if (mode.kind === 'followup') {
    const when = mode.daysAgo <= 1 ? 'Two nights ago' : `About ${mode.daysAgo + 1} nights ago`;
    if ((mode.round ?? 1) >= 2) {
      return `This reader did not reply last night, or the night before. ${when}, they shared the note below. They have already read a study about it and a follow-up that asked how things had moved since (both are shown further down). Don't ask that again, don't retell their situation, and don't reuse those studies' passage, voice, stories, or steps. Mention the note in one short clause at most.

Write a fresh Lamp (kind "reflection") that still fits where this person is today: go underneath the situation to what it touches in a life with God (for example trust, provision, identity, rest, courage, waiting) and speak to that. It must read as new to someone who read the last two mornings. Choose a passage and a voice that open a different door, and end with a next step they haven't been given.\n\n<earlier_note>\n${reply}\n</earlier_note>`;
    }
    return `This reader did not reply last night. ${when}, they shared the note below, and we already wrote them one study for it (shown further down). Write a fresh follow-up (kind "reflection") that picks up where that left off and moves it forward: they wrote this note and already read a study about it, so refer to their situation in a sentence at most instead of retelling it. Use a different passage than the obvious one and a different voice than that study's, let Behind the Verse gently ask how things have moved since then (without assuming how it turned out), and offer one next step that is different from the step they were already given.\n\n<earlier_note>\n${reply}\n</earlier_note>`;
  }
  return `The reader wrote:\n\n<reply>\n${reply}\n</reply>`;
}

// Things this reader told us on earlier nights, in their own words. Only offered with a note they wrote
// last night. The writer may pick up at most one, and only by its id: the email then shows the reader's
// stored words and the date, so nothing recalled is ever the AI's paraphrase passed off as a quote.
function earlierItems(items: MemoryItem[]): string {
  if (!items.length) return '\n\nNo earlier items are given for this reader. Set recall to null.';
  return `\n\nOn earlier nights, this reader told us about the things below. Each is in their own words, with the evening they wrote it. Most nights these have nothing to do with tonight's note: then ignore them completely and set recall to null. If tonight's note is clearly about the same thing as one of them (the same person, the same worry, the outcome of the same event), you may pick up that one: set recall to its id, and add one sentence to Behind the Verse that connects tonight to it.

Rules for that sentence:
- Refer only to what their earlier words actually say. Don't quote them; the email shows their words and the date just above the study.
- Never say or guess how something turned out unless tonight's note says so.
- Never mention more than one earlier item, and never bring one up just because it is there. When in doubt, leave it out.

<earlier>
${items.map((m) => `<item id="${m.id}" written="${noteNight(m.source_date)}">${m.quote}</item>`).join('\n')}
</earlier>`;
}

// What this reader was already sent (Nov 23 2026). Voices are never repeated within 30 days. On a morning
// with no new note (follow-up or season), the writer also sees the last few Lamps themselves, so it can move
// forward instead of retelling the same story, asking the same question, or giving the same step.
export function alreadySent(recent: RecentLamp[], mode: LampMode): string {
  if (!recent.length) return '';
  const voices = distinctVoices(recent);
  let out = voices.length
    ? `\n\nVoices this reader has already been given in the last 30 days (choose a different person for Voices Through History): ${voices.slice(0, 30).join('; ')}.`
    : '';
  if (mode.kind !== 'reply') {
    const last = recent.slice(0, 3).filter((l) => l.body?.length);
    if (last.length) {
      out += `\n\nWhat this reader already read on recent mornings, newest first. Today's Lamp must read as new next to these: don't retell their stories, don't ask a question they already asked, don't repeat a step, image, or phrasing.\n<already_sent>\n${last
        .map((l) => `<lamp morning="${l.for_date}" passage="${l.ref ?? ''}" voice="${l.voice ?? ''}">\n${(l.body ?? []).join('\n\n').slice(0, 1800)}\n</lamp>`)
        .join('\n')}\n</already_sent>`;
    }
  }
  return out;
}

// Chapters this Lamp must not use: other readers' Lamps that morning, the main study, and this reader's
// own Lamps from the last 30 days. Named as chapters, never with anyone's note or study text.
function takenChapters(used?: UsedPassages, alsoAvoid: string[] = []): string {
  if (!used) return '';
  const today = [...new Set([...used.today, ...alsoAvoid])];
  const lines: string[] = [];
  if (today.length) lines.push(`Already used in other Lamps or the main study this morning (do not use any verse from these chapters): ${today.slice(0, 80).join('; ')}.`);
  if (used.mine.length) lines.push(`Already given to this same reader in the last 30 days (do not use these chapters again): ${used.mine.slice(0, 40).join('; ')}.`);
  if (!lines.length) return '';
  return `\n\nChoose a passage from a chapter that is not listed below. Many passages speak to the same feeling; look past the first one that comes to mind.\n${lines.join('\n')}`;
}

export async function writeReflection(
  reply: string,
  opts: {
    avoidVoice?: string | null;
    mode?: LampMode;
    earlier?: MemoryItem[];
    used?: UsedPassages;
    alsoAvoid?: string[];
    // This reader's Lamps from the last 30 days, newest first, and any voice a rewrite must also skip.
    recent?: RecentLamp[];
    alsoAvoidVoices?: string[];
    shape?: { opening: string; closing: string };
  } = {},
): Promise<Reflection> {
  const key = anthropicKey();
  const client = key ? new Anthropic({ apiKey: key }) : new Anthropic();
  const mode = opts.mode ?? { kind: 'reply' as const };
  const earlier = mode.kind === 'reply' ? (opts.earlier ?? []) : [];
  const avoid =
    (opts.avoidVoice
      ? `\n\nThe main study in the same email already features ${opts.avoidVoice}. Choose a different person for Voices Through History.`
      : '') +
    takenChapters(opts.used, (opts.alsoAvoid ?? []).map((r) => chapterKey(r) ?? r)) +
    alreadySent(opts.recent ?? [], mode) +
    (opts.alsoAvoidVoices?.length ? `\n\nAlso do not use: ${opts.alsoAvoidVoices.join('; ')}.` : '') +
    (opts.shape ? `\n\nShape of this Lamp: ${opts.shape.opening} ${opts.shape.closing}` : '');
  const response = await client.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 12000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high', format: zodOutputFormat(ReflectionSchema) },
    system: SYSTEM,
    messages: [{ role: 'user', content: `${userMessage(reply, mode)}${mode.kind === 'reply' ? earlierItems(earlier) : '\n\nSet recall to null.'}${avoid}` }],
  });
  if (response.stop_reason === 'refusal') return { kind: 'care', passage: null, body: [], voice: null, recall: null };
  const out = response.parsed_output;
  if (!out) throw new Error('The reflection writer returned an unreadable result.');
  const { behind, ...rest } = out;
  // Only an id we handed over counts; anything else is dropped.
  const recall = rest.recall && earlier.some((m) => m.id === rest.recall) ? rest.recall : null;
  const r: Reflection = { ...rest, recall, body: behind.slice(0, 3) };
  if (r.kind === 'reflection' && (!r.passage || r.body.length === 0 || !r.voice)) throw new Error('Reflection was incomplete.');
  return r;
}
