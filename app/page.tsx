import SignupForm from './SignupForm';
import Crest from './Crest';
import BackToTop from './BackToTop';
import FoundersOffer from './FoundersOffer';
import PremiumPlans from './PremiumPlans';
import { SiteFooter } from './LegalShell';
import { faqs, voices } from './content';
import { lamplighterStats } from '@/lib/lamplighters';
import { premiumCheckoutOpen } from '@/lib/premium';
import type { Metadata } from 'next';
import Link from 'next/link';
import { homeSchema, jsonLd } from '@/lib/articles/schema';
import { ARTICLES, articlePath } from '@/lib/articles';
import AuthorAvatar from './AuthorAvatar';

// The home page's guide library, grouped so each link can be short. Column headings carry the search phrase.
const byTitle = (a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title);
const guideColumns = [
  {
    section: 'bible-verses',
    heading: 'Bible verses about',
    more: 'See all',
    items: ARTICLES.filter((a) => a.section === 'bible-verses').sort(byTitle),
    label: (a: { title: string }) => a.title.replace(/^Bible Verses About /, '').replace(/:.*$/, ''),
  },
  {
    section: 'books',
    heading: 'Books of the Bible',
    more: 'See all',
    items: ARTICLES.filter((a) => a.section === 'books').sort(byTitle),
    label: (a: { title: string }) => (a.title.match(/Book of ([^?:]+)/)?.[1] ?? a.title).trim(),
  },
  {
    section: 'verse-meaning',
    heading: 'What this verse means',
    more: 'See all',
    items: ARTICLES.filter((a) => a.section === 'verse-meaning').sort(byTitle),
    label: (a: { title: string; verseRef?: string }) => a.verseRef ?? a.title.replace(/ Meaning:.*$/, ''),
  },
  {
    section: 'topics',
    heading: 'What the Bible says about',
    more: 'See all',
    items: ARTICLES.filter((a) => a.section === 'topics').sort(byTitle),
    label: (a: { title: string }) => (a.title.match(/Say About ([^?:]+)/i)?.[1] ?? a.title).trim(),
  },
  {
    section: 'guides',
    heading: 'How to study the Bible',
    more: 'See all',
    items: ARTICLES.filter((a) => a.section === 'guides').sort(byTitle),
    label: (a: { title: string }) => a.title.replace(/:.*$/, ''),
  },
] as const;

export const metadata: Metadata = {
  title: 'Free Daily Bible Study by Email | Morning Lamp',
  description:
    'A free daily Bible study and devotional by email: one passage, the story behind it, and a voice from church history. Under three minutes, every morning at 5 AM.',
  alternates: { canonical: '/' },
};

export const revalidate = 300; // refresh the Lamplighter spots count every few minutes

function Lord() {
  return <span className="sc">Lord</span>;
}

