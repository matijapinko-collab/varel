"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function MobileNav({ items }: { items: { label: string; url: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen(!open)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted hover:text-foreground"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-16 z-50 border-b border-border bg-background p-4 shadow-lg">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {items.map((item) => (
              <Link
                key={item.url + item.label}
                href={item.url}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-soft"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
