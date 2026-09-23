import type { Metadata } from "next";
import "./globals.css";
import { GoogleAnalytics } from "@/components/google-analytics";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CookieConsent } from "@/components/cookie-consent";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://finance.blissbiovn.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Bliss Finance — Global Market Data",
    template: "%s | Bliss Finance"
  },
  description: "Explore cryptocurrency and US stock prices, daily moves, market caps and historical trends in one clear view.",
  applicationName: "Bliss Finance",
  category: "finance",
  keywords: ["crypto prices", "cryptocurrency market data", "bitcoin price", "crypto market cap", "financial data"],
  authors: [{ name: "Bliss Finance" }],
  creator: "Bliss Finance",
  publisher: "Bliss Finance",
  openGraph: {
    type: "website",
    siteName: "Bliss Finance",
    title: "Bliss Finance — Global Market Data",
    description: "Explore crypto and US stock prices, market moves and historical trends.",
    url: siteUrl,
    locale: "en_US"
  },
  twitter: {
    card: "summary",
    title: "Bliss Finance — Global Market Data",
    description: "Explore crypto and US stock prices, market moves and historical trends."
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"]
  },
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SiteHeader />{children}<SiteFooter /><CookieConsent /><GoogleAnalytics /></body></html>;
}
