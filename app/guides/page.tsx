import type { Metadata } from 'next';
import SectionIndex from '../SectionIndex';

export const metadata: Metadata = {
  title: 'Bible Study Guides | Morning Lamp',
  description:
    'Plain-language guides to reading and studying the Bible: where to start, how to study a passage, and a free one-year reading plan.',
  alternates: { canonical: '/guides' },
};

export default function Page() {
  return (
    <SectionIndex
      section="guides"
      intro="Plain-language guides to reading and studying the Bible, written for people of every age and season of life."
    />
  );
}
