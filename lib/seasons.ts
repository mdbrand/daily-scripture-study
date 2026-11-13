// The one-tap seasons a Premium reader can pick in their email. When they don't reply to the evening
// check-in, Last Night's Lamp is written for the season they tapped (or picks up an earlier note).
//
// Every button names a feeling, not a life situation, so any reader could tap any of them.
// The pool is bigger than what one email shows: each email shows 7 buttons (4 hard seasons, 3 good ones),
// rotating day to day so the choices stay fresh. See seasonsForEmail().
//
// `prompt` completes "they told us they are ...", so it must read naturally after "they are".
// `topic` is the search phrase the season's public page targets ("bible verses about <topic>").
export type SeasonTone = 'hard' | 'good';
export type Season = {
  key: string;
  label: string;
  phrase: string;
  prompt: string;
  tone: SeasonTone;
  topic: string;
  // Show the 988 crisis line alongside anything written for this season.
  care?: boolean;
  // Months (1-12) when this season is always offered, e.g. Grateful in November.
  months?: number[];
  // No longer offered as a button. Kept so links in emails already sent, and Lamps already written, still work.
  // Buttons name a feeling any reader could have, never a life situation (a pregnancy, a marriage, a bank balance).
  retired?: boolean;
};

export const SEASONS: Season[] = [
  // ---- hard seasons ----
  { key: 'anxious', label: 'Anxious', phrase: 'a season of worry', prompt: 'anxious and worried about what is ahead', tone: 'hard', topic: 'anxiety' },
  { key: 'stretched', label: 'Stretched thin', phrase: 'a stretched-thin season', prompt: 'stretched thin, tired, and carrying too much', tone: 'hard', topic: 'strength' },
  { key: 'sick', label: 'Sick or hurting', phrase: 'a season of sickness or pain', prompt: 'sick, in pain, or waiting on healing', tone: 'hard', topic: 'healing', retired: true },
  { key: 'forgive', label: 'Struggling to forgive', phrase: 'a season of struggling to forgive', prompt: 'hurt by someone and struggling to forgive them', tone: 'hard', topic: 'forgiveness' },
  { key: 'marriage', label: 'Marriage is hard', phrase: 'a hard season in marriage', prompt: 'going through a hard stretch in their marriage', tone: 'hard', topic: 'marriage', retired: true },
  { key: 'comfort', label: 'Need comfort', phrase: 'a season of needing comfort', prompt: 'hurting and in need of comfort', tone: 'hard', topic: 'comfort' },
  { key: 'doubting', label: 'Doubting', phrase: 'a season of doubt', prompt: 'doubting, and finding faith hard right now', tone: 'hard', topic: 'faith' },
  { key: 'grieving', label: 'Grieving', phrase: 'a season of grief', prompt: 'grieving a loss', tone: 'hard', topic: 'grief' },
  { key: 'losing-hope', label: 'Losing hope', phrase: 'a season of losing hope', prompt: 'losing hope and struggling to see a way forward', tone: 'hard', topic: 'hope' },
  { key: 'afraid', label: 'Afraid', phrase: 'a season of fear', prompt: 'afraid of something that might happen', tone: 'hard', topic: 'fear' },
  { key: 'low', label: 'Feeling low', phrase: 'a low season', prompt: 'feeling low and heavy, and have been for a while', tone: 'hard', topic: 'depression', care: true },
  { key: 'trust', label: 'Learning to trust', phrase: 'a season of learning to trust God', prompt: 'trying to trust God with something out of their control', tone: 'hard', topic: 'trusting god' },
  { key: 'waiting', label: 'Waiting', phrase: 'a season of waiting', prompt: 'waiting on God for something that has not come yet', tone: 'hard', topic: 'waiting on god' },
  { key: 'heartbroken', label: 'Heartbroken', phrase: 'a season of heartbreak', prompt: 'heartbroken after a relationship ended or someone let them down', tone: 'hard', topic: 'heartbreak' },
  { key: 'starting-over', label: 'Starting over', phrase: 'a season of starting over', prompt: 'starting over after something ended or changed', tone: 'hard', topic: 'new beginnings', months: [1] },
  { key: 'lonely', label: 'Lonely', phrase: 'a lonely season', prompt: 'lonely and wishing they had more people close', tone: 'hard', topic: 'loneliness' },
  { key: 'money', label: 'Money stress', phrase: 'a season of money stress', prompt: 'stressed about money and bills', tone: 'hard', topic: 'money', retired: true },
  { key: 'tempted', label: 'Tempted', phrase: 'a season of temptation', prompt: 'fighting a temptation they keep coming back to', tone: 'hard', topic: 'temptation' },
  { key: 'far-from-god', label: 'Far from God', phrase: 'a season of feeling far from God', prompt: 'feeling far from God, with prayer feeling dry or quiet', tone: 'hard', topic: 'feeling far from god' },

  // ---- good seasons ----
  { key: 'grateful', label: 'Grateful', phrase: 'a grateful season', prompt: 'grateful and wanting to thank God for what is going well', tone: 'good', topic: 'gratitude', months: [11] },
  { key: 'joyful', label: 'Joyful', phrase: 'a joyful season', prompt: 'joyful and wanting to celebrate what God is doing', tone: 'good', topic: 'joy', months: [12] },
  { key: 'love', label: 'In love', phrase: 'a season of love', prompt: 'in love, or learning to love someone well', tone: 'good', topic: 'love', months: [2], retired: true },
  { key: 'lift', label: 'Need a lift', phrase: 'a season that could use a lift', prompt: 'doing okay but could use some encouragement', tone: 'good', topic: 'encouragement' },
  { key: 'friends', label: 'Thankful for friends', phrase: 'a season of good friendships', prompt: 'thankful for the friends God has given them', tone: 'good', topic: 'friendship', retired: true },
  { key: 'celebrating', label: 'Celebrating', phrase: 'a season of celebration', prompt: 'celebrating something good that has happened', tone: 'good', topic: 'celebration', months: [5, 6] },
  { key: 'family', label: 'Family is good', phrase: 'a good season with family', prompt: 'enjoying a good season with their family', tone: 'good', topic: 'family', months: [12], retired: true },
  { key: 'brave', label: 'Stepping out in faith', phrase: 'a season of stepping out in faith', prompt: 'about to take a brave step and wanting courage', tone: 'good', topic: 'courage' },
  { key: 'blessed', label: 'Feeling blessed', phrase: 'a blessed season', prompt: 'noticing how blessed they are right now', tone: 'good', topic: 'blessings' },
  { key: 'growing', label: 'Growing', phrase: 'a season of growth', prompt: 'growing in their faith and wanting to keep going', tone: 'good', topic: 'growth', months: [1] },
  { key: 'expecting', label: 'Expecting a baby', phrase: 'a season of expecting', prompt: 'expecting a baby', tone: 'good', topic: 'pregnancy', retired: true },
  { key: 'win', label: 'A win came through', phrase: 'a season of good news', prompt: 'celebrating a win at work, school, or home', tone: 'good', topic: 'success', retired: true },
  { key: 'answered', label: 'Prayer answered', phrase: 'a season of answered prayer', prompt: 'thankful because God answered a prayer', tone: 'good', topic: "god's faithfulness" },
];

