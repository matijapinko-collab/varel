import Link from "next/link";
import Image from "next/image";

export type ComparisonTool = { name: string; href: string | null; logoUrl: string | null };

/** Public comparison card: Tool A vs Tool B with optional summary + CTA. */
export function ComparisonBox({
  heading,
  summary,
  toolA,
  toolB,
  ctaLabel,
  ctaUrl,
}: {
  heading?: string | null;
  summary?: string | null;
  toolA: ComparisonTool;
  toolB: ComparisonTool;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
}) {
  return (
    <section className="mt-10 rounded-card border border-border bg-card p-6">
      <h2 className="text-xl font-bold">{heading || "Compare these tools"}</h2>
      <div className="mt-4 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
        <ToolSide tool={toolA} />
        <div className="flex items-center justify-center text-sm font-bold text-muted">VS</div>
        <ToolSide tool={toolB} />
      </div>
      {summary && <p className="mt-4 text-sm text-muted">{summary}</p>}
      {ctaUrl && (
        <Link
          href={ctaUrl}
          className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {ctaLabel || "Compare full details"}
        </Link>
      )}
    </section>
  );
}

function ToolSide({ tool }: { tool: ComparisonTool }) {
  const inner = (
    <div className="flex flex-1 items-center gap-3 rounded-lg border border-border bg-background p-4">
      {tool.logoUrl ? (
        <Image src={tool.logoUrl} alt={tool.name} width={40} height={40} className="h-10 w-10 rounded object-contain" unoptimized />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded bg-soft text-sm font-bold text-primary">
          {tool.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className="font-semibold">{tool.name}</span>
    </div>
  );
  return tool.href ? (
    <Link href={tool.href} className="flex flex-1 hover:opacity-90">
      {inner}
    </Link>
  ) : (
    inner
  );
}
