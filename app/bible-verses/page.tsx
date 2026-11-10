import type { Metadata } from 'next';
import SectionIndex from '../SectionIndex';

export const metadata: Metadata = {
  title: 'Bible Verses for Every Season of Life | Morning Lamp',
  description:
    'Bible verses for anxiety, grief, gratitude, strength, love and more, each with the story behind it: who wrote it, when, and what it meant then.',
  alternates: { canonical: '/bible-verses' },
};

export default function Page() {
  return (
    <SectionIndex
      section="bible-verses"
      intro="Verses for every season of life, each with the story behind it: who wrote it, when, and what it meant to the people who first heard it."
    />
  );
}
