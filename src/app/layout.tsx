import type { Metadata } from "next";
import "./globals.css";
import { GoogleAnalytics } from "@/components/google-analytics";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://finance.blissbiovn.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Bliss Finance — Global Market Data",
    template: "%s | Bliss Finance"
  },
  description: "Clear, accessible crypto market data, prices, market metrics and historical trends for global investors.",
  applicationName: "Bliss Finance",
  category: "finance",
  keywords: ["crypto prices", "cryptocurrency market data", "bitcoin price", "crypto market cap", "financial data"],
  authors: [{ name: "Bliss Finance" }],
  creator: "Bliss Finance",
  publisher: "Bliss Finance",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Bliss Finance",
    title: "Bliss Finance — Global Market Data",
    description: "Clear, accessible crypto market data and historical trends.",
    url: siteUrl,
    locale: "en_US"
  },
  twitter: {
    card: "summary",
    title: "Bliss Finance — Global Market Data",
    description: "Clear, accessible crypto market data and historical trends."
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"]
  },
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<GoogleAnalytics /></body></html>;
}
