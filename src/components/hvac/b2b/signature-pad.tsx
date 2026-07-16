"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, PenLine } from "lucide-react";

/**
 * Touch/mouse signature pad. Captures the customer's operational signature,
 * uploads it as a PNG, then finalizes (locks) the work order via the passed
 * server action. Works in light and dark modes (ink follows the theme).
 */
export function SignaturePad({
  workOrderId, finalize,
}: {
  workOrderId: string;
  finalize: (form: FormData) => Promise<void>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--foreground")?.trim() || "#0f172a";
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    dirty.current = true;
  }
  function end() { drawing.current = false; }

  function clear() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    dirty.current = false;
  }

  async function submit() {
    setError(null);
    if (!name.trim()) { setError("Unesite ime potpisnika."); return; }
    if (!dirty.current) { setError("Potreban je potpis."); return; }
    setBusy(true);
    try {
      const blob: Blob | null = await new Promise((r) => canvasRef.current!.toBlob(r, "image/png"));
      let fileAssetId = "";
      if (blob) {
        const up = new FormData();
        up.append("file", new File([blob], "potpis.png", { type: "image/png" }));
        up.append("kind", "SIGNATURE");
        up.append("entityType", "work_order_signature");
        up.append("entityId", workOrderId);
        const res = await fetch("/api/hvac-b2b/upload", { method: "POST", body: up });
        if (res.ok) fileAssetId = (await res.json())?.asset?.id ?? "";
      }
      const fd = new FormData();
      fd.append("signerName", name.trim());
      fd.append("fileAssetId", fileAssetId);
      await finalize(fd); // server action locks the work order + redirects
    } catch {
      setError("Došlo je do pogreške. Pokušajte ponovno.");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="flex items-center gap-2 font-semibold"><PenLine size={16} className="text-sky-500" /> Potpis klijenta</h3>
      <p className="mt-1 text-xs text-muted">
        Potpisom klijent potvrđuje izvedene radove. Ovo je operativni potpis, a ne kvalificirani elektronički potpis. Nakon potpisa nalog se zaključava.
      </p>

      <div className="mt-3">
        <label className="mb-1 block text-sm font-medium">Ime potpisnika</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-sky-500" />
      </div>

      <div className="mt-3">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="h-40 w-full touch-none rounded-lg border border-dashed border-border bg-background"
        />
      </div>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={clear} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:border-sky-500/50">
          <Eraser size={14} /> Obriši
        </button>
        <button type="button" onClick={submit} disabled={busy} className="rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {busy ? "Spremam…" : "Potpiši i završi nalog"}
        </button>
      </div>
    </div>
  );
}
