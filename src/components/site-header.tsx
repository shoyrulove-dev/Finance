import Link from "next/link";

export function SiteHeader() {
  return <header className="site-header"><Link className="site-logo" href="/"><img src="/logo.svg" alt="Bliss Finance" width="184" height="44" /></Link><nav aria-label="Primary navigation"><Link href="/crypto">Crypto</Link><Link href="/stocks">Stocks</Link><Link href="/search">Search</Link><Link href="/status">Status</Link><Link href="/data-sources">Data sources</Link></nav></header>;
}
