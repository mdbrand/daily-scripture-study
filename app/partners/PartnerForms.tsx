'use client';

import { useState } from 'react';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    const res = await fetch('/api/auth/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, next: '/partners' }),
    }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      setState('sent');
    } else {
      setState('error');
      setMessage(body.error || 'Something went wrong. Please try again.');
    }
  }

  if (state === 'sent') {
    return (
      <p className="form-note" role="status">
        Check your inbox for a sign-in link from Morning Lamp. It works once and expires in 30 minutes.
      </p>
    );
  }

  return (
    <form className="partner-form" onSubmit={submit}>
      <label htmlFor="signin-email">Your email</label>
      <div className="partner-row">
        <input
          id="signin-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <button type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
        </button>
      </div>
      {state === 'error' && <p className="form-error" role="alert">{message}</p>}
    </form>
  );
}

export function JoinForm({ suggested }: { suggested: string }) {
  const [code, setCode] = useState(suggested);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/partners/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, agree }),
    }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      window.location.reload();
      return;
    }
    setBusy(false);
    setError(body.error || 'Something went wrong. Please try again.');
  }

  return (
    <form className="partner-form" onSubmit={submit}>
      <label htmlFor="partner-code">Choose your link name</label>
      <div className="partner-link-preview">
        morninglamp.study/?ref=<strong>{code || 'your-name'}</strong>
      </div>
      <input
        id="partner-code"
        required
        minLength={3}
        maxLength={24}
        pattern="[a-z0-9][a-z0-9\-]{2,23}"
        value={code}
        onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
        aria-describedby="partner-code-hint"
      />
      <p id="partner-code-hint" className="form-note">3–24 lowercase letters, numbers, or dashes.</p>
      <label className="partner-check">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required />
        <span>
          I agree to the <a href="/terms#partners" target="_blank">partner terms</a>, including telling people
          I earn a commission when I share my link.
        </span>
      </label>
      <button type="submit" disabled={busy || !agree}>
        {busy ? 'Creating your link…' : 'Become a partner'}
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="partner-row">
      <input readOnly value={url} aria-label="Your partner link" onFocus={(e) => e.currentTarget.select()} />
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* clipboard blocked: the field is selectable */
          }
        }}
      >
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}
