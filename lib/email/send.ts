// Send email through Resend's HTTP API. Server-side only: needs RESEND_API_KEY.
export type SendInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
};

export function resendKey(): string | undefined {
  return process.env.RESEND_API_KEY || process.env.Resend_API_Key;
}

export async function sendEmail(input: SendInput): Promise<{ id: string }> {
  const key = resendKey();
  const from = process.env.DSS_FROM_EMAIL;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  if (!from) throw new Error('DSS_FROM_EMAIL is not set (e.g. "Morning Lamp <study@morninglamp.study>")');

  const replyTo = input.replyTo || process.env.DSS_REPLY_TO_EMAIL;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(input.headers ? { headers: input.headers } : {}),
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(body)}`);
  return { id: body.id };
}

// Lists the sending domains on the Resend account (names + status only).
export async function listDomains(): Promise<{ name: string; status: string }[]> {
  const key = resendKey();
  if (!key) throw new Error('RESEND_API_KEY is not set');
  const res = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(body)}`);
  return (body.data ?? []).map((d: { name: string; status: string }) => ({ name: d.name, status: d.status }));
}
