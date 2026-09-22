import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance Market Data",
  description: "Clear, accessible crypto market data and price history."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
