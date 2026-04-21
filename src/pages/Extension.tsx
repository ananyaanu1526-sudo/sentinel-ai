import { Button } from "@/components/ui/button";
import { Chrome, Download, ShieldCheck, Zap, Eye, Lock } from "lucide-react";
import { toast } from "sonner";

const Extension = () => {
  const download = () => {
    fetch("/sentinel-extension.zip")
      .then((res) => {
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "sentinel-extension.zip";
        a.click();
        URL.revokeObjectURL(a.href);
        toast.success("Extension downloaded — see install steps below");
      })
      .catch((err) => toast.error(err.message));
  };

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in max-w-4xl">
      <div>
        <div className="mono text-xs text-primary flex items-center gap-2">
          <Chrome className="w-3 h-3" /> EDGE / ENDPOINT
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mt-1">Browser extension</h1>
        <p className="text-sm text-muted-foreground mt-1">
          One-click phishing analysis of the page you're visiting. Built on the same multi-modal
          detection pipeline — runs anonymously, no sign-in required inside the popup.
        </p>
      </div>

      <div className="panel p-6 space-y-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
              <ShieldCheck className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <div className="font-bold text-lg">Sentinel.AI Phishing Guard</div>
              <div className="mono text-xs text-muted-foreground">v1.0.0 · Manifest V3 · Chromium</div>
            </div>
          </div>
          <Button onClick={download} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Download className="w-4 h-4 mr-2" /> Download .zip
          </Button>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { icon: Zap, title: "Real-time", text: "~1s verdict via the same edge function" },
            { icon: Eye, title: "Auto-detect", text: "Reads the active tab URL on click" },
            { icon: Lock, title: "Anonymous", text: "No data persisted, no account needed" },
          ].map((f) => (
            <div key={f.title} className="rounded-md border border-border bg-background/40 p-3">
              <f.icon className="w-4 h-4 text-primary mb-2" />
              <div className="mono text-[11px] uppercase tracking-widest text-muted-foreground">{f.title}</div>
              <div className="text-sm mt-1">{f.text}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel p-6">
        <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
          Install (unpacked, dev mode)
        </div>
        <ol className="space-y-3 text-sm">
          {[
            <>Click <span className="mono text-primary">Download .zip</span> above and unzip the folder.</>,
            <>Open <code className="mono text-primary bg-background/60 px-1.5 py-0.5 rounded">chrome://extensions</code> in Chrome / Edge / Brave / Arc / Opera.</>,
            <>Enable <span className="font-semibold">Developer mode</span> (toggle, top-right).</>,
            <>Click <span className="font-semibold">Load unpacked</span> and select the unzipped <span className="mono">extension/</span> folder.</>,
            <>Pin the Sentinel.AI icon to your toolbar — click it on any page to analyze.</>,
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="mono text-xs text-primary font-bold shrink-0 w-5">0{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="panel p-6">
        <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
          How it works
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          When you click the toolbar icon, the popup queries{" "}
          <code className="mono text-primary">chrome.tabs.query</code> for the active tab URL and POSTs it to the{" "}
          <code className="mono text-primary">analyze-threat</code> edge function. The function runs the same
          rule-based feature extraction (entropy, suspicious TLDs, brand-in-subdomain, punycode) blended with a
          Gemini 2.5 Flash verdict, and returns the result inline. Popup scans skip persistence; use the in-app
          Analyzer to log cases to your SOC ledger.
        </p>
      </div>
    </div>
  );
};

export default Extension;