export const seasonByKey = (key: string | null | undefined) => SEASONS.find((s) => s.key === key) ?? null;

// Shown with anything written for a `care` season.
export const CARE_NOTE =
  'If the heaviness has become more than you can carry, you don’t have to carry it alone. In the U.S., call or text 988 any time to talk with someone right now.';

const HARD_PER_EMAIL = 4;
const GOOD_PER_EMAIL = 3;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// `count` seasons from `pool`, starting at a spot that moves forward each day, with this month's
// featured seasons first.
function pick(pool: Season[], count: number, day: number, offset: number, month: number): Season[] {
  const featured = pool.filter((s) => s.months?.includes(month));
  const rest = pool.filter((s) => !s.months?.includes(month));
  const out = featured.slice(0, count);
  if (rest.length) {
    const start = (day * (count - out.length || 1) + offset) % rest.length;
    for (let i = 0; out.length < count && i < rest.length; i++) out.push(rest[(start + i) % rest.length]);
  }
  return out;
}

// The 7 season buttons for one reader's email on one day: 4 hard, 3 good. The season they're already in
// (if any) comes first so they can stay in it; the rest rotate daily and differ from reader to reader.
// `date` is the study date (YYYY-MM-DD); `seed` is anything stable per reader (their token).
export function seasonsForEmail(date: string, seed: string, current?: string | null): Season[] {
  const d = new Date(`${date}T12:00:00Z`);
  const valid = !Number.isNaN(d.getTime());
  const day = valid ? Math.floor(d.getTime() / 86_400_000) : 0;
  const month = valid ? d.getUTCMonth() + 1 : 0;
  const offset = hash(seed);
  const pinned = seasonByKey(current);

  const hardPool = SEASONS.filter((s) => s.tone === 'hard' && !s.retired && s.key !== pinned?.key);
  const goodPool = SEASONS.filter((s) => s.tone === 'good' && !s.retired && s.key !== pinned?.key);
  const hard = pick(hardPool, HARD_PER_EMAIL - (pinned?.tone === 'hard' ? 1 : 0), day, offset, month);
  const good = pick(goodPool, GOOD_PER_EMAIL - (pinned?.tone === 'good' ? 1 : 0), day, offset >>> 3, month);

  // Alternate hard and good so no email opens with a wall of heavy choices.
  const mixed: Season[] = [];
  for (let i = 0; i < Math.max(hard.length, good.length); i++) {
    if (hard[i]) mixed.push(hard[i]);
    if (good[i]) mixed.push(good[i]);
  }
  return pinned ? [pinned, ...mixed] : mixed;
}

// How a Lamp came about. Kept with the Lamp so the email can introduce it the right way.
export type LampMeta =
  | { source: 'season'; season: string }
  | { source: 'followup'; from_date: string };
