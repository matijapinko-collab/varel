import Link from "next/link";

/**
 * Language tabs for translation editing. Croatian is highlighted as the
 * content-creation language per the editorial workflow.
 */
export function LangTabs({
  basePath,
  current,
  languages,
  existing,
}: {
  basePath: string;
  current: string;
  languages: { code: string; nativeName: string }[];
  existing: string[];
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      {languages.map((lang) => {
        const active = lang.code === current;
        const has = existing.includes(lang.code);
        return (
          <Link
            key={lang.code}
            href={`${basePath}?lang=${lang.code}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? "border-primary bg-primary text-primary-foreground"
                : has
                  ? "border-border bg-card text-foreground hover:border-primary"
                  : "border-dashed border-border text-muted hover:border-primary"
            }`}
          >
            {lang.nativeName}
            {lang.code === "hr" && " ✍️"}
            {!has && " +"}
          </Link>
        );
      })}
    </div>
  );
}
