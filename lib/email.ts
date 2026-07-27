// Sending mail, when there is anything to send it with.
//
// The platform has run on two free tiers and no email provider. Rather than
// make that a hard dependency, everything here is optional: with no API key
// configured `sendEmail` reports that it did nothing, and the caller falls back
// to the admin reset queue. Nothing breaks when the key is absent, removed, or
// out of quota.
//
// Resend is the intended provider. It is a single HTTPS call with no SMTP
// settings to get wrong, its free tier is 3,000 messages a month and 100 a day,
// and password resets will not come close to that. Deliberately NOT used for
// bulk mail: a weekly digest to every contributor would eat the daily allowance
// that resets depend on. If a digest is ever sent it should go through a
// separate provider and a separate key.
//
// No SDK, so this adds no dependency to a project that has kept its dependency
// list to eight packages.

const API = 'https://api.resend.com/emails';

// Must be an address on a domain verified with the provider, or the send is
// rejected. Overridable so the sending identity can change without a deploy.
const FROM = process.env.EMAIL_FROM ?? 'Unkad <no-reply@unkad.com>';

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export type SendResult =
  | { sent: true }
  | { sent: false; reason: 'not-configured' | 'failed'; detail?: string };

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'not-configured' };

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [opts.to],
        subject: opts.subject,
        text: opts.text,
      }),
      // A slow provider must not hold a request open. Failing here is safe:
      // the caller falls back to the queue.
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      // Body, not just status: the provider explains refusals (unverified
      // domain, quota, bad address) in a way the status code does not.
      const detail = await res.text().catch(() => '');
      return { sent: false, reason: 'failed', detail: `${res.status} ${detail.slice(0, 200)}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: 'failed', detail: e instanceof Error ? e.message : 'unknown' };
  }
}
