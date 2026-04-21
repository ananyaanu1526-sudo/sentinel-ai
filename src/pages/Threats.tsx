import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { VerdictBadge, Verdict } from "@/components/threats/VerdictBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Search, Filter } from "lucide-react";

type T = {
  id: string; source_type: string; target: string | null; raw_input: string;
  verdict: Verdict; risk_score: number; brand_impersonated: string | null;
  category: string | null; status: string; created_at: string;
};

const Threats = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [verdictFilter, setVerdictFilter] = useState<Verdict | "all">("all");

  useEffect(() => {
    if (!user) return;
    supabase.from("threats").select("id,source_type,target,raw_input,verdict,risk_score,brand_impersonated,category,status,created_at")
      .order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => { setRows((data as T[]) || []); setLoading(false); });
  }, [user]);

  const filtered = rows.filter((r) => {
    if (verdictFilter !== "all" && r.verdict !== verdictFilter) return false;
    if (q && !`${r.target} ${r.raw_input} ${r.brand_impersonated}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-5 animate-fade-in">
      <div>
        <div className="mono text-xs text-primary">THREAT LEDGER</div>
        <h1 className="text-2xl md:text-3xl font-bold mt-1">All analyzed artifacts</h1>
      </div>

      <div className="panel p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search target, content, brand…" className="pl-9 mono bg-background/60" />
        </div>
        <div className="flex items-center gap-1 mono text-xs text-muted-foreground"><Filter className="w-3 h-3" /> Verdict:</div>
        {(["all", "safe", "suspicious", "phishing", "malicious"] as const).map((v) => (
          <Button key={v} size="sm" variant={verdictFilter === v ? "default" : "outline"}
            className={verdictFilter === v ? "bg-primary text-primary-foreground" : ""}
            onClick={() => setVerdictFilter(v as any)}>
            {v}
          </Button>
        ))}
      </div>

      <div className="panel overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 mono text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border bg-secondary/40">
          <div className="col-span-2">Verdict</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-5">Target / preview</div>
          <div className="col-span-1 text-right">Risk</div>
          <div className="col-span-2">Brand</div>
          <div className="col-span-1 text-right">Time</div>
        </div>
        {loading ? (
          <div className="p-6 text-muted-foreground mono text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-muted-foreground text-sm">No matching threats.</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((r) => (
              <Link to={`/threats/${r.id}`} key={r.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 px-4 py-3 hover:bg-secondary/50 transition-colors items-center">
                <div className="md:col-span-2"><VerdictBadge verdict={r.verdict} /></div>
                <div className="md:col-span-1 mono text-xs uppercase text-muted-foreground">{r.source_type}</div>
                <div className="md:col-span-5 truncate text-sm">{r.target || r.raw_input.slice(0, 90)}</div>
                <div className="md:col-span-1 mono text-sm text-right">
                  <span className={r.risk_score >= 75 ? "text-critical" : r.risk_score >= 45 ? "text-destructive" : r.risk_score >= 20 ? "text-warning" : "text-safe"}>
                    {r.risk_score}
                  </span>
                </div>
                <div className="md:col-span-2 text-xs text-warning truncate">{r.brand_impersonated || "—"}</div>
                <div className="md:col-span-1 text-right mono text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d HH:mm")}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Threats;
