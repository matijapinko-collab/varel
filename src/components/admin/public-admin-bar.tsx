"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type EditTarget = { label: string; url: string };

/**
 * Slim WordPress-style admin bar shown on the public site when an admin is
 * logged in. It checks /api/admin/me once per browser session (cached in
 * sessionStorage) so public pages stay static and anonymous visitors make at
 * most one cheap request. The session cookie is httpOnly, so it can't be read
 * directly from the client.
 */
export function PublicAdminBar() {
  const pathname = usePathname();
  const [name, setName] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditTarget | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cached = sessionStorage.getItem("varel-admin");
    if (cached) {
      const d = JSON.parse(cached);
      if (d.admin) setName(d.name);
      return;
    }
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => {
        try {
          sessionStorage.setItem("varel-admin", JSON.stringify(d));
        } catch {
          /* ignore */
        }
        if (!cancelled && d.admin) setName(d.name);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!name) return;
    setEdit(null);
    let cancelled = false;
    fetch(`/api/admin/resolve-edit?path=${encodeURIComponent(pathname)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.url) setEdit(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [name, pathname]);

  if (!name) return null;

  return (
    <div className="sticky top-0 z-[60] flex h-9 items-center gap-4 bg-[#1d2327] px-4 text-xs text-gray-200">
      <Link href="/administracija/dashboard" className="font-semibold text-white hover:text-primary">
        <span className="text-primary">V</span>arel
      </Link>
      <Link href="/administracija/dashboard" className="hover:text-white">Dashboard</Link>

      {/* New menu */}
      <div className="relative" onMouseLeave={() => setOpen(false)}>
        <button onClick={() => setOpen((o) => !o)} className="hover:text-white">+ New</button>
        {open && (
          <div className="absolute left-0 top-full w-36 rounded-b border border-black/20 bg-[#2c3338] py-1 shadow-lg">
            {[
              { label: "Post", href: "/administracija/posts/new" },
              { label: "Page", href: "/administracija/pages/new" },
              { label: "Tool", href: "/administracija/tools/new" },
              { label: "Comparison", href: "/administracija/comparisons/new" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="block px-3 py-1.5 hover:bg-black/30 hover:text-white">
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {edit && (
        <Link href={edit.url} className="rounded bg-primary px-2 py-0.5 font-medium text-primary-foreground hover:opacity-90">
          {edit.label}
        </Link>
      )}

      <div className="ml-auto flex items-center gap-4">
        <span className="text-gray-400">Howdy, {name}</span>
        <button onClick={() => signOut({ callbackUrl: "/administracija" })} className="hover:text-white">
          Log Out
        </button>
      </div>
    </div>
  );
}
