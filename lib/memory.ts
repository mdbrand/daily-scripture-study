import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { rpc } from './supabaseRpc';
import { gate } from './partners';
import { anthropicKey } from './studyWriter';

// Last Night's Lamp memory: a short list, per Premium reader, of things they have told us that are still
// going on. Every item keeps the reader's own words and the date of the note they came from. The rule that
// makes this safe to show a reader: nothing is ever put in quotation marks as "you wrote" unless code has
// found those exact words in the note they sent (see exactQuote). The AI may suggest; code decides.

export type MemoryKind = 'concern' | 'prayer' | 'event' | 'thanks';
// source_date is the morning the note was written for; the reader wrote it the evening before.
export type MemoryItem = { id: string; kind: MemoryKind; label: string; quote: string; source_date: string; recalled_on?: string | null };

export async function memoryContext(email: string, forDate: string): Promise<{ on: boolean; items: MemoryItem[] }> {
  try {
    const r = await rpc<{ on: boolean; items: MemoryItem[] }>('dss_memory_context', { p_gate: gate(), p_email: email, p_for_date: forDate });
    return { on: !!r?.on, items: r?.items ?? [] };
  } catch (e) {
    console.error('memory: context', e);
    return { on: false, items: [] };
  }
}

// The evening a note was written: the day before the morning it was written for. "Thursday, November 5".
export function noteNight(sourceDate: string): string {
  const d = new Date(`${sourceDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

// ---------- the quote check ----------
const flat = (s: string) => s.replace(/\s+/g, ' ').trim();
// Same length in, same length out, so a position found in the folded text is the same position in the original.
const fold = (s: string) =>
  s
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/[–—]/g, '-')
    .toLowerCase();

// Returns the reader's own words if `quote` appears in `note`, otherwise null. Line breaks, curly versus
// straight quotation marks, and capital letters are ignored when matching, but what comes back is always
// cut from the note itself, never from the AI's copy of it.
export function exactQuote(note: string, quote: string, min = 8, max = 240): string | null {
  const src = flat(note);
  const want = flat(quote).replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();
  if (want.length < min || want.length > max) return null;
  const a = fold(src);
  const b = fold(want);
  if (a.length !== src.length || b.length !== want.length) {
    const i = src.indexOf(want);
    return i < 0 ? null : src.slice(i, i + want.length);
  }
  const i = a.indexOf(b);
  return i < 0 ? null : src.slice(i, i + b.length);
}

// ---------- deciding what to remember ----------
const MemorySchema = z.object({
  items: z
    .array(
      z.object({
        kind: z.enum(['concern', 'prayer', 'event', 'thanks']),
        label: z.string().describe('A short plain name for it, under 80 characters, written to the reader. Only facts stated in the note.'),
        quote: z.string().describe('One phrase or sentence copied from tonight’s note exactly as written.'),
        question: z.string().nullable().describe('One short, kind follow-up question to the reader, or null.'),
        ask_in_days: z.number().nullable().describe('When question is set: days from tonight until it makes sense to ask, 2 to 14. Otherwise null.'),
      }),
    )
    .describe('Zero to three things worth remembering from tonight’s note. Empty for most passing notes.'),
  closed: z
    .array(z.object({ id: z.string(), quote: z.string().describe('The exact words from tonight’s note that show it is over or settled.') }))
    .describe('Earlier items that tonight’s note says are over or settled. Usually empty.'),
});

const SYSTEM = `You keep a short memory for Morning Lamp, a daily Bible study email. Each evening a Premium reader can reply with a few lines about their day, and the next morning they get a short study written for what they shared. Morning Lamp remembers a few things from those notes so that, days or weeks later, it can gently pick one back up: ask how the conversation went, or notice that a worry they carried has lifted. Done well, the reader feels known. Done badly, it feels like being watched. So remember little, and only in the reader's own words.

You will be given tonight's note, and sometimes a list of things already remembered from earlier notes. Decide what, if anything, from tonight's note is worth remembering.

Remember only things that are still going on or still ahead:
- concern: a worry or struggle they are carrying.
- prayer: something or someone they asked prayer for, or said they are praying about.
- event: something coming up whose outcome is not known yet, such as a conversation, an appointment, an interview, a decision.
- thanks: something they are thankful for that they may want to look back on later.

Most notes hold one such thing. Many hold none: a passing mood, a tired day, a general comment. Return an empty list for those. Never return more than three.

For each item:
- quote: copy one phrase or sentence from tonight's note exactly as written, between 8 and 240 characters. Code checks this against the note, and throws the item away if the words are not there. Choose the words that best name the thing.
- label: a short plain name for it, under 80 characters, written to the reader, for example "The conversation with your brother" or "Your mother's surgery on Friday". Use only facts stated in the note. No guesses about feelings, causes, or outcomes.
- question: only when it would be natural and kind for a friend to ask about this a few days later, write one short question to the reader, under 140 characters, such as "How did the conversation with your brother go?" Ask about what they said. Never assume how it turned out, and never mention anything that is not in the note. Use null when a follow-up would feel intrusive or there is nothing to ask. That covers most "thanks" items, and anything very private or painful: abuse, self-harm, a death, a diagnosis, intimate matters.
- ask_in_days: when question is set, how many days from tonight it makes sense to ask, from 2 to 14. If the note gives a time ("Friday", "next week"), work out when that is from tonight's date and ask a day or two after it, never before it has happened. Otherwise use 4.

Earlier items: if tonight's note says, in the reader's own words, that one of them is over or settled, list it under closed with its id and the exact words from tonight's note that show it. If tonight's note is about the same ongoing thing as an earlier item and adds nothing new, don't add a duplicate.

Remember nothing at all when the reader asks us not to keep what they wrote ("don't remember this", "off the record", "keep this between us"), when the note is a question about the Bible, or when it is about Morning Lamp itself (feedback, billing, unsubscribing).`;

type Proposed = z.infer<typeof MemorySchema>;

async function propose(note: string, earlier: MemoryItem[], forDate?: string): Promise<Proposed> {
  const key = anthropicKey();
  const client = key ? new Anthropic({ apiKey: key }) : new Anthropic();
  const list = earlier.length
    ? `\n\nAlready remembered from earlier notes:\n<earlier>\n${earlier
        .map((m) => `<item id="${m.id}" kind="${m.kind}" written="${noteNight(m.source_date)}">${m.quote}</item>`)
        .join('\n')}\n</earlier>`
    : '';
  const response = await client.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 6000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low', format: zodOutputFormat(MemorySchema) },
    system: SYSTEM,
    // The evening the note was written, so "Saturday" or "next week" in it can be placed on the calendar.
    messages: [{ role: 'user', content: `${forDate ? `Tonight is ${noteNight(forDate)}.\n\n` : ''}Tonight's note:\n\n<note>\n${note}\n</note>${list}` }],
  });
  // A refusal means the note is not something to keep a memory of.
  if (response.stop_reason === 'refusal' || !response.parsed_output) return { items: [], closed: [] };
  return response.parsed_output;
}

