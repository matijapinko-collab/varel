/**
 * Circular author photo with a clean placeholder fallback (initials on a
 * subtle brand-tinted disc) when no photo has been uploaded yet. Server-safe.
 */
export function AuthorAvatar({
  photoUrl,
  alt,
  name,
  size = 64,
  className = "",
}: {
  photoUrl: string | null;
  alt: string;
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={alt}
        width={size}
        height={size}
        loading="lazy"
        className={`shrink-0 rounded-full border border-border object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      aria-label={alt}
      role="img"
      className={`flex shrink-0 items-center justify-center rounded-full border border-border bg-soft font-semibold text-primary ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials || "A"}
    </div>
  );
}
