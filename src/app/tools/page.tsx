import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Market decision tools", description: "Practical crypto and stock calculators for comparison, volatility, drawdown, stablecoins and dividend income." };
const tools = [
  ["Compare assets", "Compare price, daily change, market cap and volume.", "/tools/compare"],
  ["Stablecoin peg", "Track how closely major stablecoins trade to one US dollar.", "/tools/stablecoins"],
  ["Volatility", "Measure recent price variability over a chosen period.", "/tools/volatility"],
  ["Drawdown", "See how far an asset trades below its observed peak.", "/tools/drawdown"],
  ["Dividend income", "Estimate annual, quarterly and monthly dividend income.", "/tools/dividends"],
  ["Crypto converter", "Convert a cryptocurrency amount to US dollars.", "/convert/bitcoin"],
  ["RWA markets", "Track real-world asset tokens and tokenized stocks.", "/markets/rwa"],
  ["Prediction markets", "Explore active markets ranked by volume and liquidity.", "/markets/prediction-markets"],
] as const;

export default function ToolsPage() {
  return <main className="data-page tool-page"><div className="data-page-heading"><div><p className="eyebrow">MARKET TOOLS</p><h1>Useful numbers. Clearer decisions.</h1><p>Compare assets, understand risk and calculate potential income with straightforward market tools.</p></div></div><div className="tools-grid">{tools.map(([title, description, href]) => <Link className="tool-card" href={href as any} key={href}><span className="tool-card-arrow">↗</span><h2>{title}</h2><p>{description}</p><span className="tool-card-link">Open tool</span></Link>)}</div></main>;
}
