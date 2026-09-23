import type { Metadata } from "next";
import "./globals.css";
import { GoogleAnalytics } from "@/components/google-analytics";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CookieConsent } from "@/components/cookie-consent";
import { NativeAd } from "@/components/native-ad";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://finance.blissbiovn.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Bliss Finance — Market Intelligence & Decision Tools",
    template: "%s | Bliss Finance"
  },
  description: "Explore crypto, stocks, RWA, prediction markets and practical tools for volatility, drawdown and stablecoin risk.",
  applicationName: "Bliss Finance",
  category: "finance",
  keywords: ["crypto market tools", "prediction markets", "RWA tokens", "tokenized stocks", "stablecoin peg tracker", "bitcoin volatility"],
  authors: [{ name: "Bliss Finance" }],
  creator: "Bliss Finance",
  publisher: "Bliss Finance",
  openGraph: {
    type: "website",
    siteName: "Bliss Finance",
    title: "Bliss Finance — Market Intelligence & Decision Tools",
    description: "Market dashboards and decision tools for crypto, stocks, RWA, stablecoins and prediction markets.",
    url: siteUrl,
    locale: "en_US"
  },
  twitter: {
    card: "summary",
    title: "Bliss Finance — Market Intelligence & Decision Tools",
    description: "Market dashboards and decision tools for crypto, stocks, RWA, stablecoins and prediction markets."
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"]
  },
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SiteHeader />{children}<div className="site-ad"><NativeAd /></div><SiteFooter /><CookieConsent /><GoogleAnalytics /></body></html>;
}
