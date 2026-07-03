"use client";

import { useState, useTransition } from "react";
import { generateTwoFactorSecret, enableTwoFactor } from "@/server/actions/system";

export function TwoFactorSetup({ enabled }: { enabled: boolean }) {
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (enabled) {
    return (
      <div className="rounded-card border border-border bg-card p-5 text-sm">
        <span className="font-semibold">Two-factor authentication:</span>{" "}
        <span className="text-green-600 dark:text-green-400">enabled 🔐</span>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-border bg-card p-5">
      <h2 className="font-semibold">Two-factor authentication (recommended)</h2>
      {!setup ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await generateTwoFactorSecret();
              setSetup(result);
            })
          }
          className="mt-3 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          Set up 2FA
        </button>
      ) : (
        <div className="mt-3 space-y-3 text-sm">
          <p>
            1. Open your authenticator app (Google Authenticator, 1Password, Authy…) and add
            this secret manually:
          </p>
          <code className="block select-all rounded-lg bg-soft px-3 py-2 font-mono text-primary">
            {setup.secret}
          </code>
          <p className="break-all text-xs text-muted">or add via URI: {setup.uri}</p>
          <p>2. Enter the 6-digit code from the app:</p>
          <form
            action={(form) =>
              startTransition(async () => {
                try {
                  await enableTwoFactor(form);
                  setMessage("2FA enabled! You'll need a code at every login.");
                  setSetup(null);
                } catch (e) {
                  setMessage(e instanceof Error ? e.message : "Failed");
                }
              })
            }
            className="flex gap-2"
          >
            <input
              name="token"
              inputMode="numeric"
              placeholder="123456"
              className="h-10 w-32 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              Verify & enable
            </button>
          </form>
        </div>
      )}
      {message && <p className="mt-3 text-sm font-medium text-primary">{message}</p>}
    </div>
  );
}
