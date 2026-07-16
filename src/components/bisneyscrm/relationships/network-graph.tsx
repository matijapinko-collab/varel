"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Network, NetNode } from "@/lib/bisneyscrm/relationships/network";

/**
 * Full-screen star-map network (brief §18–24). Dark canvas, glowing person nodes
 * and square company nodes, pan/zoom, type filter, depth control, and a side
 * panel on node click. Dependency-free SVG (no lockfile churn in the shared repo).
 */
export function NetworkGraph({ network, depth }: { network: Network; depth: number }) {
  const router = useRouter();
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [selected, setSelected] = useState<NetNode | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const edgeTypes = useMemo(() => [...new Set(network.edges.map((e) => e.type))].sort(), [network.edges]);

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    const byDepth = new Map<number, NetNode[]>();
    for (const n of network.nodes) { const a = byDepth.get(n.depth) ?? []; a.push(n); byDepth.set(n.depth, a); }
    for (const [d, arr] of byDepth) {
      if (d === 0) { arr.forEach((n) => map.set(n.id, { x: 0, y: 0 })); continue; }
      const radius = d * 190;
      arr.forEach((n, i) => {
        const angle = (i / arr.length) * Math.PI * 2 - Math.PI / 2 + d * 0.5;
        map.set(n.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
      });
    }
    return map;
  }, [network.nodes]);

  const shownEdges = typeFilter ? network.edges.filter((e) => e.type === typeFilter) : network.edges;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border" style={{ background: "radial-gradient(ellipse at center, #131a2e 0%, #0b0f1d 70%)" }}>
      {/* Controls */}
      <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white outline-none">
          <option value="">Sve vrste</option>
          {edgeTypes.map((t) => <option key={t} value={t} className="text-black">{t}</option>)}
        </select>
        <div className="flex overflow-hidden rounded-lg border border-white/10 text-xs text-white">
          {[1, 2, 3].map((d) => (
            <Link key={d} href={`?depth=${d}`} className={`px-2.5 py-1 ${depth === d ? "bg-indigo-500" : "bg-black/40 hover:bg-black/60"}`}>{d}. razina</Link>
          ))}
        </div>
        <button onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))} className="grid h-6 w-6 place-items-center rounded border border-white/10 bg-black/40 text-white">+</button>
        <button onClick={() => setZoom((z) => Math.max(0.35, z - 0.2))} className="grid h-6 w-6 place-items-center rounded border border-white/10 bg-black/40 text-white">−</button>
        <button onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }} className="rounded border border-white/10 bg-black/40 px-2 py-0.5 text-xs text-white">Centriraj</button>
      </div>
      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2 text-[10px] text-white/80">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "#818cf8" }} /> Osoba</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "#34d399" }} /> Kandidat</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: "#f59e0b" }} /> Tvrtka</span>
        <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 border-t border-dashed border-white/60" /> Nepotvrđeno</span>
      </div>
      {network.truncated && <div className="absolute right-3 top-3 z-10 rounded-lg bg-amber-500/20 px-2 py-1 text-[10px] text-amber-200">Mreža je skraćena — smanjite dubinu.</div>}

      <svg
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onWheel={(e) => setZoom((z) => Math.min(2.5, Math.max(0.35, z - e.deltaY * 0.001)))}
        onMouseDown={(e) => { drag.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; }}
        onMouseMove={(e) => { if (drag.current) setPan({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }); }}
        onMouseUp={() => { drag.current = null; }}
        onMouseLeave={() => { drag.current = null; }}
      >
        <defs>
          <marker id="narrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#64748b" /></marker>
          <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          <g transform="translate(480, 300)">
            {shownEdges.map((e) => {
              const a = positions.get(e.source), b = positions.get(e.target);
              if (!a || !b) return null;
              const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
              return (
                <g key={e.id}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#475569" strokeWidth={1} strokeDasharray={e.verified ? undefined : "4 3"} markerEnd={e.directed ? "url(#narrow)" : undefined} />
                  <text x={mx} y={my - 3} textAnchor="middle" fill="#94a3b8" style={{ fontSize: 8 }}>{e.type}</text>
                </g>
              );
            })}
            {network.nodes.map((n) => {
              const p = positions.get(n.id); if (!p) return null;
              const color = n.type === "company" ? "#f59e0b" : n.meta.candidate ? "#34d399" : "#818cf8";
              const r = n.meta.focus ? 13 : 9;
              return (
                <g key={n.id} transform={`translate(${p.x}, ${p.y})`} className="cursor-pointer" onClick={(ev) => { ev.stopPropagation(); setSelected(n); }} filter="url(#glow)">
                  {n.type === "company"
                    ? <rect x={-10} y={-10} width={20} height={20} rx={4} fill={color} stroke={n.meta.target ? "#fff" : "rgba(255,255,255,0.3)"} strokeWidth={n.meta.target ? 2.5 : 1} />
                    : <circle r={r} fill={color} stroke={n.meta.focus ? "#fff" : "rgba(255,255,255,0.3)"} strokeWidth={n.meta.focus ? 2.5 : 1} />}
                  <text y={n.type === "company" ? 26 : r + 14} textAnchor="middle" fill="#e2e8f0" style={{ fontSize: 11, fontWeight: n.meta.focus ? 700 : 500 }}>{n.label}</text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Side panel */}
      {selected && (
        <div className="absolute right-0 top-0 z-20 flex h-full w-72 flex-col border-l border-white/10 bg-[#0b0f1d]/95 p-4 text-white backdrop-blur">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-white/50">{selected.type === "company" ? "Tvrtka" : selected.meta.candidate ? "Kandidat" : "Osoba"}</div>
              <div className="text-lg font-bold">{selected.label}</div>
            </div>
            <button onClick={() => setSelected(null)} className="text-white/50 hover:text-white">✕</button>
          </div>
          {selected.type === "company" ? (
            <dl className="space-y-1 text-sm text-white/80">
              <div>Industrija: {selected.meta.industry ?? "—"}</div>
              <div>Direktni kontakti: {selected.meta.contacts ?? 0}</div>
            </dl>
          ) : (
            <dl className="space-y-1 text-sm text-white/80">
              <div>Tvrtka: {selected.meta.company ?? "—"}</div>
              <div>Uloga: {selected.meta.role ?? "—"}</div>
            </dl>
          )}
          <div className="mt-4 flex flex-col gap-2">
            {selected.type === "person" ? (
              <>
                <Link href={`/bisneyscrm/people/${selected.id}`} className="rounded-lg bg-indigo-500 px-3 py-2 text-center text-sm font-semibold hover:opacity-90">Otvori profil</Link>
                <button onClick={() => router.push(`?personId=${selected.id}&depth=${depth}`)} className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Postavi kao središte</button>
              </>
            ) : (
              <>
                <Link href={`/bisneyscrm/companies/${selected.id.replace(/^c:/, "")}`} className="rounded-lg bg-indigo-500 px-3 py-2 text-center text-sm font-semibold hover:opacity-90">Otvori tvrtku</Link>
                <Link href={`/bisneyscrm/relationships/company-entry?companyId=${selected.id.replace(/^c:/, "")}`} className="rounded-lg border border-white/20 px-3 py-2 text-center text-sm hover:bg-white/10">Pronađi ulaz u tvrtku</Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
