import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBar } from '../ArticleView';
import { SiteFooter } from '../LegalShell';
import BackToTop from '../BackToTop';
import SignupForm from '../SignupForm';
import CopyBlock from './CopyBlock';
import { SITE } from '@/lib/articles';
import { AUTHOR } from '@/lib/articles/author';
import { jsonLd, organization, website } from '@/lib/articles/schema';
import { LEGAL } from '@/lib/legal';

const TITLE = 'Morning Lamp for Churches: Free Reading Plans to Print and Share';
const DESCRIPTION =
  'Free for churches: a printable Advent reading plan, a 2027 Bible reading plan, and ready-to-paste wording to share a daily Bible study with your congregation.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/churches' },
  openGraph: { type: 'website', url: '/churches', siteName: 'Morning Lamp', title: TITLE, description: DESCRIPTION },
};

// Wording a pastor or church administrator can paste as is. Short links are easy to print and to say aloud.
const BLOCKS = [
  {
    id: 'advent',
    label: 'Advent, for a bulletin or church email',
    text: 'Read through Advent with us. This free plan has one short Bible reading a day from November 29 to Christmas Day, about five minutes each. Print the one-page plan at morninglamp.study/advent',
  },
  {
    id: 'new-year',
    label: 'New Year, for a bulletin or church email',
    text: 'Read the whole Bible in 2027. This free plan covers every chapter in 52 weeks, about three chapters a day, starting Monday, January 4. Print the plan at morninglamp.study/2027',
  },
  {
    id: 'one-line',
    label: 'One line, for a list of announcements',
    text: 'Want a short Bible study each morning? Morning Lamp sends one passage and the story behind it, free, at 5 AM. Under three minutes. morninglamp.study',
  },
  {
    id: 'paragraph',
    label: 'A short paragraph, for a weekly email',
    text: 'A resource for your week: Morning Lamp is a free daily Bible study by email. Each morning at 5 AM it sends one passage, the history behind it, one detail most readers miss, and a voice from church history. It takes under three minutes to read. Sign up at morninglamp.study',
  },
  {
    id: 'spoken',
    label: 'To say from the front',
    text: 'If you want a simple way to be in Scripture every day, there is a free email called Morning Lamp. One passage each morning and the story behind it, in about three minutes. You can find it at morninglamp dot study.',
  },
];

const FAQS = [
  {
    q: 'Does Morning Lamp cost anything?',
    a: 'No. The daily study is free, and so are both printable reading plans. There is an optional Premium edition for individual readers at $7 a month, but nothing on this page costs your church or your people anything.',
  },
  {
    q: 'Can we print and copy the reading plans?',
    a: 'Yes. Print as many copies as you like for your congregation, classes and small groups, and share the links freely. We only ask that you leave the page as it is.',
  },
  {
    q: 'Which Bible translation does it use?',
    a: 'The daily email quotes the New International Version (NIV), word for word. Articles on the site also quote the CSB, ESV, NLT and BSB, always labeled.',
  },
  {
    q: 'Is it tied to one denomination?',
    a: 'No. Morning Lamp is written for Christians across traditions. It explains what a passage meant to its first readers, and it brings in voices from 2,000 years of church history. Where scholars or traditions disagree about a date, an author or a meaning, it says so plainly.',
  },
  {
    q: 'Who writes it?',
    a: `The studies are published under the pen name ${AUTHOR.name}, the pen name of Morning Lamp’s founder. You can read more on the author page.`,
  },
];

export default function Churches() {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      website,
      { '@type': 'WebPage', '@id': `${SITE}/churches#page`, url: `${SITE}/churches`, name: TITLE, description: DESCRIPTION },
      {
        '@type': 'FAQPage',
        '@id': `${SITE}/churches#faq`,
        mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  };
  return (
    <main className="legal-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <TopBar />
      <article className="article container">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/">Morning Lamp</Link>
        </nav>
        <h1>Share Morning Lamp with your church</h1>
        <p className="section-intro">
          Morning Lamp is a free daily Bible study by email. If you lead a church, a class or a small group, everything
          on this page is yours to use: two reading plans to print, and wording you can paste straight into a bulletin
          or a weekly email. There is nothing to buy and nothing for the church to sign up for.
        </p>

        <section aria-labelledby="plans">
          <h2 id="plans">Two free plans your church can print</h2>
          <p>
            <strong>
              <Link href="/guides/advent-reading-plan">The 2026 Advent reading plan.</Link>
            </strong>{' '}
            One short reading a day from Sunday, November 29 to Christmas Day, following the four weeks of hope, peace,
            joy and love. It fits on one page, with a box to check each day. Short link:{' '}
            <strong>morninglamp.study/advent</strong>
          </p>
          <p>
            <strong>
              <Link href="/guides/2027-bible-reading-plan">The 2027 Bible reading plan.</Link>
            </strong>{' '}
            The whole Bible in 52 weeks, about three chapters a day, starting Monday, January 4. Two pages, with a box
            to check each week. Short link: <strong>morninglamp.study/2027</strong>
          </p>
          <p>
            Each page has the full plan to read online and a printable PDF. Print as many copies as you like.
          </p>
        </section>

        <section aria-labelledby="wording">
          <h2 id="wording">Wording you can paste</h2>
          <p>Use any of these as they are, or change them to sound like you.</p>
          {BLOCKS.map((b) => (
            <CopyBlock key={b.id} id={b.id} label={b.label} text={b.text} />
          ))}
        </section>

        <section aria-labelledby="what-they-get">
          <h2 id="what-they-get">What your people will get</h2>
          <ul>
            <li>One Bible passage each morning at 5 AM their time, quoted word for word from the NIV.</li>
            <li>The history behind it: who wrote it, when, and what it meant to the people who first heard it.</li>
            <li>One detail most readers miss, and one voice from 2,000 years of church history.</li>
            <li>About three minutes to read. Free, with an unsubscribe link in every email.</li>
          </ul>
          <p>
            You can read exactly what goes out before you recommend it: every study is posted on the{' '}
            <Link href="/studies">daily studies page</Link> after it is sent.
          </p>
          <p>
            Morning Lamp is meant to sit alongside your preaching and teaching, not in place of them. It is a small
            daily habit that sends people back to their Bibles, and back to church with better questions.
          </p>
        </section>

        <section aria-labelledby="common-questions">
          <h2 id="common-questions">Common questions</h2>
          {FAQS.map((f) => (
            <div className="faq" key={f.q}>
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
          <p>
            <Link href={AUTHOR.path}>About {AUTHOR.name}</Link>
          </p>
        </section>

        <section aria-labelledby="ask">
          <h2 id="ask">Need something we haven’t made?</h2>
          <p>
            If a different format would help your church, such as a half-page bulletin insert or a slide for the
            screen, write to <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> and tell us what you need.
          </p>
        </section>

        <aside className="article-cta" aria-label="Get Morning Lamp">
          <p className="kicker">Morning Lamp</p>
          <h2>See it for yourself first</h2>
          <p>Get the daily study in your own inbox, free at 5 AM. Under three minutes to read.</p>
          <SignupForm source="churches" tone="light" hidePlanSelect buttonLabel="Become a Lamplighter" />
        </aside>
      </article>
      <SiteFooter />
      <BackToTop />
    </main>
  );
}
