// Sentinel.AI Phishing Guard — popup logic
// Reads the active tab's URL, calls the analyze-threat edge function,
// and renders the verdict. No persistence (anonymous mode).

const SUPABASE_URL = "https://xttvvgceeygdvqbicign.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0dHZ2Z2NlZXlnZHZxYmljaWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3Mzc1NjUsImV4cCI6MjA5MjMxMzU2NX0.lTbhLfBz4V5OYKvvoOUdRUbHLe2JZvnhlUf3w6qQGss";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/analyze-threat`;
const SOC_URL = "https://id-preview--590aaa42-5518-4bb8-bdc1-f31f88f70087.lovable.app/dashboard";

const $ = (id) => document.getElementById(id);

function show(id) { $(id).classList.remove("hidden"); }
function hide(id) { $(id).classList.add("hidden"); }

async function getActiveTabUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url || "";
}

function isAnalyzable(url) {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
}

async function analyze(url) {
  hide("result"); hide("error"); hide("rescan");
  show("state");
  $("state").querySelector(".state-text").textContent = "Analyzing with AI…";

  try {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ source_type: "url", input: url }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
    render(data);
  } catch (e) {
    hide("state");
    $("error").textContent = `Analysis failed: ${e.message}`;
    show("error"); show("rescan");
  }
}

function render(data) {
  const t = data.threat;
  hide("state");
  $("verdict").textContent = t.verdict;
  $("verdict").className = `verdict ${t.verdict}`;
  $("score").innerHTML = `risk <b>${t.risk_score}</b>/100 · conf <b>${Math.round(t.confidence * 100)}%</b>`;
  $("latency").textContent = `${data.latency_ms}ms`;

  const metaBits = [];
  if (t.brand_impersonated) metaBits.push(`Impersonates <b>${escapeHtml(t.brand_impersonated)}</b>`);
  if (t.category) metaBits.push(t.category);
  $("meta").innerHTML = metaBits.join(" · ");
  $("meta").style.display = metaBits.length ? "block" : "none";

  $("reasoning").textContent = t.ai_reasoning || "—";

  const indicators = Array.isArray(t.indicators) ? t.indicators : [];
  $("indicators").innerHTML = indicators.length
    ? indicators.map((i) => `<li>${escapeHtml(i)}</li>`).join("")
    : `<li style="color:var(--muted)">No indicators flagged</li>`;

  show("result"); show("rescan");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

document.addEventListener("DOMContentLoaded", async () => {
  $("open-soc").href = SOC_URL;

  const url = await getActiveTabUrl();
  $("url").textContent = url || "(no active tab)";
  $("url").title = url;

  if (!isAnalyzable(url)) {
    hide("state");
    $("error").textContent = "This page can't be analyzed (must start with http:// or https://).";
    show("error");
    return;
  }

  $("rescan").addEventListener("click", () => analyze(url));
  analyze(url);
});
