"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

export function DeleteButton({
  action,
  label = "Delete",
  confirmText = "Are you sure? This archives the item (soft delete).",
}: {
  action: () => Promise<void>;
  label?: string;
  confirmText?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm(confirmText)) {
          startTransition(async () => {
            await action();
          });
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-red-500 hover:border-red-500 disabled:opacity-50"
      aria-label={label}
    >
      <Trash2 size={13} /> {label}
    </button>
  );
}
