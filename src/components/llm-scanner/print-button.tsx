"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-primary print:hidden"
    >
      {label}
    </button>
  );
}
