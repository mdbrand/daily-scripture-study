import type { Metadata } from 'next';
import SectionIndex from '../SectionIndex';

export const metadata: Metadata = {
  title: 'Bible Verse Meanings: The Story Behind Famous Verses | Morning Lamp',
  description:
    'What famous Bible verses really mean: Jeremiah 29:11, Proverbs 3:5–6, Psalm 23 and more, with who wrote them, when, and what they meant to the first readers.',
  alternates: { canonical: '/verse-meaning' },
};

export default function Page() {
  return (
    <SectionIndex
      section="verse-meaning"
      intro="The best-known verses in the Bible, one at a time: who wrote each one, what was happening, what it meant to the people who first heard it, and what it means for us now."
    />
  );
}
