# 📜 Constitution Study Coach — AZ & US

A simple, offline Chrome extension with **quick-reference summaries** of the
**U.S. Constitution** and the **Arizona Constitution**, built for self-study
(e.g. Northland Pioneer College's Arizona & U.S. Constitution requirement,
ARS §15-1821).

It is a personal study tool: you open it whenever you want to review. It does
**not** connect to or interact with any LMS (Blackboard/Moodle), and it sends
no data anywhere — everything runs locally in the popup.

## Features

- **Two tabs:** U.S. Constitution (Preamble, 7 Articles, all 27 Amendments) and
  Arizona Constitution (key articles + Arizona's signature direct-democracy
  features: Initiative, Referendum, Recall).
- **Instant search** across titles, summaries, and key points, with match
  highlighting.
- **Tap to expand** each topic for a plain-language summary and bullet points.
- 100% offline, no accounts, no tracking, no permissions requested.

## Install (Load Unpacked)

1. Open `chrome://extensions` in Chrome (or Edge/Brave).
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select the `constitution-study/` folder.
4. Pin the 📜 icon and click it anytime to study.

## How to use it well

- Read a topic, close the popup, and try to recall the key points before
  reopening — active recall beats re-reading.
- Use search to jump to a term you saw in a lecture ("eminent domain",
  "initiative", "recall").

## Accuracy note

Summaries are condensed study aids written in plain language. For exact
wording and any graded work, always confirm against the **official text** of
each constitution. If you spot anything to fix, edit `data.js` — content lives
in two plain arrays (`US_CONSTITUTION`, `AZ_CONSTITUTION`).

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension manifest (MV3) |
| `popup.html` / `popup.css` | UI |
| `popup.js` | Search, tabs, expand/collapse |
| `data.js` | All study content (edit here to add topics) |
| `icons/` | Toolbar icons |
