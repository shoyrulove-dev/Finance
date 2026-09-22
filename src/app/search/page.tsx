import type { Metadata } from "next";
import Link from "next/link";
import { getDatabase } from "@/lib/mongodb";
export const metadata: Metadata = { title: "Search Markets", description: "Search cryptocurrency and US stock market data." };
export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ q?: string }> };
function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
export default async function SearchPage({ searchParams }: Props) {
  const q = (await searchParams).q?.trim() || "";
  const rows = q ? await (await getDatabase()).collection("assets").find({ active: true, $or: [{ symbol: new RegExp(escapeRegex(q), "i") }, { name: new RegExp(escapeRegex(q), "i") }, { slug: new RegExp(escapeRegex(q), "i") }] }, { projection: { slug: 1, symbol: 1, name: 1, type: 1 } }).limit(20).toArray() : [];
  return <main className="container"><p className="eyebrow">Market search</p><h1>Find an asset</h1><form className="search-form" action="/search"><input name="q" defaultValue={q} placeholder="Bitcoin, BTC, Apple, AAPL…" aria-label="Search markets" /><button>Search</button></form>{q && <section className="search-results"><p className="muted">{rows.length} result{rows.length === 1 ? "" : "s"} for “{q}”</p>{rows.map((row) => <Link className="result-row" href={row.type === "stock" ? `/stocks/${String(row.symbol).toLowerCase()}` : `/crypto/${row.slug}`} key={`${row.type}-${row.slug}`}><span><strong>{row.name}</strong><small>{row.symbol}</small></span><em>{row.type}</em></Link>)}</section>}</main>;
}
