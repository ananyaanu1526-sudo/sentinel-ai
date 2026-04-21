// Real-time phishing analysis edge function.
// Combines deterministic feature extraction (URL entropy, length, suspicious tokens)
// with an LLM verdict via Lovable AI Gateway. Persists result + scan record.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUSPICIOUS_TLDS = ["zip", "mov", "country", "kim", "work", "click", "link", "support", "top", "xyz", "rest", "review"];
const BRAND_KEYWORDS = ["paypal", "apple", "microsoft", "google", "amazon", "netflix", "facebook", "instagram", "bank", "chase", "hsbc", "wellsfargo", "dhl", "fedex", "ups", "irs", "hmrc", "binance", "coinbase", "metamask"];
const URGENCY_TOKENS = ["urgent", "immediately", "verify now", "suspended", "locked", "limited", "click here", "act now", "final notice", "unusual activity", "confirm your", "update your password"];

function shannonEntropy(s: string): number {
  if (!s) return 0;
  const freq: Record<string, number> = {};
  for (const c of s) freq[c] = (freq[c] || 0) + 1;
  let h = 0;
  const len = s.length;
  for (const k in freq) {
    const p = freq[k] / len;
    h -= p * Math.log2(p);
  }
  return Math.round(h * 1000) / 1000;
}

function extractUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"')]+/i);
  return m ? m[0] : null;
}

function analyzeUrl(url: string) {
  let host = "";
  let path = "";
  let scheme = "";
  try {
    const u = new URL(url);
    host = u.hostname;
    path = u.pathname + u.search;
    scheme = u.protocol.replace(":", "");
  } catch {
    host = url;
  }
  const tld = host.split(".").pop() || "";
  const subdomainCount = Math.max(0, host.split(".").length - 2);
  const hasIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
  const hasAt = url.includes("@");
  const hasPunycode = host.includes("xn--");
  const hyphenCount = (host.match(/-/g) || []).length;
  const digitCount = (host.match(/\d/g) || []).length;
  const brandHit = BRAND_KEYWORDS.find((b) => host.toLowerCase().includes(b) && !host.toLowerCase().endsWith(`${b}.com`));
  const entropy = shannonEntropy(host);

  return {
    host,
    path,
    scheme,
    tld,
    url_length: url.length,
    host_length: host.length,
    subdomain_count: subdomainCount,
    has_ip_literal: hasIp,
    has_at_symbol: hasAt,
    has_punycode: hasPunycode,
    hyphen_count: hyphenCount,
    digit_count: digitCount,
    suspicious_tld: SUSPICIOUS_TLDS.includes(tld),
    brand_in_subdomain: !!brandHit,
    brand_keyword: brandHit || null,
    entropy_host: entropy,
    is_https: scheme === "https",
  };
}

function analyzeText(text: string) {
  const lower = text.toLowerCase();
  const urgencyHits = URGENCY_TOKENS.filter((t) => lower.includes(t));
  const brandHits = BRAND_KEYWORDS.filter((b) => lower.includes(b));
  return {
    char_count: text.length,
    word_count: text.split(/\s+/).filter(Boolean).length,
    urgency_tokens: urgencyHits,
    brand_mentions: brandHits,
    contains_url: !!extractUrl(text),
    excessive_caps: (text.match(/[A-Z]{4,}/g) || []).length,
    suspicious_attachments: /\.(zip|exe|scr|js|html|htm)\b/i.test(text),
  };
}

function ruleBasedScore(features: Record<string, any>, sourceType: string): { score: number; indicators: string[] } {
  let score = 0;
  const indicators: string[] = [];
  if (sourceType === "url" || features.contains_url) {
    if (features.has_ip_literal) { score += 25; indicators.push("IP literal in URL"); }
    if (features.has_at_symbol) { score += 20; indicators.push("@ symbol in URL"); }
    if (features.has_punycode) { score += 25; indicators.push("Punycode (homoglyph) host"); }
    if (features.suspicious_tld) { score += 15; indicators.push(`Suspicious TLD .${features.tld}`); }
    if (features.brand_in_subdomain) { score += 30; indicators.push(`Brand "${features.brand_keyword}" used outside official domain`); }
    if (features.url_length > 90) { score += 10; indicators.push("Unusually long URL"); }
    if (features.subdomain_count > 3) { score += 10; indicators.push("Excessive subdomains"); }
    if (features.hyphen_count > 3) { score += 5; indicators.push("Many hyphens in host"); }
    if (features.entropy_host > 4) { score += 10; indicators.push("High entropy hostname"); }
    if (features.is_https === false) { score += 8; indicators.push("Plain HTTP"); }
  }
  if (features.urgency_tokens?.length) { score += 5 * features.urgency_tokens.length; indicators.push(`Urgency language: ${features.urgency_tokens.slice(0,3).join(", ")}`); }
  if (features.brand_mentions?.length && sourceType !== "url") { score += 5; indicators.push(`Brand mentioned: ${features.brand_mentions.join(", ")}`); }
  if (features.suspicious_attachments) { score += 20; indicators.push("Suspicious attachment/file reference"); }
  if (features.excessive_caps > 2) { score += 5; indicators.push("Excessive uppercase shouting"); }
  return { score: Math.min(100, score), indicators };
}

