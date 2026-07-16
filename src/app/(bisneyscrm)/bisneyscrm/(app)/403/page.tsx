import Link from "next/link";
import { ShieldX } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Forbidden() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="max-w-md text-center">
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-500/10 text-red-500"><ShieldX size={22} /></span>
        <h1 className="text-xl font-bold">403 — Nemate pristup</h1>
        <p className="mt-2 text-sm text-muted">Ova je stranica dostupna samo superadministratoru.</p>
        <Link href="/bisneyscrm/dashboard" className="mt-4 inline-flex rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          Natrag na pregled
        </Link>
      </div>
    </div>
  );
}
