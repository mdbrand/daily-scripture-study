import { createHmac, timingSafeEqual } from 'node:crypto';

// Minimal Stripe REST client (form-encoded), no SDK needed.
function encode(obj: Record<string, unknown>, prefix = ''): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === 'object') out.push(...encode(item as Record<string, unknown>, `${key}[${i}]`));
        else out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`);
      });
    } else if (typeof v === 'object') {
      out.push(...encode(v as Record<string, unknown>, key));
    } else {
      out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
    }
  }
  return out;
}

export async function stripe<T = Record<string, unknown>>(
  method: 'GET' | 'POST',
  path: string,
  params: Record<string, unknown> = {},
  idempotencyKey?: string,
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  const body = encode(params).join('&');
  const url = method === 'GET' && body ? `https://api.stripe.com/v1${path}?${body}` : `https://api.stripe.com/v1${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: method === 'POST' ? body : undefined,
    cache: 'no-store',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${json?.error?.message ?? JSON.stringify(json)}`);
  return json as T;
}

// Verifies the Stripe-Signature header (t=...,v1=...) with a 5-minute tolerance.
export function verifyStripeSignature(body: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const pairs = header.split(',').map((p) => p.split('='));
  const t = Number(pairs.find(([k]) => k === 't')?.[1]);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${body}`).digest();
  return pairs
    .filter(([k]) => k === 'v1')
    .some(([, sig]) => {
      const given = Buffer.from(sig ?? '', 'hex');
      return given.length === expected.length && timingSafeEqual(given, expected);
    });
}
