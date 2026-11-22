import { probeSupabase, type SupabaseProbe } from "@/lib/ops/verify-supabase";

export function dbErrorFromUnknown(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return "database_error";
}

export function isLikelyUnreachable(message: string): boolean {
  return /fetch failed|ENOTFOUND|getaddrinfo|EAI_AGAIN|Connect Timeout/i.test(message);
}

export function unreachableSupabasePayload(probe: SupabaseProbe) {
  const host = probe.host ?? "desconocido";
  const error = `Supabase inaccesible (${host}). ${probe.error ?? "Comprueba URL, claves y que el proyecto no esté pausado."}`;

  return {
    error,
    code: "SUPABASE_UNREACHABLE" as const,
    supabaseHost: host,
    items: [] as unknown[],
    totalQualified: 0,
  };
}

export type DbApiFailBody = {
  error: string;
  code: string;
  supabaseHost?: string | null;
  items: unknown[];
  totalQualified: number;
};

export async function ensureSupabaseReachable(): Promise<
  | { ok: true; probe: SupabaseProbe }
  | { ok: false; status: number; body: DbApiFailBody }
> {
  const probe = await probeSupabase();
  if (!probe.configured) {
    return {
      ok: false,
      status: 503,
      body: {
        error: "Faltan variables Supabase en el servidor (URL o service role).",
        code: "SUPABASE_UNREACHABLE",
        supabaseHost: probe.host ?? undefined,
        items: [],
        totalQualified: 0,
      },
    };
  }
  if (!probe.reachable) {
    return { ok: false, status: 503, body: unreachableSupabasePayload(probe) };
  }
  if (!probe.listingsOk && probe.error === "schema_missing_listings") {
    return {
      ok: false,
      status: 503,
      body: {
        error:
          "El proyecto Supabase está activo pero sin tablas. Ejecuta supabase/bootstrap-completo.sql en el SQL Editor (una vez) y vuelve a /api/health.",
        code: "SCHEMA_MISSING",
        supabaseHost: probe.host ?? null,
        items: [],
        totalQualified: 0,
      },
    };
  }
  return { ok: true, probe };
}