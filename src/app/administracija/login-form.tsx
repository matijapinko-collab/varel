"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";

function Form() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [needsTotp, setNeedsTotp] = useState(false);
  const [loading, setLoading] = useState(false);

  const expired = searchParams.get("reason") === "timeout";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      identifier: String(form.get("identifier") ?? ""),
      password: String(form.get("password") ?? ""),
      totp: String(form.get("totp") ?? ""),
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Login failed. Check your credentials" + (needsTotp ? " and 2FA code." : "."));
      setNeedsTotp(true); // offer the 2FA field after a failure, in case it's required
      return;
    }
    const callbackUrl = searchParams.get("callbackUrl");
    router.push(callbackUrl && callbackUrl.startsWith("/administracija") ? callbackUrl : "/administracija/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Image
            src="/branding/varel-logo.jpeg"
            alt="Varel"
            width={160}
            height={60}
            className="mx-auto h-14 w-auto rounded"
            priority
          />
          <h1 className="mt-6 text-2xl font-bold tracking-tight">Welcome back to Varel</h1>
          <p className="mt-1 text-sm text-muted">
            Log in to manage content, tools, pages and settings.
          </p>
        </div>

        {expired && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
            Your session expired due to inactivity. Please log in again.
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-card border border-border bg-card p-6 shadow-sm"
        >
          <div>
            <label htmlFor="identifier" className="mb-1 block text-sm font-medium">
              Email or username
            </label>
            <input
              id="identifier"
              name="identifier"
              autoComplete="username"
              required
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
          </div>
          {needsTotp && (
            <div>
              <label htmlFor="totp" className="mb-1 block text-sm font-medium">
                2FA code <span className="font-normal text-muted">(if enabled)</span>
              </label>
              <input
                id="totp"
                name="totp"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function LoginForm() {
  return (
    <Suspense>
      <Form />
    </Suspense>
  );
}
