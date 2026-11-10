'use client';
import { useEffect, useRef } from 'react';

// Submits the season form as soon as the page opens, so one tap in the email is all it takes.
// (Link scanners that only fetch the page never run this, so they can't pick a season.)
export default function AutoSubmit({ formId }: { formId: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit();
  }, [formId]);
  return null;
}
