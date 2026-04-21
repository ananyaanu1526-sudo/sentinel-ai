# Sentinel.AI Phishing Guard — Chrome Extension

Real-time AI phishing analysis of the page you're visiting. Calls the
Sentinel.AI `analyze-threat` edge function (powered by Lovable AI) and shows
a verdict, risk score, and indicators in the popup.

## Install (unpacked)

1. Download / unzip this folder.
2. Open `chrome://extensions` (works in Chrome, Edge, Brave, Arc, Opera).
3. Enable **Developer mode** (toggle, top-right).
4. Click **Load unpacked** and select the unzipped folder.
5. Pin the Sentinel.AI icon to your toolbar.

## Use

Click the icon on any page. The extension reads the current tab URL, sends
it to the Sentinel.AI backend, and displays a verdict (`safe` /
`suspicious` / `phishing` / `malicious`) with AI reasoning and red flags.

> Anonymous popup scans are not persisted to your SOC ledger. Sign in to
> the dashboard and use the in-app Analyzer to log cases.
