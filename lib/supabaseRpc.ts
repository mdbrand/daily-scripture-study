// Call a Supabase SQL function with the public (publishable) key. Server-side use.
export async function rpc<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase is not configured');
  const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(args),
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`rpc ${fn} ${res.status}: ${text}`);
  return (text ? JSON.parse(text) : null) as T;
}

export async function getFounderStats() {
  return rpc<{ sold: number; price_cents: number }>('dss_founders_stats');
}
