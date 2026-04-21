import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Network } from "lucide-react";

type T = { id: string; target: string | null; verdict: string; brand_impersonated: string | null; risk_score: number };

const Intelligence = () => {
  const [rows, setRows] = useState<T[]>([]);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    supabase.from("threats").select("id,target,verdict,brand_impersonated,risk_score").not("target", "is", null).limit(150)
      .then(({ data }) => setRows((data as T[]) || []));
  }, []);

  // Build infrastructure clusters: brand -> domains
  const clusters = useMemo(() => {
    const m: Record<string, T[]> = {};
    rows.forEach((r) => {
      const key = r.brand_impersonated || (r.target ? r.target.split(".").slice(-2).join(".") : "unknown");
      m[key] = m[key] || [];
      m[key].push(r);
    });
    return Object.entries(m).sort((a, b) => b[1].length - a[1].length).slice(0, 8);
  }, [rows]);

  // Simple radial network render
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const w = c.width = c.clientWidth * 2;
    const h = c.height = c.clientHeight * 2;
    ctx.scale(1, 1);
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) / 2 - 80;

    // glow center
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
    g.addColorStop(0, "rgba(0,255,255,0.35)");
    g.addColorStop(1, "rgba(0,255,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 100, 0, Math.PI * 2); ctx.fill();

    clusters.forEach((cl, i) => {
      const angle = (i / clusters.length) * Math.PI * 2;
      const bx = cx + Math.cos(angle) * R;
      const by = cy + Math.sin(angle) * R;

      // line center -> brand node
      ctx.strokeStyle = "rgba(0,255,255,0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(bx, by); ctx.stroke();

      // brand node
      ctx.fillStyle = "rgba(0,255,255,0.9)";
      ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "bold 18px JetBrains Mono"; ctx.textAlign = "center";
      ctx.fillText(cl[0], bx, by - 16);

      // satellite domains
      cl[1].slice(0, 8).forEach((t, j) => {
        const sa = angle + (j - 3.5) * 0.18;
        const sr = R + 60 + (j % 2) * 30;
        const sx = cx + Math.cos(sa) * sr;
        const sy = cy + Math.sin(sa) * sr;
        const isBad = t.verdict === "phishing" || t.verdict === "malicious";
        ctx.strokeStyle = isBad ? "rgba(255,60,80,0.6)" : "rgba(255,180,40,0.5)";
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(sx, sy); ctx.stroke();
        ctx.fillStyle = isBad ? "rgba(255,60,80,1)" : "rgba(255,180,40,1)";
        ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
      });
    });

    // center label
    ctx.fillStyle = "#fff"; ctx.font = "bold 22px JetBrains Mono"; ctx.textAlign = "center";
    ctx.fillText("SENTINEL", cx, cy + 4);
  }, [clusters]);

  return (
    <div className="p-6 md:p-8 space-y-5 animate-fade-in">
      <div>
        <div className="mono text-xs text-primary flex items-center gap-2"><Network className="w-3 h-3" /> THREAT INTELLIGENCE</div>
        <h1 className="text-2xl md:text-3xl font-bold mt-1">Infrastructure correlation graph</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Brand impersonation clusters and connected malicious domains observed across your tenant.
        </p>
      </div>

      <div className="panel p-4 relative overflow-hidden">
        <canvas ref={ref} className="w-full h-[480px]" />
        {clusters.length === 0 && (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">
            No correlated infrastructure yet — analyze a few artifacts to build the graph.
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clusters.map(([brand, items]) => (
          <div key={brand} className="panel p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold mono">{brand}</div>
              <div className="mono text-xs text-muted-foreground">{items.length} nodes</div>
            </div>
            <ul className="space-y-1">
              {items.slice(0, 6).map((i) => (
                <li key={i.id} className="text-xs mono truncate flex items-center justify-between gap-2">
                  <span className="truncate">{i.target}</span>
                  <span className={i.risk_score >= 75 ? "text-critical" : i.risk_score >= 45 ? "text-destructive" : "text-warning"}>{i.risk_score}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Intelligence;
