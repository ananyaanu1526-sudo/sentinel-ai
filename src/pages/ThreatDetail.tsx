import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { VerdictBadge, Verdict } from "@/components/threats/VerdictBadge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldOff, ShieldCheck, Trash2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type T = any;

const ThreatDetail = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const [t, setT] = useState<T | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from("threats").select("*").eq("id", id).maybeSingle()
      .then(({ data }) => setT(data));
  }, [id]);

  const update = async (status: string) => {
    if (!id) return;
    const { error } = await supabase.from("threats").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Marked ${status}`); setT({ ...t, status }); }
  };

  const remove = async () => {
    if (!id) return;
    const { error } = await supabase.from("threats").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); nav("/threats"); }
  };

  if (!t) return <div className="p-8 mono text-muted-foreground">Loading case…</div>;

  const indicators: string[] = t.indicators || [];

  return (
    <div className="p-6 md:p-8 space-y-5 max-w-5xl animate-fade-in">
      <Link to="/threats" className="inline-flex items-center gap-1 mono text-xs text-muted-foreground hover:text-primary">
        <ArrowLeft className="w-3 h-3" /> Back to ledger
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mono text-xs text-muted-foreground">CASE #{t.id.slice(0, 8).toUpperCase()}</div>
          <h1 className="text-xl md:text-2xl font-bold mt-1 break-all">{t.target || t.raw_input.slice(0, 80)}</h1>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <VerdictBadge verdict={t.verdict as Verdict} />
            <span className="mono text-xs text-muted-foreground">risk <span className="text-foreground font-semibold">{t.risk_score}/100</span></span>
            <span className="mono text-xs text-muted-foreground">conf <span className="text-foreground font-semibold">{Math.round((t.confidence || 0) * 100)}%</span></span>
            <span className="mono text-xs text-muted-foreground">{format(new Date(t.created_at), "PPpp")}</span>
            <span className="mono text-xs px-2 py-0.5 rounded border border-border uppercase">{t.status}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => update("investigating")}><AlertTriangle className="w-4 h-4 mr-1" /> Investigate</Button>
          <Button size="sm" variant="outline" onClick={() => update("resolved")}><ShieldOff className="w-4 h-4 mr-1" /> Resolve</Button>
          <Button size="sm" variant="outline" onClick={() => update("false_positive")}><ShieldCheck className="w-4 h-4 mr-1" /> False positive</Button>
          <Button size="sm" variant="outline" onClick={remove} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="panel p-5">
          <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">AI reasoning</div>
          <p className="text-sm leading-relaxed">{t.ai_reasoning || "—"}</p>
          {t.brand_impersonated && (
            <div className="mt-3 text-sm">
              <span className="mono text-xs text-muted-foreground uppercase mr-2">Impersonates</span>
              <span className="text-warning font-semibold">{t.brand_impersonated}</span>
            </div>
          )}
          {t.category && <div className="mt-1 mono text-xs text-muted-foreground">Category: {t.category}</div>}
        </div>

        <div className="panel p-5">
          <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Indicators ({indicators.length})</div>
          {indicators.length === 0 ? <div className="text-sm text-muted-foreground">No indicators.</div> : (
            <ul className="space-y-1">
              {indicators.map((i, idx) => (
                <li key={idx} className="text-sm flex gap-2"><span className="text-destructive mono">▸</span><span>{i}</span></li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="panel p-5">
        <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Raw artifact ({t.source_type})</div>
        <pre className="mono text-xs whitespace-pre-wrap break-all bg-background/60 p-3 rounded max-h-64 overflow-auto">{t.raw_input}</pre>
      </div>

      <div className="panel p-5">
        <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Extracted features</div>
        <pre className="mono text-[11px] bg-background/60 p-3 rounded max-h-72 overflow-auto">{JSON.stringify(t.features, null, 2)}</pre>
      </div>
    </div>
  );
};

export default ThreatDetail;
