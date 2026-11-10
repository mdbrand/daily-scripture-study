import type { Metadata } from 'next';
import SectionIndex from '../SectionIndex';

export const metadata: Metadata = {
  title: 'Books of the Bible: Who Wrote Them, When and Why | Morning Lamp',
  description:
    'Guides to the books of the Bible: who wrote each one, when, what it is about, how it is organized, and the key verses with the story behind them.',
  alternates: { canonical: '/books' },
};

export default function Page() {
  return (
    <SectionIndex
      section="books"
      intro="Who wrote each book of the Bible, when, and why, with a plain summary, how it is organized, and the key verses with the story behind them."
    />
  );
}
