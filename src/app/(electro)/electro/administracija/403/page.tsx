import Link from "next/link";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { electroCardCls } from "@/components/electro/ui";

export default function ElectroForbidden() {
  return (
    <div className={`mx-auto max-w-md text-center ${electroCardCls}`}>
      <h1 className="text-xl font-bold">Nemate ovlast za ovu stranicu</h1>
      <p className="mt-2 text-sm text-muted">
        Za pristup ovom dijelu aplikacije obratite se administratoru svoje tvrtke.
      </p>
      <Link href={`${ELECTRO_APP_BASE}/dashboard`} className="mt-4 inline-block font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
        ← Natrag na dashboard
      </Link>
    </div>
  );
}
