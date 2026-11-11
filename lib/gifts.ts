// Free printable plans people can ask for by email. The form signs them up for Morning Lamp;
// the PDF opens the moment they confirm (and is emailed straight away to readers already confirmed).
export const GIFTS = {
  advent: {
    name: 'Advent reading plan',
    title: '2026 Advent Bible Reading Plan',
    href: '/downloads/morning-lamp-advent-reading-plan-2026.pdf',
    about: 'One page. One short reading a day from November 29 to Christmas Day.',
  },
  '2027': {
    name: '2027 Bible reading plan',
    title: '2027 Bible Reading Plan',
    href: '/downloads/morning-lamp-2027-bible-reading-plan.pdf',
    about: 'Two pages. The whole Bible in 52 weeks, with a checkbox for every week.',
  },
} as const;

export type GiftKey = keyof typeof GIFTS;

export function giftKey(raw: unknown): GiftKey | null {
  return typeof raw === 'string' && Object.prototype.hasOwnProperty.call(GIFTS, raw) ? (raw as GiftKey) : null;
}
