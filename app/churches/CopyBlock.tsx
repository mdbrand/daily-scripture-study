'use client';

import { useState } from 'react';
import { track } from '@/lib/track';

// A block of ready-made wording with a Copy button, for pastors pasting into an email or bulletin.
export default function CopyBlock({ label, text, id }: { label: string; text: string; id: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      track('church_copy', { block: id });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked: the text is on the page to select by hand.
    }
  }
  return (
    <div className="copy-block">
      <p className="copy-label">{label}</p>
      <p className="copy-text">{text}</p>
      <button type="button" className="copy-button" onClick={copy} aria-live="polite">
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
