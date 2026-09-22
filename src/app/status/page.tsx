import type { Metadata } from "next";
import { getDatabase } from "@/lib/mongodb";

export const metadata: Metadata = { title: "Data Status", description: "Operational status and market data freshness for Bliss Finance." };
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
  return <main className="container"><p className="eyebrow">Operations</p><h1>Data status</h1><p className="intro">A transparent view of the latest automated market-data sync.</p><section className="metric-grid"><div className="metric"><span>System status</span><strong className={healthy ? "positive" : "negative"}>{healthy ? "Operational" : "Needs attention"}</strong><small>Freshness target: under 130 minutes</small></div><div className="metric"><span>Latest market update</span><strong>{ageMinutes === null ? "—" : `${ageMinutes} min ago`}</strong><small>{updatedAt?.toUTCString() || "No data"}</small></div><div className="metric"><span>Last crawler result</span><strong>{run[0]?.status || "—"}</strong><small>{run[0]?.count ?? 0} records written</small></div><div className="metric"><span>Scheduler</span><strong>Hourly</strong><small>GitHub Actions</small></div></section><p className="updated">Data can be delayed due to providers, market hours, or scheduled-job timing.</p></main>;
}
