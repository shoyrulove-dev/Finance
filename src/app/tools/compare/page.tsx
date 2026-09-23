import Link from "next/link";
import type { Metadata } from "next";
import { getCryptoRows } from "@/lib/tool-data";
import { formatCompact, formatPrice } from "@/lib/market-tools";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Compare crypto assets", description: "Compare cryptocurrency prices, daily performance, market capitalization and volume.", alternates: { canonical: "/tools/compare" } };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ assets?: string }> }) {
  const query = await searchParams;
  const slugs = [...new Set((query.assets || "bitcoin,ethereum,solana").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean))].slice(0, 6);
  const rows = await getCryptoRows(slugs);
  return <main className="data-page tool-page"><div className="data-page-heading"><div><p className="eyebrow">DECISION TOOL</p><h1>Compare crypto assets</h1><p>Review valuation, liquidity and daily price movement side by side.</p></div></div><form className="tool-form tool-form-wide" method="get"><label htmlFor="assets">Assets <small>Use names separated by commas</small></label><input id="assets" name="assets" defaultValue={slugs.join(", ")} placeholder="bitcoin, ethereum, solana"/><button type="submit">Compare assets</button></form><div className="tool-presets"><span>Popular:</span><Link href="/tools/compare/bitcoin-vs-ethereum">Bitcoin vs Ethereum</Link><Link href="/tools/compare/ethereum-vs-solana">Ethereum vs Solana</Link></div><section className="data-table-card"><div className="data-table-scroll"><table className="data-table"><thead><tr><th>Asset</th><th>Price</th><th>24h</th><th>Market cap</th><th>Volume (24h)</th></tr></thead><tbody>{rows.map(({ asset, price }) => { const move = price?.change24h == null ? null : Number(price.change24h); return <tr key={asset.slug}><td><Link className="asset-link" href={`/crypto/${asset.slug}`}><strong>{asset.name}</strong><small>{asset.symbol}</small></Link></td><td className="num">{formatPrice(price?.price)}</td><td className={`num ${move == null ? "muted" : move >= 0 ? "positive" : "negative"}`}>{move == null ? "—" : `${move >= 0 ? "+" : ""}${move.toFixed(2)}%`}</td><td className="num">{formatCompact(Number(price?.marketCap))}</td><td className="num">{formatCompact(Number(price?.volume24h))}</td></tr>; })}</tbody></table></div>{!rows.length && <p className="board-empty">No matching assets were found. Try bitcoin, ethereum or solana.</p>}</section><p className="data-footnote">Market data can be delayed and is provided for comparison, not investment advice.</p></main>;
}