export type MemoryPlan = {
  fresh: { kind: MemoryKind; label: string; quote: string; question: string | null; ask_in_days: number | null }[];
  closed: { id: string; quote: string }[];
};

// Reads tonight's note and returns what would be remembered, after the quote check. Saves nothing.
// Never throws: memory must not get in the way of writing the reader's study.
export async function planMemory(note: string, earlier: MemoryItem[], forDate?: string): Promise<MemoryPlan | null> {
  if (!anthropicKey()) return null;
  try {
    const out = await propose(note, earlier, forDate);
    const fresh: MemoryPlan['fresh'] = [];
    for (const it of out.items.slice(0, 3)) {
      const quote = exactQuote(note, it.quote);
      const label = flat(it.label);
      if (!quote || !label || label.length > 110) continue;
      const q = it.question ? flat(it.question) : '';
      const question = q.length >= 8 && q.length <= 160 && q.endsWith('?') ? q : null;
      fresh.push({ kind: it.kind, label, quote, question, ask_in_days: question ? Math.round(it.ask_in_days ?? 4) : null });
    }
    const known = new Set(earlier.map((m) => m.id));
    const closed: MemoryPlan['closed'] = [];
    for (const c of out.closed) {
      const quote = known.has(c.id) ? exactQuote(note, c.quote) : null;
      if (quote) closed.push({ id: c.id, quote });
    }
    return { fresh, closed };
  } catch (e) {
    console.error('memory: plan', e);
    return null;
  }
}

export async function saveMemory(email: string, forDate: string, plan: MemoryPlan): Promise<number> {
  try {
    return await rpc<number>('dss_memory_apply', { p_gate: gate(), p_email: email, p_for_date: forDate, p_new: plan.fresh, p_close: plan.closed });
  } catch (e) {
    console.error('memory: save', e);
    return 0;
  }
}

export async function markRecalled(email: string, id: string, date: string) {
  try {
    await rpc('dss_memory_recalled', { p_gate: gate(), p_email: email, p_id: id, p_date: date });
  } catch (e) {
    console.error('memory: recalled', e);
  }
}
