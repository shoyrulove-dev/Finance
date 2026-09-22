export function PriceChart({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="chart-empty">Historical chart will appear after more snapshots are collected.</div>;
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${100 - ((value - min) / range) * 86 - 7}`).join(" ");
  return <div className="chart" aria-label="Historical price chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img"><polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg><div className="chart-labels"><span>Low {min.toLocaleString("en-US", { maximumFractionDigits: 6 })}</span><span>High {max.toLocaleString("en-US", { maximumFractionDigits: 6 })}</span></div></div>;
}
