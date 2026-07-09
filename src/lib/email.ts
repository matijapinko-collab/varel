import "server-only";

/**
 * Minimal transactional email sender using Resend's HTTP API (no SDK
 * dependency). Degrades gracefully: if RESEND_API_KEY is not set, sends are
 * skipped and reported as not-configured rather than throwing — so admin
 * actions never break when email isn't wired up yet.
 *
 * Env:
 *   RESEND_API_KEY      — Resend API key
 *   EMAIL_FROM          — verified from address, e.g. "Varel <noreply@varel.io>"
 *   ADMIN_NOTIFY_EMAIL  — where admin notifications go (default matija@pinko.hr)
 */

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function adminNotifyEmail(): string {
  return process.env.ADMIN_NOTIFY_EMAIL || "matija@pinko.hr";
}

export type SendResult = { sent: boolean; error?: string };

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Varel <onboarding@resend.dev>";
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set — skipping send to", opts.to);
    return { sent: false, error: "not_configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        text: opts.text,
        html: opts.html ?? textToHtml(opts.text),
        reply_to: opts.replyTo,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[email] send failed", res.status, detail.slice(0, 300));
      return { sent: false, error: `resend_${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    console.error("[email] send error", (e as Error).message);
    return { sent: false, error: (e as Error).message };
  }
}

/** Very small text→HTML fallback so plain templates render acceptably. */
function textToHtml(text: string): string {
  const esc = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const linked = esc.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.6;color:#111;white-space:pre-wrap">${linked}</div>`;
}
