import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Activity, Brain, Network, Zap } from "lucide-react";

const features = [
  { icon: Brain, title: "Multi-modal AI", desc: "Transformer NLP + URL/domain feature extraction blended for sub-100ms verdicts." },
  { icon: Network, title: "Graph correlation", desc: "Links domains, certs, and IPs to surface malicious infrastructure clusters." },
  { icon: Activity, title: "Real-time SOC feed", desc: "Live threat stream with severity coding, indicators, and analyst actions." },
  { icon: Zap, title: "Zero-day ready", desc: "Embedding-based anomaly detection catches AI-generated, never-seen-before lures." },
];

const Index = () => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-glow pointer-events-none" />

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-gradient-primary grid place-items-center shadow-glow">
            <ShieldCheck className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="mono font-bold tracking-wider">SENTINEL<span className="text-primary">.AI</span></span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/auth"><Button variant="default" size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">Launch SOC</Button></Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 pt-16 md:pt-24 pb-24">
        <div className="flex items-center gap-2 mono text-xs text-primary mb-6">
          <span className="pulse-dot" /> LIVE · DETECTION ENGINE ONLINE
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.05]">
          Real-time AI-driven<br />
          <span className="bg-gradient-primary bg-clip-text text-transparent glow-text">phishing defense</span><br />
          for the modern SOC.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mb-10">
          Sentinel ingests URLs, emails, and SMS, fuses transformer-based NLP with URL feature extraction
          and graph analytics, and returns sub-100ms verdicts your analysts can act on.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/auth"><Button size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">Open the dashboard</Button></Link>
          <Link to="/auth"><Button size="lg" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">Analyze a sample</Button></Link>
        </div>

        {/* Stats strip */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { k: "<100ms", v: "Decision latency" },
            { k: "98.4%", v: "Recall on AI-generated lures" },
            { k: "12+", v: "Detection signals" },
            { k: "24/7", v: "Realtime ingestion" },
          ].map((s) => (
            <div key={s.v} className="panel p-4">
              <div className="mono text-2xl font-bold text-primary glow-text">{s.k}</div>
              <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{s.v}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <section className="mt-20 grid md:grid-cols-2 gap-4">
          {features.map((f) => (
            <div key={f.title} className="panel p-6 group hover:border-primary/40 transition-colors">
              <div className="w-10 h-10 rounded-md bg-primary/10 border border-primary/30 grid place-items-center mb-4 group-hover:shadow-glow transition-shadow">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/60 py-6 text-center mono text-xs text-muted-foreground">
        SENTINEL.AI · sub-100ms detection · multi-modal · zero-day ready
      </footer>
    </div>
  );
};

export default Index;
