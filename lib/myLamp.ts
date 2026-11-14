import { rpc } from './supabaseRpc';
import { gate } from './partners';

// A reader's own page (/my-lamp): the notes they have sent and what Morning Lamp remembers from them.
export type MyNote = { for_date: string; reply: string; status: string; no_memory: boolean; passage_ref: string | null };
export type MyMemory = {
  id: string;
  kind: 'concern' | 'prayer' | 'event' | 'thanks';
  label: string;
  quote: string;
  source_date: string;
  status: 'open' | 'closed';
  question: string | null;
  asked_on: string | null;
  recalled_on: string | null;
};
export type MyLamp = { found: boolean; premium: boolean; memory_off: boolean; notes: MyNote[]; memories: MyMemory[] };

export const MY_LAMP_ACTIONS = ['forget', 'forget_all', 'keep_out', 'keep_in', 'delete_note', 'pause', 'resume', 'delete_all'] as const;
export type MyLampAction = (typeof MY_LAMP_ACTIONS)[number];

export const myLamp = (email: string) => rpc<MyLamp>('dss_my_lamp', { p_gate: gate(), p_email: email });

export const myLampAction = (email: string, action: MyLampAction, id: string | null, date: string | null) =>
  rpc<string>('dss_my_lamp_action', { p_gate: gate(), p_email: email, p_action: action, p_id: id, p_date: date });

export const KIND_LABEL: Record<MyMemory['kind'], string> = {
  concern: 'Something you were carrying',
  prayer: 'A prayer',
  event: 'Something coming up',
  thanks: 'Something you were thankful for',
};

// The evening a note was written: the day before the morning it was written for.
export function eveningOf(forDate: string, withYear = false): string {
  const d = new Date(`${forDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC' });
}
export const dayOf = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });

// Everything we hold, as plain text the reader can keep.
export function exportText(email: string, data: MyLamp): string {
  const lines: string[] = [
    'MORNING LAMP: YOUR NOTES AND WHAT MORNING LAMP REMEMBERS',
    `For ${email}`,
    `Downloaded ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Los_Angeles' })}`,
    `Memory is ${data.memory_off ? 'paused' : 'on'}.`,
    '',
    '=== YOUR NOTES ===',
    '',
  ];
  if (!data.notes.length) lines.push('(none)', '');
  for (const n of [...data.notes].reverse()) {
    lines.push(`Written the evening of ${eveningOf(n.for_date, true)}${n.no_memory ? ' (kept out of memory)' : ''}`);
    lines.push(n.reply);
    lines.push(n.passage_ref ? `Study written for it: ${n.passage_ref}` : 'No study was written for this note.');
    lines.push('');
  }
  lines.push('=== WHAT MORNING LAMP REMEMBERS ===', '');
  if (!data.memories.length) lines.push('(nothing)', '');
  for (const m of data.memories) {
    lines.push(`${m.label} (${KIND_LABEL[m.kind]}${m.status === 'closed' ? ', settled' : ''})`);
    lines.push(`Your words, ${eveningOf(m.source_date, true)}: "${m.quote}"`);
    if (m.question) lines.push(`Follow-up question: ${m.question}${m.asked_on ? ` (asked ${dayOf(m.asked_on)})` : ' (not asked yet)'}`);
    if (m.recalled_on) lines.push(`Brought back up in your study on ${dayOf(m.recalled_on)}.`);
    lines.push('');
  }
  return lines.join('\n');
}
