import { cache } from 'react';
import { getStudy, listStudies, pacificDate, type StoredStudy } from './daily';

// The daily study, published on the site once it has gone out to readers.
// Each page is something a reader can share, and one more page for search engines every day.

// NIV may be quoted freely only up to a limit, so the passage's NIV wording is shown on the most
// recent studies. Older studies keep everything else and link to the passage instead.
export const NIV_TEXT_DAYS = 60;
export const showsPassageText = (date: string) => date >= pacificDate(-NIV_TEXT_DAYS);

type Row = { study_date: string; status: string; sent_count: number };
// Public once it has been sent to at least one reader, or its date has arrived. Never while on hold.
export const isPublicStudy = (s: Row, today = pacificDate(0)) => s.status !== 'held' && (s.sent_count > 0 || s.study_date <= today);

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const publicStudy = cache(async (date: string): Promise<StoredStudy | null> => {
  if (!DATE.test(date)) return null;
  try {
    const s = await getStudy(date);
    return s && isPublicStudy(s) ? s : null;
  } catch (e) {
    console.error('publicStudy', date, e);
    return null;
  }
});

export type StudyListing = { study_date: string; title: string; ref: string; pillar: string };
// Newest first.
export const publicStudies = cache(async (): Promise<StudyListing[]> => {
  try {
    return (await listStudies(400)).filter((s) => isPublicStudy(s)).map(({ study_date, title, ref, pillar }) => ({ study_date, title, ref, pillar }));
  } catch (e) {
    console.error('publicStudies', e);
    return [];
  }
});

export const studyPath = (date: string) => `/studies/${date}`;
export const bareRef = (ref: string) => ref.replace(/\s*\((NIV|ESV|CSB|NLT|BSB)\)\s*$/i, '');
export const gatewayUrl = (ref: string) =>
  `https://www.biblegateway.com/passage/?search=${encodeURIComponent(bareRef(ref))}&version=NIV`;
