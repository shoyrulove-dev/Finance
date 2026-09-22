"use client";
import { useEffect } from "react";
const scriptSource = "https://pl31461350.profitableratecpmnetwork.com/dc9411eb1c6cd0ebd89293a7dd3f0fbf/invoke.js";
const containerId = "container-dc9411eb1c6cd0ebd89293a7dd3f0fbf";
export function NativeAd() {
  useEffect(() => { if (document.querySelector(`script[src="${scriptSource}"]`)) return; const script = document.createElement("script"); script.async = true; script.dataset.cfasync = "false"; script.src = scriptSource; document.body.appendChild(script); }, []);
  return <section className="ad-slot" aria-label="Sponsored content"><span>Sponsored</span><div id={containerId} /></section>;
}
