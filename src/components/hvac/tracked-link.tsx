"use client";

import Link from "next/link";
import { hvacTrack } from "@/lib/hvac/track";

/** A Link that fires a non-personal GA event on click. Used for CTAs inside
 * server-rendered sections. */
export function TrackedLink({
  href,
  event,
  params,
  className,
  children,
  ariaLabel,
}: {
  href: string;
  event: string;
  params?: Record<string, string | number | boolean>;
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <Link href={href} aria-label={ariaLabel} className={className} onClick={() => hvacTrack(event, params)}>
      {children}
    </Link>
  );
}
