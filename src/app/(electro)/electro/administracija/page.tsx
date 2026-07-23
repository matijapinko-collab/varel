import { redirect } from "next/navigation";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";

export default function ElectroAppIndex() {
  redirect(`${ELECTRO_APP_BASE}/dashboard`);
}
