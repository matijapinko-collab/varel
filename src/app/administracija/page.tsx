import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";

/**
 * Admin entry at /administracija.
 * - Logged in  → redirect to the dashboard.
 * - Logged out → show the login screen.
 */
export default async function AdministracijaEntry() {
  const session = await auth();
  if (session?.user) redirect("/administracija/dashboard");
  return <LoginForm />;
}
