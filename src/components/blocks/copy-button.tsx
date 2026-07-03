"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({
  text,
  label,
  copiedLabel,
  entityId,
  locale,
}: {
  text: string;
  label: string;
  copiedLabel: string;
  entityId?: string;
  locale?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    navigator.sendBeacon?.(
      "/api/track",
      JSON.stringify({
        type: "PROMPT_COPY",
        entityType: "PROMPT",
        entityId,
        languageCode: locale,
      })
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
      {copied ? copiedLabel : label}
    </button>
  );
}
