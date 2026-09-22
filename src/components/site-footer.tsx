import Link from "next/link";

export function SiteFooter() {
  return <footer className="site-footer"><span>© {new Date().getFullYear()} Bliss Finance</span><div><Link href="/about">About</Link><Link href="/disclaimer">Disclaimer</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></footer>;
}
