import type { Metadata } from 'next';
import SectionIndex from '../SectionIndex';

export const metadata: Metadata = {
  title: 'What Does the Bible Say About…? | Morning Lamp',
  description:
    'Plain, fair answers to common questions about what the Bible says, with the key verses, the history behind them, and how Christian traditions have understood them.',
  alternates: { canonical: '/topics' },
};

export default function Page() {
  return (
    <SectionIndex
      section="topics"
      intro="Plain, fair answers to common questions about what the Bible says, with the key verses and how Christians across traditions have understood them."
    />
  );
}
