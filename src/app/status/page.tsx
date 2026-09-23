import type { Metadata } from "next";
import { getDatabase } from "@/lib/mongodb";

export const metadata: Metadata = { title: "Data Status", description: "Operational status and market data freshness for Bliss Finance.", robots: { index: false, follow: true } };
export const revalidate = 60;

export default async function StatusPage() {
  const db = await getDatabase();
  const [run, latest] = await Promise.all([
    db.collection("sync_runs").find({}).sort({ finishedAt: -1 }).limit(1).toArray(),
    db.collection("latest_prices").find({}).sort({ updatedAt: -1 }).limit(1).toArray()
  ]);
  const updatedAt = latest[0]?.updatedAt ? new Date(latest[0].updatedAt) : null;
  const ageMinutes = updatedAt ? Math.floor((Date.now() - updatedAt.getTime()) / 60000) : null;
  const healthy = ageMinutes !== null && ageMinutes < 130;
  return <main className="container"><p className="eyebrow">Data transparency</p><h1>Data status</h1><p className="intro">See when market prices were last updated.</p><section className="metric-grid"><div className="metric"><span>Data availability</span><strong className={healthy ? "positive" : "negative"}>{healthy ? "Up to date" : "Delayed"}</strong><small>Typically refreshed within 130 minutes</small></div><div className="metric"><span>Latest price update</span><strong>{ageMinutes === null ? "—" : `${ageMinutes} min ago`}</strong><small>{updatedAt?.toUTCString() || "No data"}</small></div><div className="metric"><span>Latest update</span><strong>{run[0]?.status === "success" ? "Complete" : "Pending"}</strong><small>{run[0]?.count ?? 0} prices updated</small></div><div className="metric"><span>Update frequency</span><strong>Hourly</strong><small>Stock prices follow market hours</small></div></section><p className="updated">Market hours and data sources can affect when prices change.</p></main>;
}
