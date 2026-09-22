type Props = { symbol: string; kind: "crypto" | "stock" };
export function AffiliateCta({ symbol, kind }: Props) {
  const url = kind === "crypto" ? process.env.NEXT_PUBLIC_CRYPTO_AFFILIATE_URL : process.env.NEXT_PUBLIC_STOCK_AFFILIATE_URL;
  if (!url) return null;
  return <a className="affiliate-cta" href={url.replace("{symbol}", encodeURIComponent(symbol))} target="_blank" rel="sponsored nofollow noopener">Explore {symbol} with our partner <span>↗</span></a>;
}
