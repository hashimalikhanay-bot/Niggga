# PSXTrack — COAF36800

Live PSX portfolio dashboard. Single HTML file, no backend needed.

## Deploy to Vercel

1. Push this repo to GitHub (just these files)
2. Import at vercel.com/new
3. Deploy — no settings needed

## Files

- `index.html` — the entire app (HTML + CSS + JS)
- `vercel.json` — Vercel routing config
- `README.md` — this file

## How prices are fetched

The app tries 3 CORS proxies in order:
1. corsproxy.io
2. allorigins.win
3. codetabs.com

Each proxy forwards the request to dps.psx.com.pk.
If all fail, cached prices (last known close) are shown silently.
The refresh FAB button triggers a fresh fetch.
Auto-refreshes every 60 seconds.

## Portfolio: COAF36800

| # | Scrip   | Shares | Buy Price | Date         |
|---|---------|--------|-----------|--------------|
| 1 | FFC     | 45     | 600.95    | Dec 29, 2025 |
| 2 | MEBL    | 121    | 441.49    | Dec 29, 2025 |
| 3 | POL     | 45     | 608.49    | Dec 29, 2025 |
| 4 | MEBL    | 5      | 469.80    | Jan 5, 2026  |
| 5 | FFC     | 4      | 605.00    | Jan 5, 2026  |
| 6 | SYS     | 17     | 170.50    | Jan 5, 2026  |
| 7 | POL     | 4      | 633.56    | Jan 5, 2026  |
| 8 | FFC     | 18     | 575.87    | Feb 12, 2026 |
| 9 | SYS     | 41     | 123.60    | Mar 16, 2026 |
|10 | AIRLINK | 37     | 137.00    | Mar 16, 2026 |
