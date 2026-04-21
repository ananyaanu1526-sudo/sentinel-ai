import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ScanSearch, Loader2, Zap } from "lucide-react";
import { VerdictBadge, Verdict } from "@/components/threats/VerdictBadge";
import { Link } from "react-router-dom";

const sampleByType: Record<string, string> = {
  url: "https://paypal-secure-login.support-account.click/verify?id=8821",
  email: "Subject: Urgent: Your account will be suspended\n\nDear customer,\nWe detected unusual activity on your Apple ID. Please verify immediately by clicking: http://apple-id-verify.kim/login\nFailure to act within 24 hours will result in account suspension.\n\n— Apple Security Team",
  sms: "FedEx: Your package #FX-99821 is on hold due to incomplete address. Update now: http://fedex-delivery.top/u/8821",
};

const schema = z.object({
  source_type: z.enum(["url", "email", "sms"]),
  input: z.string().trim().min(1, "Required").max(10000, "Too long"),
});

type Result = {
  id: string;
  verdict: Verdict;
  risk_score: number;
  confidence: number;
  ai_reasoning: string | null;
  indicators: string[];
  category: string | null;
  brand_impersonated: string | null;
  features: any;
  latency_ms?: number;
};

const Analyzer = () => {
  const [type, setType] = useState<"url" | "email" | "sms">("url");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const submit = async () => {
    const v = schema.safeParse({ source_type: type, input });
    if (!v.success) { toast.error(v.error.issues[0].message); return; }
    setBusy(true); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-threat", { body: v.data });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const t = (data as any).threat;
      setResult({ ...t, latency_ms: (data as any).latency_ms });
      toast.success(`Verdict: ${t.verdict.toUpperCase()} · ${t.risk_score}/100`);
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in">
      <div>
        <div className="mono text-xs text-primary flex items-center gap-2"><ScanSearch className="w-3 h-3" /> REAL-TIME ANALYZER</div>
        <h1 className="text-2xl md:text-3xl font-bold mt-1">Submit artifact for analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">Multi-modal pipeline: feature extraction → transformer NLP → blended verdict.</p>
      </div>

      <div className="panel p-5">
        <Tabs value={type} onValueChange={(v) => setType(v as any)}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="sms">SMS / chat</TabsTrigger>
          </TabsList>

          {(["url", "email", "sms"] as const).map((k) => (
            <TabsContent key={k} value={k} className="mt-4 space-y-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={k === "url" ? "https://example.com/login" : "Paste full message body…"}
                className="mono min-h-32 bg-background/60"
              />
              <div className="flex gap-2 flex-wrap">
                <Button onClick={submit} disabled={busy} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                  {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing…</> : <><Zap className="w-4 h-4 mr-2" /> Analyze</>}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setInput(sampleByType[k])}>Load sample</Button>
                <Button variant="ghost" size="sm" onClick={() => { setInput(""); setResult(null); }}>Clear</Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {result && (
        <div className="panel p-5 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <VerdictBadge verdict={result.verdict} />
              <div className="mono text-xs text-muted-foreground">
                risk <span className="text-foreground font-semibold">{result.risk_score}/100</span> ·
                conf <span className="text-foreground font-semibold">{(result.confidence * 100).toFixed(0)}%</span> ·
                latency <span className="text-primary font-semibold">{result.latency_ms}ms</span>
              </div>
            </div>
            <Link to={`/threats/${result.id}`} className="mono text-xs text-primary hover:underline">Open in case view →</Link>
          </div>

          {result.brand_impersonated && (
            <div className="text-sm">
              <span className="mono text-xs text-muted-foreground uppercase mr-2">Impersonates</span>
              <span className="text-warning font-semibold">{result.brand_impersonated}</span>
              {result.category && <span className="ml-2 mono text-xs text-muted-foreground">· {result.category}</span>}
            </div>
          )}

          <div>
            <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">AI reasoning</div>
            <p className="text-sm leading-relaxed">{result.ai_reasoning}</p>
          </div>

          <div>
            <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Indicators ({result.indicators.length})</div>
            <ul className="space-y-1">
              {result.indicators.map((ind, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-destructive mono">▸</span>
                  <span>{ind}</span>
                </li>
              ))}
            </ul>
          </div>

          <details className="text-xs">
            <summary className="mono uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-primary">Raw features</summary>
            <pre className="mono text-[11px] bg-background/60 p-3 rounded mt-2 overflow-auto max-h-64">{JSON.stringify(result.features, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default Analyzer;
