import { redirect } from "next/navigation";

/** Entrada por defecto de la app autenticada → feed Oportunidades. */
export default function AppHomePage() {
  redirect("/app/oportunidades");
}
