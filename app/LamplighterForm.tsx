'use client';

import { useState } from 'react';
import { track } from '@/lib/track';

// Lamplighters beta application: email + one line on why.
export default function LamplighterForm({ open }: { open: boolean }) {
  const [email, setEmail] = useState('');
  const [why, setWhy] = useState('');
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  if (!open) {
    return <p className="lamp-note">All 100 spots are taken. You can still start the free daily study above.</p>;
  }
  if (state === 'done') {
    return (
      <p className="lamp-done" role="status">
        Thank you. We read every application and will email you within a few days. You’re also on the list for the free
        daily study.
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    let timezone: string | null = null;
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    } catch {
      /* ignore */
    }
    const res = await fetch('/api/lamplighters/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, why, website, timezone }),
    }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      setState('done');
      track('lamplighter_apply', { form_location: 'lamplighters' });
    } else {
      setState('error');
      setMessage(body.error || 'Something went wrong. Please try again.');
    }
  }

  return (
    <form className="lamp-form" onSubmit={submit}>
      <label htmlFor="ll-email">Email</label>
      <input
        id="ll-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      <label htmlFor="ll-why">Why would you like to join?</label>
      <textarea
        id="ll-why"
        required
        minLength={3}
        maxLength={500}
        rows={3}
        value={why}
        onChange={(e) => setWhy(e.target.value)}
        placeholder="One line is plenty."
      />
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hp"
      />
      <button type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Apply to be a Lamplighter'}
      </button>
      {state === 'error' && (
        <p className="form-error" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
