import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  if (!query) return NextResponse.json({ data: [] });
  const db = await getDatabase();
  const pattern = new RegExp(escapeRegex(query), "i");
  const rows = await db.collection("assets").find({ active: true, $or: [{ symbol: pattern }, { name: pattern }, { slug: pattern }] }, { projection: { slug: 1, symbol: 1, name: 1, type: 1 } }).limit(20).toArray();
  return NextResponse.json({ data: rows.map((row) => ({ slug: row.slug, symbol: row.symbol, name: row.name, type: row.type })) });
}
