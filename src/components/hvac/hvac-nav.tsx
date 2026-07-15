"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { hvacNavAnchors, HVAC_ROUTES } from "@/lib/hvac/content";
import { hvacTrack } from "@/lib/hvac/track";

function Logo() {
  return (
    <Link href={HVAC_ROUTES.landing} className="flex items-center gap-2" aria-label="Varel HVAC — početna">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 font-black text-white">V</span>
      <span className="text-lg font-bold tracking-tight">
        Varel <span className="text-sky-500">HVAC</span>
      </span>
    </Link>
  );
}

export function HvacNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header className={`sticky top-0 z-50 border-b transition-colors ${scrolled ? "border-border bg-background/85 backdrop-blur" : "border-transparent bg-background/60 backdrop-blur"}`}>
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6" aria-label="Varel HVAC navigacija">
        <Logo />

        <div className="hidden items-center gap-6 lg:flex">
          {hvacNavAnchors.map((a) => (
            <a key={a.id} href={`#${a.id}`} className="text-sm font-medium text-muted transition-colors hover:text-foreground">
              {a.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href={HVAC_ROUTES.login}
            onClick={() => hvacTrack("hvac_nav_login_click")}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:text-sky-500"
          >
            Prijava
          </Link>
          <Link
            href={HVAC_ROUTES.demo}
            onClick={() => hvacTrack("hvac_nav_demo_click")}
            className="rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            Isprobajte demo
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-lg border border-border lg:hidden"
          aria-label={open ? "Zatvori izbornik" : "Otvori izbornik"}
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
            {hvacNavAnchors.map((a) => (
              <a key={a.id} href={`#${a.id}`} onClick={() => setOpen(false)} className="rounded-lg px-2 py-2.5 text-sm font-medium hover:bg-soft">
                {a.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Link href={HVAC_ROUTES.login} onClick={() => { hvacTrack("hvac_nav_login_click"); setOpen(false); }} className="rounded-lg border border-border px-4 py-2.5 text-center text-sm font-semibold">
                Prijava
              </Link>
              <Link href={HVAC_ROUTES.demo} onClick={() => { hvacTrack("hvac_nav_demo_click"); setOpen(false); }} className="rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2.5 text-center text-sm font-semibold text-white">
                Isprobajte demo
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
