// The 7 one-tap seasons a Premium reader can pick in their email. When they don't reply to the evening
// check-in, Last Night's Lamp is written for the season they tapped (or picks up an earlier note).
export type Season = { key: string; label: string; phrase: string; prompt: string };

export const SEASONS: Season[] = [
  { key: 'anxious', label: 'Anxious', phrase: 'a season of worry', prompt: 'anxious and worried about what is ahead' },
  { key: 'waiting', label: 'Waiting', phrase: 'a season of waiting', prompt: 'waiting on God for something that has not come yet' },
  { key: 'grieving', label: 'Grieving', phrase: 'a season of grief', prompt: 'grieving a loss' },
  { key: 'stretched', label: 'Stretched thin', phrase: 'a stretched-thin season', prompt: 'stretched thin, tired, and carrying too much' },
  { key: 'starting-over', label: 'Starting over', phrase: 'a season of starting over', prompt: 'starting over after something ended or changed' },
  { key: 'far-from-god', label: 'Far from God', phrase: 'a season of feeling far from God', prompt: 'feeling far from God, with prayer feeling dry or quiet' },
  { key: 'grateful', label: 'Grateful', phrase: 'a grateful season', prompt: 'grateful and wanting to thank God for what is going well' },
];

export const seasonByKey = (key: string | null | undefined) => SEASONS.find((s) => s.key === key) ?? null;

// How a Lamp came about. Kept with the Lamp so the email can introduce it the right way.
export type LampMeta =
  | { source: 'season'; season: string }
  | { source: 'followup'; from_date: string };
