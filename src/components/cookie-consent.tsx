"use client";
import { useEffect, useState } from "react";
export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(!localStorage.getItem("bliss-cookie-consent")), []);
  function choose(value: "granted" | "denied") { localStorage.setItem("bliss-cookie-consent", value); window.gtag?.("consent", "update", { analytics_storage: value }); setVisible(false); }
  if (!visible) return null;
  return <aside className="cookie-consent" role="dialog" aria-label="Cookie preferences"><strong>Your privacy choices</strong><p>We use optional analytics to improve Bliss Finance. Market data works without it.</p><div><button className="cookie-reject" onClick={() => choose("denied")}>Reject</button><button onClick={() => choose("granted")}>Accept analytics</button></div></aside>;
}
declare global { interface Window { gtag?: (...args: unknown[]) => void; } }
