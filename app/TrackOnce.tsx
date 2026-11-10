'use client';

import { useEffect } from 'react';
import { track } from '@/lib/track';

// Pushes one analytics event when a page loads (e.g. "email confirmed", "purchase").
// `onceKey` stops refreshes from counting twice in the same browser.
export default function TrackOnce({ event, params = {}, onceKey }: { event: string; params?: Record<string, unknown>; onceKey?: string }) {
  useEffect(() => {
    const key = `ml_tracked_${onceKey ?? event}`;
    try {
      if (onceKey && window.sessionStorage.getItem(key)) return;
      if (onceKey) window.sessionStorage.setItem(key, '1');
    } catch {
      // storage blocked: still send the event
    }
    track(event, params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