async function llmVerdict(input: string, sourceType: string, features: Record<string, any>): Promise<any> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const sys = `You are a senior phishing analyst inside a SOC. Classify the artifact and return ONLY JSON via the provided tool. Be conservative: only mark "safe" if no red flags. Consider AI-generated phishing, brand impersonation, urgency tactics, homoglyph domains, redirection abuse.`;

  const user = `Artifact type: ${sourceType}
Extracted features: ${JSON.stringify(features)}
Raw input (truncated):
${input.slice(0, 2000)}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      tools: [{
        type: "function",
        function: {
          name: "report_verdict",
          description: "Report phishing analysis verdict",
          parameters: {
            type: "object",
            properties: {
              verdict: { type: "string", enum: ["safe", "suspicious", "phishing", "malicious"] },
              risk_score: { type: "integer", minimum: 0, maximum: 100 },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              category: { type: "string", description: "e.g. credential_harvest, payment_fraud, malware_delivery, scam, benign" },
              brand_impersonated: { type: "string", description: "Brand name being impersonated, or empty string" },
              indicators: { type: "array", items: { type: "string" }, description: "Concise red flags" },
              reasoning: { type: "string", description: "1-3 sentences for an analyst" },
            },
            required: ["verdict", "risk_score", "confidence", "category", "indicators", "reasoning"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "report_verdict" } },
    }),
  });

  if (res.status === 429) throw new Error("rate_limit");
  if (res.status === 402) throw new Error("payment_required");
  if (!res.ok) throw new Error(`ai_gateway_${res.status}`);

  const data = await res.json();
  const tc = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!tc) throw new Error("no_tool_call");
  return JSON.parse(tc.function.arguments);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const t0 = Date.now();
  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      authHeader ? { global: { headers: { Authorization: authHeader } } } : {}
    );

    // Optional auth — extension and other anonymous clients still get a verdict,
    // but only logged-in operators get the result persisted to their ledger.
    let user: { id: string } | null = null;
    if (authHeader) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) user = { id: userData.user.id };
    }

    const body = await req.json();
    const sourceType = String(body.source_type || "").toLowerCase();
    const rawInput = String(body.input || "").trim();
    if (!["url", "email", "sms", "chat"].includes(sourceType)) {
      return new Response(JSON.stringify({ error: "Invalid source_type" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!rawInput || rawInput.length > 10000) {
      return new Response(JSON.stringify({ error: "Input length must be 1-10000 chars" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Feature extraction
    let features: Record<string, any> = {};
    let target: string | null = null;
    if (sourceType === "url") {
      const u = rawInput.startsWith("http") ? rawInput : `http://${rawInput}`;
      features = analyzeUrl(u);
      target = features.host;
    } else {
      features = analyzeText(rawInput);
      const found = extractUrl(rawInput);
      if (found) {
        features.url = analyzeUrl(found);
        target = features.url.host;
      }
    }

    const rule = ruleBasedScore({ ...features, ...(features.url || {}) }, sourceType);

    // LLM verdict
    let llm: any;
    try {
      llm = await llmVerdict(rawInput, sourceType, features);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "rate_limit") {
        return new Response(JSON.stringify({ error: "AI rate limit. Please retry in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (msg === "payment_required") {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Workspace > Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Fallback: rule-based only
      llm = {
        verdict: rule.score >= 60 ? "phishing" : rule.score >= 30 ? "suspicious" : "safe",
        risk_score: rule.score,
        confidence: 0.55,
        category: "unknown",
        brand_impersonated: features.brand_keyword || (features.brand_mentions?.[0] ?? ""),
        indicators: rule.indicators,
        reasoning: "AI gateway unavailable; rule-based verdict only.",
      };
    }

    // Combine: weighted blend, indicators union
    const blendedScore = Math.round(0.55 * llm.risk_score + 0.45 * rule.score);
    const indicators = Array.from(new Set([...(llm.indicators || []), ...rule.indicators])).slice(0, 12);
    const verdict = blendedScore >= 75 ? (llm.verdict === "malicious" ? "malicious" : "phishing")
                   : blendedScore >= 45 ? "suspicious"
                   : blendedScore >= 20 ? (llm.verdict === "safe" ? "suspicious" : llm.verdict)
                   : "safe";

    const latency = Date.now() - t0;

    // Anonymous (e.g. browser extension) — return verdict without persistence.
    if (!user) {
      const ephemeral = {
        id: crypto.randomUUID(),
        source_type: sourceType,
        raw_input: rawInput,
        target,
        verdict,
        risk_score: blendedScore,
        confidence: llm.confidence,
        indicators,
        features,
        ai_reasoning: llm.reasoning,
        category: llm.category,
        brand_impersonated: llm.brand_impersonated || null,
      };
      return new Response(JSON.stringify({ threat: ephemeral, latency_ms: latency, persisted: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const insertPayload = {
      user_id: user.id,
      source_type: sourceType,
      raw_input: rawInput,
      target,
      verdict,
      risk_score: blendedScore,
      confidence: llm.confidence,
      indicators,
      features,
      ai_reasoning: llm.reasoning,
      category: llm.category,
      brand_impersonated: llm.brand_impersonated || null,
    };

    const { data: threat, error: insErr } = await supabase.from("threats").insert(insertPayload).select().single();
    if (insErr) throw insErr;

    await supabase.from("scans").insert({
      user_id: user.id,
      threat_id: threat.id,
      latency_ms: latency,
      model: "google/gemini-2.5-flash",
    });

    return new Response(JSON.stringify({ threat, latency_ms: latency, persisted: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-threat error", e);
    return new Response(JSON.stringify({ error: (e as Error).message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
