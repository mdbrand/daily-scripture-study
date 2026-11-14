import type { Metadata } from 'next';
import Link from 'next/link';
import LegalShell from '../LegalShell';
import { SignInForm } from '../partners/PartnerForms';
import { getSessionEmail } from '@/lib/session';
import { KIND_LABEL, dayOf, eveningOf, myLamp, type MyLampAction, type MyMemory, type MyNote } from '@/lib/myLamp';

export const metadata: Metadata = {
  title: 'My Lamp | Morning Lamp',
  description: 'See, download or delete the notes you’ve sent Morning Lamp and what it remembers from them.',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const DONE: Partial<Record<MyLampAction | 'error', string>> = {
  forget: 'Forgotten. Morning Lamp won’t bring that up again.',
  forget_all: 'Everything Morning Lamp remembered has been forgotten. Your notes are still here.',
  keep_out: 'That note is now kept out of memory.',
  keep_in: 'That note can be remembered again.',
  delete_note: 'That note has been deleted.',
  pause: 'Memory is paused.',
  resume: 'Memory is back on.',
  delete_all: 'All your notes and everything remembered have been deleted.',
  error: 'That didn’t work. Please try again.',
};

// A plain form button. `fields` are sent with it.
function Act({ action, label, fields = {}, kind = 'link' }: { action: MyLampAction; label: string; fields?: Record<string, string>; kind?: 'link' | 'solid' }) {
  return (
    <form action="/api/my-lamp" method="post" className="mylamp-act">
      <input type="hidden" name="action" value={action} />
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className={kind === 'solid' ? 'mylamp-solid' : 'link-button'}>
        {label}
      </button>
    </form>
  );
}

// Deleting takes two taps: open, then confirm.
function Confirm({ ask, warning, children }: { ask: string; warning: string; children: React.ReactNode }) {
  return (
    <details className="mylamp-confirm">
      <summary>{ask}</summary>
      <p>{warning}</p>
      {children}
    </details>
  );
}

function Memory({ m }: { m: MyMemory }) {
  return (
    <li className="mylamp-card">
      <p className="mylamp-kind">
        {KIND_LABEL[m.kind]}
        {m.status === 'closed' ? ' · settled' : ''}
      </p>
      <h3>{m.label}</h3>
      <p className="mylamp-words">
        On {eveningOf(m.source_date)}, you wrote: “{m.quote}”
      </p>
      {m.question && m.asked_on && (
        <p className="mylamp-small">
          Asked in your check-in on {dayOf(m.asked_on)}: “{m.question}”
        </p>
      )}
      {/* A question waits only while the item is open and no later note of theirs has picked it up. */}
      {m.question && !m.asked_on && !m.recalled_on && m.status === 'open' && <p className="mylamp-small">A later check-in may ask: “{m.question}”</p>}
      {m.recalled_on && <p className="mylamp-small">Brought back up in your study on {dayOf(m.recalled_on)}.</p>}
      <div className="mylamp-actions">
        <Act action="forget" label="Forget this" fields={{ id: m.id }} />
      </div>
    </li>
  );
}

function Note({ n }: { n: MyNote }) {
  return (
    <li className="mylamp-card">
      <p className="mylamp-kind">
        Written the evening of {eveningOf(n.for_date, true)}
        {n.no_memory ? ' · kept out of memory' : ''}
      </p>
      <p className="mylamp-note">{n.reply}</p>
      <p className="mylamp-small">{n.passage_ref ? `The study written for it: ${n.passage_ref}` : 'No study was written for this note.'}</p>
      <div className="mylamp-actions">
        {n.no_memory ? (
          <Act action="keep_in" label="Allow in memory" fields={{ date: n.for_date }} />
        ) : (
          <Act action="keep_out" label="Keep out of memory" fields={{ date: n.for_date }} />
        )}
        <Confirm ask="Delete this note" warning="This deletes the note, the study written for it, and anything remembered from it. It can’t be undone.">
          <Act action="delete_note" label="Yes, delete it" fields={{ date: n.for_date }} kind="solid" />
        </Confirm>
      </div>
    </li>
  );
}

export default async function MyLampPage({ searchParams }: { searchParams: Promise<{ done?: string; signin?: string }> }) {
  const { done, signin } = await searchParams;
  const email = await getSessionEmail();

  if (!email) {
    return (
      <LegalShell title="My Lamp" backToTop={false}>
        <p>
          This page shows the notes you’ve sent Morning Lamp and what it remembers from them. You can download them,
          keep a note out of memory, or delete anything.
        </p>
        {signin && (
          <p className="form-error" role="alert" style={{ textAlign: 'left' }}>
            That sign-in link has expired or was already used. Enter your email for a new one.
          </p>
        )}
        <p>Sign in with the email address you get Morning Lamp at. We’ll send you a one-time link. No password.</p>
        <SignInForm next="/my-lamp" />
      </LegalShell>
    );
  }

  const data = await myLamp(email);
  const open = data.memories.filter((m) => m.status === 'open');
  const settled = data.memories.filter((m) => m.status === 'closed');
  const message = done ? DONE[done as MyLampAction | 'error'] : null;
  const empty = data.notes.length === 0 && data.memories.length === 0;

  return (
    <LegalShell
      title="My Lamp"
      backToTop={false}
      intro={
        <form action="/api/auth/logout" method="post" className="mylamp-who">
          <input type="hidden" name="next" value="/my-lamp" />
          <span>Signed in as {email}</span>
          <button type="submit" className="link-button">Sign out</button>
        </form>
      }
    >
      {message && (
        <p className="mylamp-done" role="status">
          {message}
        </p>
      )}

      <p>
        Each evening you can reply to Morning Lamp with a few lines about your day. Those notes are kept here so that a
        later study can pick up something you shared before, and a later check-in can ask how it went. You decide what
        stays.
      </p>

      {!data.found && <p>We don’t have a Morning Lamp subscription under {email}. If you subscribed with another address, sign out and sign in with that one.</p>}
      {data.found && empty && (
        <p>
          Nothing is here yet.{' '}
          {data.premium
            ? 'When you reply to an evening check-in, your note will appear on this page.'
            : 'Notes and Last Night’s Lamp are part of Premium.'}{' '}
          {!data.premium && <Link href="/#premium">See Premium</Link>}
        </p>
      )}

      {data.found && (
        <section aria-labelledby="remembers">
          <h2 id="remembers">What Morning Lamp remembers</h2>
          <p>
            These are things you told us that were still going on when you wrote them. Each one is in your own words,
            with the evening you wrote it. Morning Lamp only brings one up when a new note of yours is about the same
            thing, or to ask you a single follow-up question in an evening check-in.
          </p>
          <div className="mylamp-switch">
            {data.memory_off ? (
              <>
                <p>
                  <strong>Memory is paused.</strong> Nothing new is remembered, and nothing below is brought back up.
                </p>
                <Act action="resume" label="Turn memory back on" kind="solid" />
              </>
            ) : (
              <>
                <p>
                  <strong>Memory is on.</strong> You can pause it at any time. Your morning studies keep coming either way.
                </p>
                <Act action="pause" label="Pause memory" />
              </>
            )}
          </div>

          {open.length === 0 ? <p className="mylamp-none">Nothing is remembered right now.</p> : <ul className="mylamp-list">{open.map((m) => <Memory key={m.id} m={m} />)}</ul>}

          {settled.length > 0 && (
            <>
              <h3>Settled</h3>
              <p className="mylamp-small">Things a later note of yours said were over. Morning Lamp no longer brings these up.</p>
              <ul className="mylamp-list">{settled.map((m) => <Memory key={m.id} m={m} />)}</ul>
            </>
          )}

          {data.memories.length > 0 && (
            <Confirm ask="Forget everything remembered" warning="This clears the whole list above. Your notes stay, and new notes can be remembered again unless you pause memory.">
              <Act action="forget_all" label="Yes, forget all of it" kind="solid" />
            </Confirm>
          )}
        </section>
      )}

      {data.notes.length > 0 && (
        <section aria-labelledby="notes">
          <h2 id="notes">Your notes</h2>
          <p>Everything you’ve written to Morning Lamp about your day, newest first.</p>
          <ul className="mylamp-list">{data.notes.map((n) => <Note key={n.for_date} n={n} />)}</ul>
        </section>
      )}

      {data.found && !empty && (
        <section aria-labelledby="keep">
          <h2 id="keep">Download or delete everything</h2>
          <p>
            <a href="/my-lamp/export">Download your notes and what’s remembered</a> as a text file.
          </p>
          <Confirm
            ask="Delete all my notes and everything remembered"
            warning="This deletes every note you’ve sent, every Last Night’s Lamp written from them, and everything remembered. It can’t be undone. It doesn’t cancel Premium or unsubscribe you."
          >
            <Act action="delete_all" label="Yes, delete everything" kind="solid" />
          </Confirm>
        </section>
      )}

      <section aria-labelledby="how">
        <h2 id="how">How this works</h2>
        <ul>
          <li>Your notes are used only to write your own studies and check-ins. They are never sold and never shared.</li>
          <li>The studies are written with the help of AI. Anything shown as “you wrote” is checked against the note you sent, word for word, before it reaches you.</li>
          <li>If you’d rather a note not be remembered, say so in the note (“don’t remember this”) or use “Keep out of memory” above.</li>
          <li>
            Questions? Write to us from the <Link href="/contact">contact page</Link>, or read the <Link href="/privacy">privacy policy</Link>.
          </li>
        </ul>
      </section>
    </LegalShell>
  );
}
