"use client";

import { useFormStatus } from "react-dom";

/** Submit button that reflects the pending state of its enclosing <form>. */
export function PendingButton({
  children, pendingLabel, className,
}: {
  children: React.ReactNode; pendingLabel?: string; className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel ?? "…" : children}
    </button>
  );
}
