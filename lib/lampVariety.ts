// Keeps Last Night's Lamps from reading alike. Two readers who write about the same thing on the same
// night (Nov 17 2026: two notes about falling behind) used to get Lamps from the same chapter with the same
// shape, because the writer saw one reader at a time. Now it is told which chapters are taken and checked
// afterwards, and each Lamp is given its own way to open and close.
import { rpc } from './supabaseRpc';
import { gate } from './partners';

// "Isaiah 40:29–31 (NIV)" -> "isaiah 40"; "1 Peter 5:7" -> "1 peter 5"; "Psalm 23" -> "psalms 23".
export function chapterKey(ref: string | null | undefined): string | null {
  if (!ref) return null;
  const m = ref.trim().match(/^((?:[1-3]\s*)?[A-Za-z][A-Za-z .]*?)\s+(\d+)/);
  if (!m) return null;
  let book = m[1].toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
  if (book === 'psalm') book = 'psalms';
  if (book === 'song of solomon') book = 'song of songs';
  return `${book} ${m[2]}`;
}

export type UsedPassages = {
  // Chapters in other readers' Lamps for the same morning, and in that morning's main study.
  today: string[];
  // Chapters in this reader's own Lamps over the last 30 days.
  mine: string[];
};

export async function passagesUsed(email: string, forDate: string, mainStudyRef?: string | null): Promise<UsedPassages> {
  const r = await rpc<{ today: string[] | null; mine: string[] | null }>('dss_lamp_passages_used', {
    p_gate: gate(),
    p_email: email,
    p_for_date: forDate,
  }).catch((e) => {
    console.error('passages used', e);
    return { today: [], mine: [] };
  });
  const today = new Set((r.today ?? []).map(chapterKey).filter((k): k is string => !!k));
  const main = chapterKey(mainStudyRef);
  if (main) today.add(main);
  for (const k of claimed.get(forDate) ?? []) today.add(k);
  return { today: [...today], mine: [...new Set((r.mine ?? []).map(chapterKey).filter((k): k is string => !!k))] };
}

// Lamps written at the same moment (the overnight batch writes several in parallel) can't see each other in
// the database yet, so chapters accepted in this process are remembered here too.
const claimed = new Map<string, Set<string>>();

// Checks a finished Lamp's passage against what is taken right now and, if it is free, claims it.
// Check and claim happen with no await in between, so two parallel Lamps can't both take one chapter.
export function claimChapter(forDate: string, ref: string, used: UsedPassages): boolean {
  const key = chapterKey(ref);
  if (!key) return true;
  const taken = new Set([...used.today, ...used.mine, ...(claimed.get(forDate) ?? [])]);
  if (taken.has(key)) return false;
  if (!claimed.has(forDate)) claimed.set(forDate, new Set());
  claimed.get(forDate)!.add(key);
  return true;
}

export function forceClaim(forDate: string, ref: string) {
  const key = chapterKey(ref);
  if (!key) return;
  if (!claimed.has(forDate)) claimed.set(forDate, new Set());
  claimed.get(forDate)!.add(key);
}

// Ways to open and close Behind the Verse. Both stay inside the approved format (2 or 3 paragraphs:
// setting, connection to the reader, one step or prayer); they only change where the study starts and
// how it lands, so two Lamps on the same night don't share a shape.
const OPENINGS = [
  'Open Behind the Verse with the reader’s own situation in a sentence or two, then turn to the passage’s first setting.',
  'Open Behind the Verse with one vivid detail inside the passage itself (a word, an image, or a custom of the time) and what it meant then.',
  'Open Behind the Verse with the person who first spoke or wrote these words and what they were going through when they did.',
  'Open Behind the Verse with the question or fear the first hearers of this passage were carrying.',
];
const CLOSINGS = [
  'End with one small, concrete thing they can do today. No written-out prayer this time.',
  'End with a short prayer (one or two sentences) they can pray today, in quotation marks. No separate to-do step this time.',
  'End with one small step for today framed around a specific time of their day (morning, a commute, a meal, bedtime). Keep any prayer to a few words.',
];

export function shapeFor(): { opening: string; closing: string } {
  return {
    opening: OPENINGS[Math.floor(Math.random() * OPENINGS.length)],
    closing: CLOSINGS[Math.floor(Math.random() * CLOSINGS.length)],
  };
}
