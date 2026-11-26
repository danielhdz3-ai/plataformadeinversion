import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Contraportada pública del landing: chollos reales del scraper,
 * sin auth (solo devuelve campos ya públicos en el anuncio origen).
 */
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, title, price, city, postal_code, thumbnail_url, source_portal, bedrooms, sqm, opportunity_discount_pct, opportunity_valuation_mid, property_kind"
    )
    .eq("status", "active")
    .eq("operation", "sale")
    .eq("is_opportunity", true)
    .not("opportunity_valuation_mid", "is", null)
    .gte("opportunity_discount_pct", 15)
    .order("opportunity_discount_pct", { ascending: false })
    .limit(24);

  if (error) {
    return NextResponse.json({ items: [] });
  }

  const items = (data ?? []).map((r) => ({
    id: r.id as string,
    title: (r.title as string) ?? null,
    price: Number(r.price),
    city: (r.city as string) ?? null,
    postalCode: (r.postal_code as string) ?? null,
    thumbnailUrl: (r.thumbnail_url as string) ?? null,
    sourcePortal: (r.source_portal as string) ?? null,
    bedrooms: (r.bedrooms as number) ?? null,
    sqm: (r.sqm as number) ?? null,
    discountPct: r.opportunity_discount_pct != null ? Number(r.opportunity_discount_pct) : null,
    valuationMid: r.opportunity_valuation_mid != null ? Number(r.opportunity_valuation_mid) : null,
  }));

  return NextResponse.json({ items });
}
