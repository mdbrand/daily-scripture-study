// Push events to Google Tag Manager's dataLayer (no-op if GTM isn't loaded).
type DL = Record<string, unknown>[];

export function track(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { dataLayer?: DL };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event, ...params });
}
