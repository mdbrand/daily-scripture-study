import type { Metadata } from 'next';
import Link from 'next/link';
import LegalShell from '../../../LegalShell';
import AutoSubmit from './AutoSubmit';
import { CARE_NOTE, seasonByKey } from '@/lib/seasons';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = { title: 'Your season | Morning Lamp', robots: { index: false, follow: false } };

// Where a season button in a Premium email lands. Opens, saves the season, and confirms.
export default async function SeasonTap({
  params,
  searchParams,
}: {
  params: Promise<{ token: string; season: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { token, season: key } = await params;
  const { done } = await searchParams;
  const season = seasonByKey(key);

  if (!season) {
    return (
      <LegalShell title="We didn’t recognize that season">
        <p>
          Try tapping a season in your Morning Lamp email again, or reply to any Morning Lamp email and tell us how
          you’re doing.
        </p>
      </LegalShell>
    );
  }
  if (done === '1') {
    return (
      <LegalShell title={`Got it: ${season.phrase}`}>
        <p>
          Tomorrow morning’s Last Night’s Lamp will be written for {season.phrase}: a passage for it, the story
          behind that passage, and a voice from Christian history who walked through it too.
        </p>
        {season.care && <p>{CARE_NOTE}</p>}
        <p>
          Want it to be even more yours? Tonight, reply to the evening check-in with a line about your day, and we’ll
          write tomorrow’s study from your own words.
        </p>
        <p className="form-note">You can change your season anytime by tapping a different one in any Premium email.</p>
      </LegalShell>
    );
  }
  if (done === 'premium') {
    return (
      <LegalShell title="Seasons are part of Premium">
        <p>
          Last Night’s Lamp, including seasons, comes with Morning Lamp Premium. <Link href="/#premium">See Premium</Link>.
        </p>
      </LegalShell>
    );
  }
  if (done === '0') {
    return (
      <LegalShell title="We couldn’t save that">
        <p>
          This link may be out of date. Write to <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> and we’ll set it
          for you.
        </p>
      </LegalShell>
    );
  }

  return (
    <LegalShell title={`Saving ${season.phrase}…`}>
      <form id="season-form" action="/api/season" method="post">
        <input type="hidden" name="t" value={token} />
        <input type="hidden" name="s" value={season.key} />
        <p>One moment. If this page doesn’t move on by itself, tap the button.</p>
        <button type="submit" className="button">Write tomorrow’s study for {season.phrase}</button>
      </form>
      <AutoSubmit formId="season-form" />
    </LegalShell>
  );
}
