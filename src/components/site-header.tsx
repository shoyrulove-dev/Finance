import Link from "next/link";

export function SiteHeader() {
  return <header className="site-header"><Link className="site-logo" href="/"><img src="/logo.svg" alt="Bliss Finance home" width="184" height="44" /></Link><nav aria-label="Primary navigation"><Link href="/">Markets</Link><Link href="/crypto">Crypto</Link><Link href="/stocks">Stocks</Link><Link href={"/tools" as any}>Tools</Link><Link href="/data-sources">About the data</Link></nav><Link className="header-search" href="/search">Search assets <span>↗</span></Link></header>;
}
