import { cn } from "@/lib/utils";

export type Verdict = "safe" | "suspicious" | "phishing" | "malicious";

const styles: Record<Verdict, string> = {
  safe: "bg-safe/15 text-safe border-safe/40",
  suspicious: "bg-warning/15 text-warning border-warning/40",
  phishing: "bg-destructive/15 text-destructive border-destructive/40",
  malicious: "bg-critical/15 text-critical border-critical/50 shadow-threat",
};

const dotClass: Record<Verdict, string> = {
  safe: "safe", suspicious: "warn", phishing: "danger", malicious: "danger",
};

export const VerdictBadge = ({ verdict, className }: { verdict: Verdict; className?: string }) => (
  <span className={cn("inline-flex items-center gap-2 px-2 py-0.5 rounded border mono text-[11px] uppercase tracking-wider", styles[verdict], className)}>
    <span className={cn("pulse-dot", dotClass[verdict])} />
    {verdict}
  </span>
);
