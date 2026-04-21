import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { VerdictBadge, Verdict } from "@/components/threats/VerdictBadge";
import { Activity, AlertTriangle, ShieldCheck, Zap, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { format, subDays, startOfHour } from "date-fns";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";

type Threat = {
  id: string; verdict: Verdict; risk_score: number; source_type: string;
  target: string | null; raw_input: string; created_at: string; brand_impersonated: string | null;
};
type Scan = { latency_ms: number | null; created_at: string };

const Stat = ({ icon: Icon, label, value, accent }: any) => (
  <div className="panel p-4 relative overflow-hidden">
    <div className="flex items-center justify-between">
      <div>
        <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className={`mt-2 text-3xl font-bold mono ${accent || "text-foreground"}`}>{value}</div>
      </div>
      <div className="w-10 h-10 rounded-md bg-primary/10 border border-primary/30 grid place-items-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [threats, setThreats] = useState<Threat[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const since = subDays(new Date(), 7).toISOString();
      const [{ data: t }, { data: s }] = await Promise.all([
        supabase.from("threats").select("id,verdict,risk_score,source_type,target,raw_input,created_at,brand_impersonated").gte("created_at", since).order("created_at", { ascending: false }),
        supabase.from("scans").select("latency_ms,created_at").gte("created_at", since).order("created_at", { ascending: false }),
      ]);
      setThreats((t as Threat[]) || []);
      setScans((s as Scan[]) || []);
      setLoading(false);
    };
    load();

    const ch = supabase.channel("threats-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "threats" }, (payload) => {
        setThreats((prev) => [payload.new as Threat, ...prev].slice(0, 200));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const total = threats.length;
  const phishing = threats.filter((t) => t.verdict === "phishing" || t.verdict === "malicious").length;
  const safe = threats.filter((t) => t.verdict === "safe").length;
  const avgLatency = scans.length ? Math.round(scans.reduce((a, s) => a + (s.latency_ms || 0), 0) / scans.length) : 0;

  // Hourly time series for last 24h
  const series: { time: string; threats: number; risky: number }[] = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const h = startOfHour(new Date(now.getTime() - i * 3600_000));
    const next = new Date(h.getTime() + 3600_000);
    const slice = threats.filter((t) => {
      const d = new Date(t.created_at);
      return d >= h && d < next;
    });
    series.push({
      time: format(h, "HH:mm"),
      threats: slice.length,
      risky: slice.filter((s) => s.verdict !== "safe").length,
    });
  }

  const verdictCounts: Record<Verdict, number> = { safe: 0, suspicious: 0, phishing: 0, malicious: 0 };
  threats.forEach((t) => { verdictCounts[t.verdict] += 1; });
  const pieData = (Object.keys(verdictCounts) as Verdict[]).map((k) => ({ name: k, value: verdictCounts[k] }));
  const pieColors: Record<Verdict, string> = {
    safe: "hsl(var(--safe))", suspicious: "hsl(var(--warning))",
    phishing: "hsl(var(--destructive))", malicious: "hsl(var(--critical))",
  };

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="mono text-xs text-primary flex items-center gap-2"><span className="pulse-dot" /> LIVE FEED · LAST 7 DAYS</div>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">SOC overview</h1>
        </div>
        <Link to="/analyzer" className="mono text-xs text-primary hover:text-primary-glow underline-offset-4 hover:underline">Run analyzer →</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Activity} label="Artifacts scanned" value={total} />
        <Stat icon={AlertTriangle} label="Phishing / malicious" value={phishing} accent="text-destructive" />
        <Stat icon={ShieldCheck} label="Safe" value={safe} accent="text-safe" />
        <Stat icon={Clock} label="Avg latency" value={`${avgLatency}ms`} accent="text-primary" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Detection volume · 24h</div>
              <div className="font-semibold">Threats per hour</div>
            </div>
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Area type="monotone" dataKey="threats" stroke="hsl(var(--primary))" fill="url(#g1)" strokeWidth={2} />
                <Area type="monotone" dataKey="risky" stroke="hsl(var(--destructive))" fill="url(#g2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-5">
          <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Verdict mix</div>
          <div className="font-semibold mb-2">Distribution</div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} stroke="hsl(var(--background))" strokeWidth={2}>
                  {pieData.map((d) => <Cell key={d.name} fill={pieColors[d.name as Verdict]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {(Object.keys(verdictCounts) as Verdict[]).map((k) => (
              <div key={k} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: pieColors[k] }} /> {k}</span>
                <span className="mono">{verdictCounts[k]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live feed */}
      <div className="panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Realtime stream</div>
            <div className="font-semibold">Live threat feed</div>
          </div>
          <Link to="/threats" className="mono text-xs text-primary hover:underline">All threats →</Link>
        </div>

        {loading ? (
          <div className="text-muted-foreground text-sm mono">Hydrating feed…</div>
        ) : threats.length === 0 ? (
          <div className="text-muted-foreground text-sm">No artifacts analyzed yet. <Link className="text-primary hover:underline" to="/analyzer">Submit one →</Link></div>
        ) : (
          <div className="divide-y divide-border">
            {threats.slice(0, 8).map((t) => (
              <Link to={`/threats/${t.id}`} key={t.id} className="flex items-center gap-3 py-3 hover:bg-secondary/50 -mx-2 px-2 rounded transition-colors">
                <VerdictBadge verdict={t.verdict} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">
                    <span className="mono text-xs uppercase text-muted-foreground mr-2">{t.source_type}</span>
                    {t.target || t.raw_input.slice(0, 80)}
                  </div>
                  <div className="text-xs text-muted-foreground mono">
                    {format(new Date(t.created_at), "HH:mm:ss")} · risk {t.risk_score}
                    {t.brand_impersonated && <> · impersonates <span className="text-warning">{t.brand_impersonated}</span></>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
