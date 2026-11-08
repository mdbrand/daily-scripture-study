import SignupForm from './SignupForm';
import Crest from './Crest';
import BackToTop from './BackToTop';
import { SiteFooter } from './LegalShell';
import {
  compare,
  earnings,
  faqs,
  partnerSteps,
  premiumFeatures,
  premiumSteps,
  seasons,
  steps,
} from './content';

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi'];

function cell(v: boolean | string) {
  if (typeof v === 'string') return <span className="cell-text">{v}</span>;
  return v ? <span aria-label="Included">✓</span> : <span aria-label="Not included">—</span>;
}

function Lord() {
  return <span className="sc">Lord</span>;
}

export default function Home() {
  return (
    <main>
      {/* Title page */}
      <header className="title-page">
        <nav className="topbar container" aria-label="Site">
          <a className="wordmark" href="#top" id="top">
            <Crest size={34} title="" />
            <span>Morning Lamp</span>
          </a>
          <div className="toplinks">
            <a href="#sample">Sample</a>
            <a href="#premium">Premium</a>
            <a href="#partners">Partners</a>
          </div>
        </nav>

        <div className="title-block">
          <Crest size={112} />
          <h1>A few quiet minutes with God’s Word, every morning.</h1>
          <p className="lede">
            One Bible passage, the story behind it, and what it can mean for your day. Written in
            plain, simple language, for every season of life.
          </p>
          <SignupForm source="hero" tone="light" />
          <p className="title-note">
            Each study takes about five minutes. <a href="#sample">Read a sample</a>.
          </p>

          <figure className="epigraph">
            <blockquote>
              In the morning, <Lord />, you hear my voice; in the morning I lay my requests before you
              and wait expectantly.
            </blockquote>
            <figcaption>Psalm 5:3</figcaption>
          </figure>
        </div>
      </header>

      {/* Each morning */}
      <section className="chapter">
        <div className="container">
          <header className="chapter-head">
            <h2>What you’ll find each morning</h2>
            <p>One short study, built the same way every day, so you always know where you are.</p>
          </header>
          <ol className="course">
            {steps.map((s, i) => (
              <li key={s.title}>
                <span className="numeral" aria-hidden="true">
                  {ROMAN[i]}
                </span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Sample */}
      <section className="chapter tinted" id="sample">
        <div className="container split">
          <div className="split-text">
            <h2>A peek inside</h2>
            <p>
              Here’s a shortened example of a morning study. Every email carries the same parts:
              the passage, the history behind it, a voice from history, and a place to ask your own
              questions.
            </p>
            <p className="aside">Scripture is quoted from the NIV, so it reads the way people speak today.</p>
          </div>
          <article className="leaf" aria-label="Sample morning study">
            <p className="leaf-kicker">Today’s Bible Study</p>
            <blockquote className="leaf-verse">
              “Because of the <Lord />’s great love we are not consumed, for his compassions never
              fail. They are new every morning; great is your faithfulness.”
              <cite>Lamentations 3:22–23</cite>
            </blockquote>
            <h3>Behind the Verse</h3>
            <p>
              These words come from a time of deep loss. Jerusalem had just been destroyed, around
              586 BC. Tradition says the prophet Jeremiah wrote them, though the book does not name
              its author. In the middle of grief, the writer stops and remembers that God’s mercy
              shows up fresh each day.
            </p>
          </article>
        </div>
      </section>

      {/* Seasons */}
      <section className="chapter seasons-chapter">
        <div className="container narrow center">
          <h2>For every season of life</h2>
          <p className="lede-dark">
            Wherever you are, God’s Word meets you there. Morning Lamp is written for
            everyone.
          </p>
          <ul className="seasons" aria-label="Written for">
            {seasons.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Premium */}
      <section className="chapter chapel" id="premium">
        <div className="container">
          <header className="chapter-head on-dark">
            <p className="kicker">The Premium edition, $7 a month</p>
            <h2>Scripture that knows your story.</h2>
            <p>
              The free email is the same for everyone. Premium is written for you: your season of
              life, what you’re carrying, and what happened yesterday.
            </p>
          </header>

          <ol className="course on-dark three">
            {premiumSteps.map((s, i) => (
              <li key={s.title}>
                <span className="numeral" aria-hidden="true">
                  {ROMAN[i]}
                </span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>

          <div className="example">
            <p className="example-label">An example</p>
            <p className="reply">
              <span>Your reply last night</span>
              “Hard conversation with my sister. I said some things I regret.”
            </p>
            <article className="leaf">
              <p className="leaf-kicker">Looking Back at Yesterday</p>
              <blockquote className="leaf-verse">
                “If it is possible, as far as it depends on you, live at peace with everyone.”
                <cite>Romans 12:18</cite>
              </blockquote>
              <p>
                Paul wrote this around AD 57 to believers in Rome who disagreed sharply with one
                another. Notice the two small phrases: “if it is possible” and “as far as it depends
                on you.” Scripture is honest that peace is not always fully in your hands. Only your
                part is. Yesterday’s words can be the start of that part, not the end of the story.
              </p>
            </article>
          </div>

          <h3 className="subhead">What Premium includes</h3>
          <dl className="catalog">
            {premiumFeatures.map((f) => (
              <div key={f.title}>
                <dt>{f.title}</dt>
                <dd>{f.text}</dd>
              </div>
            ))}
          </dl>

          <div className="compare-wrap">
            <table className="compare">
              <caption className="sr-only">Free and Premium compared</caption>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr-only">Feature</span>
                  </th>
                  <th scope="col">Free</th>
                  <th scope="col">Premium</th>
                </tr>
              </thead>
              <tbody>
                {compare.map(([label, free, premium]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>{cell(free)}</td>
                    <td>{cell(premium)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="enroll">
            <div className="enroll-price">
              <p className="amount">
                $7<span>/month</span>
              </p>
              <p>About 23 cents a day. Cancel any time. No payment today.</p>
            </div>
            <div className="enroll-form">
              <SignupForm source="premium" defaultPlan="premium" tone="light" buttonLabel="Get early access" />
            </div>
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="chapter" id="partners">
        <div className="container">
          <header className="chapter-head">
            <p className="kicker">For Premium members</p>
            <h2>Share the Word, and earn 30% every month.</h2>
            <p>
              Know someone who would love this? Share your personal link. For every person who joins
              Premium through it, you earn 30% of their subscription, $2.10 a month, for as long as
              they stay. Refer four friends and your own Premium pays for itself.
            </p>
          </header>

          <ol className="course three">
            {partnerSteps.map((s, i) => (
              <li key={s.title}>
                <span className="numeral" aria-hidden="true">
                  {ROMAN[i]}
                </span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>

          <table className="ledger">
            <caption>What partners can earn each month</caption>
            <thead>
              <tr>
                <th scope="col">Friends who join</th>
                <th scope="col">You earn</th>
                <th scope="col">Think of it as</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((e) => (
                <tr key={e.people}>
                  <td>{e.people.toLocaleString('en-US')}</td>
                  <td className="money">{e.monthly}</td>
                  <td>{e.note}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="fine">
            Earnings count only for paying Premium members who join through your link. Each 30%
            commission is paid net 30: after your referral has paid for and completed that month.
            Payouts continue only while they stay subscribed and you remain a Premium member. Your
            own subscription doesn’t count. Please let people know you earn from your link.
          </p>
          <a className="button" href="#premium">
            Join Premium to become a partner
          </a>
        </div>
      </section>

      {/* Questions */}
      <section className="chapter tinted">
        <div className="container faq-layout">
          <header className="chapter-head">
            <h2>Questions</h2>
            <p>Anything else? Once you’re subscribed, just reply to any email.</p>
          </header>
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

      {/* Benediction */}
      <section className="chapter chapel closing" id="signup">
        <div className="container narrow center">
          <Crest size={72} />
          <figure className="epigraph on-dark">
            <blockquote>Your word is a lamp for my feet, a light on my path.</blockquote>
            <figcaption>Psalm 119:105</figcaption>
          </figure>
          <h2>Start your mornings in the Word.</h2>
          <p>Join the list and we’ll send your first study as soon as it’s ready.</p>
          <SignupForm source="closing" tone="dark" />
        </div>
      </section>

      <SiteFooter />
      <BackToTop />
    </main>
  );
}