// A real morning email, shown instead of described.
function EmailPreview() {
  return (
    <div className="mail" id="sample-email" aria-label="A sample Morning Lamp email">
      <div className="mail-bar">
        <span className="mail-brand">Morning Lamp</span>
        <span className="mail-badge">Free edition</span>
      </div>
      <div className="mail-body">
        <p className="mail-kicker">Today’s Bible Study</p>
        <p className="mail-title">“Be still” first meant “let go”</p>
        <blockquote className="mail-verse">
          “Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth.”
          <cite>Psalm 46:10</cite>
        </blockquote>
        <p className="mail-h">Behind the Verse</p>
        <p className="mail-p">
          The Hebrew word behind “be still” means to let go or stop. Many scholars hear verse 10 as God speaking to the
          warring nations around it: put down your weapons, and recognize who is God.
        </p>
        <div className="mail-voice">
          <p className="mail-voice-name">
            Martin Luther <span>1483–1546</span>
          </p>
          <p className="mail-p">
            Wrote “A Mighty Fortress Is Our God” as a paraphrase of Psalm 46, around 1529.
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  const [spots, checkoutOpen] = await Promise.all([lamplighterStats(), premiumCheckoutOpen().catch(() => false)]);
  // A big "spots left" number early on only tells visitors how few have joined. Show it once it creates urgency.
  const showCount = spots.left <= 30;

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(homeSchema(faqs)) }} />
      {/* Lamplighter offer: top bar (only while spots remain) */}
      {spots.open && (
        <p className="ll-bar">
          <span>
            <strong>Limited time:</strong> the first {spots.spots} Lamplighters get Premium free for life.
          </span>
          <a href="#lamplighters">Become a Lamplighter</a>
        </p>
      )}

      {/* Hero */}
      <header className="title-page">
        <nav className="topbar container" aria-label="Site">
          <a className="wordmark" href="#top" id="top">
            <Crest size={34} title="" />
            <span>Morning Lamp</span>
          </a>
          <div className="toplinks">
            <a href="/bible-verses">Bible Verses</a>
            <a href="#sample">Sample</a>
            <a href="#premium">Premium</a>
            <a href="#lamplighters">Lamplighters</a>
          </div>
        </nav>

        <div className="title-block">
          <Crest size={96} />
          <p className="kicker hero-kicker">A free daily Bible study by email</p>
          <h1>Every verse has a story.</h1>
          <p className="hero-sub">And sometimes, that story is exactly what you need to hear.</p>
          <div className="letter-open">
            <p>
              Morning Lamp is a free daily Bible study that brings together Scripture, the life and teachings of Jesus,
              and the voices of Christians throughout history.
            </p>
            <p>
              From the early Church Fathers to pastors, reformers, missionaries, and writers, you’ll discover how people
              across the centuries understood and lived out God’s Word.
            </p>
            <p>
              And with Premium, you can connect that same biblical wisdom to what’s happening in your own life.
            </p>
            <p className="hero-facts">
              Every morning at <strong>5 AM</strong>. Under <strong>three minutes</strong> to read. Delivered right to
              your inbox.
            </p>
          </div>
          <SignupForm source="hero" tone="light" hidePlanSelect buttonLabel="Become a Lamplighter" foundingOpen={spots.open} />
          {spots.open && (
            <p className="hero-founding">
              The first {spots.spots} Lamplighters get Premium free for life.{' '}
              <strong>{showCount ? `${spots.left} of ${spots.spots} spots left.` : 'Founding spots are open.'}</strong>
            </p>
          )}
        </div>
      </header>

      {/* The world behind the verse */}
      <section className="chapter" id="world">
        <div className="container">
          <h2 className="center">Not just a verse of the day. The world behind it.</h2>
          <div className="prose narrow-prose">
            <p>
              Have you ever read a Bible verse and wondered what was happening when it was written? Or how Christians
              hundreds of years ago understood those same words?
            </p>
            <p>That’s what makes Morning Lamp different.</p>
            <p>
              Every study starts with Scripture, quoted word for word from the NIV, with Jesus at the center. Then we
              look at the history behind the passage and learn from Christians who came before us, people like
              Augustine, Martin Luther, Matthew Henry, Charles Spurgeon, and Corrie ten Boom.
            </p>
          </div>
          <ol className="ages" aria-label="Voices you’ll meet">
            {voices.map((v) => (
              <li key={v.name}>
                <span className="ages-year">{v.year}</span>
                <span className="ages-name">{v.name}</span>
                <span className="ages-work">{v.work}</span>
              </li>
            ))}
          </ol>
          <div className="prose narrow-prose">
            <p>
              Some lived nearly 2,000 years ago. Others lived in our grandparents’ lifetime. They faced different
              challenges, lived in different cultures, and sometimes disagreed. But their writings, sermons, and
              experiences give us a remarkable window into the history of our faith.
            </p>
            <p>
              We use real sources and real dates, and we never make up a quote. When something is uncertain or scholars
              disagree, we say so.
            </p>
            <p className="prose-strong">No made-up quotes. No opinions dressed up as Scripture.</p>
            <p>
              Just God’s Word, its historical setting, and the voices of those who spent their lives studying and
              following Jesus. A little of that history, every morning, in under three minutes.
            </p>
          </div>
        </div>
      </section>

      {/* Premium: Last Night's Lamp */}
      <section className="chapter chapel premium-center" id="premium">
        <div className="container">
          <header className="chapter-head on-dark">
            <p className="kicker">{checkoutOpen ? 'Premium · $7 a month or $47 a year' : 'Premium'}</p>
            <h2>What if your Bible study also understood what you’re going through?</h2>
          </header>
          <div className="prose narrow-prose on-dark-prose">
            <p>This is my favorite part of Morning Lamp.</p>
            <p>
              We all have different things happening in our lives. Maybe you’re worried about your children. Maybe work
              is stressful. Maybe you’re facing a difficult decision, dealing with disappointment, or simply trying to
              grow in your faith.
            </p>
            <p>
              With Premium, you can take a moment each evening to share how your day went: what happened, what you’re
              thankful for, what’s bothering you, what’s on your heart.
            </p>
            <p>
              Everyone gets the same daily study. Premium adds one thing on top of it: the next morning, your study
              includes <strong>Last Night’s Lamp</strong>, a short study written for what you shared. You still receive Scripture, the history behind it, and wisdom from the Church through the
              centuries, now connected to what you’re actually living.
            </p>
          </div>

          <div className="example">
            <p className="reply">
              <span>Your reply last night</span>
              “Hard conversation with my sister. I said some things I regret.”
            </p>
            <article className="leaf">
              <p className="leaf-kicker">Last Night’s Lamp</p>
              <blockquote className="leaf-verse">
                “If it is possible, as far as it depends on you, live at peace with everyone.”
                <cite>Romans 12:18</cite>
              </blockquote>
              <p>
                Paul wrote this to believers in Rome who disagreed sharply. Notice “as far as it depends on you.” Peace
                isn’t fully in your hands. Only your part is.
              </p>
            </article>
          </div>

          <p className="season-note">
            Busy night? Tap the season you’re in, like Waiting, Grieving or Grateful, and the next morning’s Lamp is
            written for that.
          </p>

          <div className="prose narrow-prose on-dark-prose">
            <p>
              It’s not about changing Scripture to fit your life. It’s about helping you see how Scripture speaks to
              your life.
            </p>
            <p>
              And it doesn’t replace prayer, your pastor, or your own time with God. It’s simply another way to spend
              meaningful time in His Word.
            </p>
          </div>

          {/* Founders appears only when switched on in the database (dss_config.founders_open). */}
          <FoundersOffer />
          {checkoutOpen ? (
            <>
              <PremiumPlans />
              <p className="fine on-dark-fine">Your free morning study comes with it.</p>
            </>
          ) : spots.open ? (
            // During the beta, the first 100 Lamplighters get Premium free for life instead of a paid waitlist.
            <div className="beta-cta">
              <p className="beta-cta-title">
                Right now, the first {spots.spots} Lamplighters receive Premium free for life.
              </p>
              <p>
                Join and confirm your email to claim yours.
              </p>
              <a className="button gold" href="#lamplighters">
                Become a Lamplighter
              </a>
              <p className="beta-price">After the first {spots.spots}, Premium is $7 a month or $47 a year.</p>
            </div>
          ) : (
            <p className="fine on-dark-fine">Premium is $7 a month or $47 a year. The daily study is always free.</p>
          )}
        </div>
      </section>

      {/* A morning with Morning Lamp */}
      <section className="chapter tinted" id="sample">
        <div className="container split see-it">
          <div>
            <h2>Here’s what a morning with Morning Lamp looks like.</h2>
            <div className="prose">
              <p>At 5 AM, your study arrives in your inbox.</p>
              <p>
                You open it, read the day’s Scripture, discover the story behind the passage, and hear from a Christian
                who reflected on the same words centuries ago.
              </p>
              <p>If you have Premium, Last Night’s Lamp follows, written for what you shared the night before.</p>
              <p>All in under three minutes.</p>
              <p className="sample-note">
                The study shown here is on Psalm 46:10. Most of us read “be still” as “relax.” The Hebrew word means to
                let go, and in its first setting many scholars hear it as a call to warring nations to stop.
              </p>
            </div>
            <a className="text-link" href="#sample-email">
              Read a real Morning Lamp study <span aria-hidden="true">↓</span>
            </a>
          </div>
          <EmailPreview />
        </div>
      </section>

      {/* A note from Ezra */}
      <section className="chapter" id="ezra">
        <div className="container narrow">
          <article className="ezra-note">
            <header className="ezra-note-head">
              <AuthorAvatar size={56} />
              <h2>A little note from Ezra.</h2>
            </header>
            <p>I started Morning Lamp because I wanted something different for my own mornings.</p>
            <p>
              I didn’t want another inspirational quote or someone’s personal opinion about what a Bible verse should
              mean to me.
            </p>
            <p>
              I wanted to understand Scripture better. I wanted to know more about Jesus. And I wanted to learn from the
              incredible history of people who spent their lives studying, teaching, defending, and living out the
              Christian faith.
            </p>
            <p>
              The more I explored Church history, the more I realized how much I had never been taught. There were
              centuries of letters, sermons, books, and stories filled with lessons that still matter today. And I kept
              thinking, why aren’t more of us reading this stuff?
            </p>
            <p>
              So I started putting together a simple daily study that brought those things into one place. Then I
              wondered what it would look like if that study could also connect to what was happening in my own life.
            </p>
            <p>That’s how Morning Lamp came together.</p>
            <p>
              I wanted something simple enough to read with my morning coffee, but meaningful enough to think about
              throughout the day. Something that would help me understand God’s Word, learn from the people who came
              before me, and become more intentional about how I live.
            </p>
            <p>I’m still learning, too.</p>
            <p>
              And that’s really why I’m inviting you. Not because I’ve figured everything out, but because I think
              there’s something special about learning and growing together.
            </p>
            <p className="ezra-sign">
              <span className="signature">Ezra</span>
              <a className="penname" href="/authors/ezra-lampwright">
                Ezra Lampwright is the pen name of Morning Lamp’s founder
              </a>
            </p>
          </article>
        </div>
      </section>

      {/* Lamplighters: the one opt-in */}
      <section className="chapter tinted" id="lamplighters">
        <div className="container lamp-wrap">
          <div>
            <p className="kicker">
              Lamplighters
              {spots.open ? (showCount ? ` · ${spots.left} of ${spots.spots} founding spots left` : ' · founding spots open') : ''}
            </p>
            <h2>There’s a place for you here.</h2>
            <p className="lamp-lede">
              I’m calling the people who join Morning Lamp <em>Lamplighters</em>: a small community of people who want
              to start their mornings with Scripture, learn from the history of our faith, and grow a little each day.
            </p>
            <p className="lamp-lede">
              The daily Bible study is free.
              {spots.open
                ? ` And as a thank-you for helping get this started, the first ${spots.spots} Lamplighters receive Premium free for life.`
                : ''}
            </p>
            <p className="lamp-lede">
              No complicated process. Just enter your email and tap “Confirm” in the note I send you. Your first study
              arrives at 5 AM. I’d love for you to be part of it.
            </p>
          </div>
          <div>
            <SignupForm source="lamplighters" tone="light" hidePlanSelect buttonLabel="Become a Lamplighter" foundingOpen={spots.open} />
            <p className="lamp-fine">
              Free daily Bible study.{spots.open ? ` Premium free for life for the first ${spots.spots}.` : ''}
            </p>
          </div>
        </div>
      </section>

      {/* Questions */}
      <section className="chapter tinted">
        <div className="container narrow">
          <h2 className="center">You might be wondering</h2>
          <div className="faq">
            {faqs.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Free guides: internal links to the article library */}
      <section className="chapter guides-strip">
        <div className="container">
          <header className="center guides-head">
            <h2>Free Bible study guides</h2>
            <p className="letter-lead">
              Can’t wait until tomorrow morning? Start with one of these. Each verse comes with the story behind it.
            </p>
          </header>
          <div className="guide-index">
            {guideColumns.filter((col) => col.items.length > 0).map((col) => (
              <nav className="guide-row" key={col.section} aria-labelledby={`gc-${col.section}`}>
                <h3 id={`gc-${col.section}`}>
                  <Link href={`/${col.section}`}>{col.heading}</Link>
                </h3>
                <div className="guide-row-body">
                  <ul>
                    {col.items.map((a) => (
                      <li key={a.slug}>
                        <Link href={articlePath(a)} title={a.title}>
                          {col.label(a)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link className="guide-all" href={`/${col.section}`}>
                    {col.more} <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </nav>
            ))}
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="chapter chapel closing" id="signup">
        <div className="container narrow center">
          <Crest size={64} />
          <figure className="epigraph on-dark">
            <blockquote>Your word is a lamp for my feet, a light on my path.</blockquote>
            <figcaption>Psalm 119:105 (NIV)</figcaption>
          </figure>
          <h2>Morning Lamp</h2>
          <p className="closing-tagline">Every verse has a story.</p>
          <a className="button gold" href="#lamplighters">
            Become a Lamplighter
          </a>
        </div>
      </section>

      <SiteFooter />
      <BackToTop />
    </main>
  );
}
