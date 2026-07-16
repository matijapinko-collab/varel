"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RelationshipGraph, GraphNode } from "@/lib/bisneyscrm/relationships";

const KIND_COLOR: Record<GraphNode["kind"], string> = {
  focus: "#6366f1", candidate: "#10b981", contact: "#f59e0b", person: "#64748b",
};
const KIND_LABEL: Record<GraphNode["kind"], string> = {
  focus: "Osoba u fokusu", candidate: "Kandidat", contact: "Kontakt", person: "Osoba",
};

/** Dependency-free interactive graph (brief §46): pan, zoom, click, type filter. */
export function RelationshipGraph({ graph }: { graph: RelationshipGraph }) {
  const router = useRouter();
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const drag = useRef<{ x: number; y: number } | null>(null);

  const edgeTypes = useMemo(() => [...new Set(graph.edges.map((e) => e.label))].sort(), [graph.edges]);

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    const byDepth = new Map<number, GraphNode[]>();
    for (const n of graph.nodes) {
      const arr = byDepth.get(n.depth) ?? [];
      arr.push(n); byDepth.set(n.depth, arr);
    }
    for (const [depth, arr] of byDepth) {
      if (depth === 0) { arr.forEach((n) => map.set(n.id, { x: 0, y: 0 })); continue; }
      const radius = depth * 150;
      arr.forEach((n, i) => {
        const angle = (i / arr.length) * Math.PI * 2 - Math.PI / 2 + depth * 0.4;
        map.set(n.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
      });
    }
    return map;
  }, [graph.nodes]);

  const shownEdges = typeFilter ? graph.edges.filter((e) => e.label === typeFilter) : graph.edges;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card" style={{ height: 460 }}>
      <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none focus:border-indigo-500">
          <option value="">Sve vrste odnosa</option>
          {edgeTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={() => { setZoom((z) => Math.min(2.5, z + 0.2)); }} className="grid h-6 w-6 place-items-center rounded border border-border text-sm">+</button>
        <button onClick={() => { setZoom((z) => Math.max(0.4, z - 0.2)); }} className="grid h-6 w-6 place-items-center rounded border border-border text-sm">−</button>
        <button onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }} className="rounded border border-border px-2 py-0.5 text-xs">Centriraj</button>
      </div>
      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2 text-[10px]">
        {(Object.keys(KIND_COLOR) as GraphNode["kind"][]).map((k) => (
          <span key={k} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: KIND_COLOR[k] }} /> {KIND_LABEL[k]}</span>
        ))}
      </div>

      <svg
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onWheel={(e) => { setZoom((z) => Math.min(2.5, Math.max(0.4, z - e.deltaY * 0.001))); }}
        onMouseDown={(e) => { drag.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; }}
        onMouseMove={(e) => { if (drag.current) setPan({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }); }}
        onMouseUp={() => { drag.current = null; }}
        onMouseLeave={() => { drag.current = null; }}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#94a3b8" />
          </marker>
        </defs>
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} style={{ transformOrigin: "center" }}>
          <g transform="translate(400, 230)">
            {shownEdges.map((e) => {
              const a = positions.get(e.source); const b = positions.get(e.target);
              if (!a || !b) return null;
              const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
              return (
                <g key={e.id}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#94a3b8" strokeWidth={1.2} markerEnd={e.directed ? "url(#arrow)" : undefined} />
                  <text x={mx} y={my - 3} textAnchor="middle" className="fill-muted" style={{ fontSize: 9 }}>{e.label}</text>
                </g>
              );
            })}
            {graph.nodes.map((n) => {
              const p = positions.get(n.id); if (!p) return null;
              return (
                <g key={n.id} transform={`translate(${p.x}, ${p.y})`} className="cursor-pointer" onClick={() => router.push(`/bisneyscrm/people/${n.id}`)}>
                  <circle r={n.kind === "focus" ? 12 : 9} fill={KIND_COLOR[n.kind]} stroke="#fff" strokeWidth={1.5} />
                  <text y={n.kind === "focus" ? 26 : 22} textAnchor="middle" className="fill-foreground" style={{ fontSize: 11, fontWeight: n.kind === "focus" ? 700 : 500 }}>{n.label}</text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
}
