# Tubig Butuan · Water Info Hub

A community-run water information hub for Butuan City, built during the September 2026 water crisis.
Bisaya first, English second. Works on a cheap phone over weak signal, installs to the home screen, and keeps the last schedule readable offline.

**Not an official site of BCWD or the City Government.** It republishes their public advisories in one place so residents can find them.

## What it shows

- **Supply status**: current BCWD supply against the normal 55 MLD, the Taguibo dam level against its 4 m critical line, and the State of Calamity.
- **Barangay map**: all 86 barangays as a lightweight vector map (no tiles needed), colored by which barangays have a tanker today. Tap a barangay to select it. GPS finds your barangay. An optional detailed street map (OpenStreetMap) loads on demand.
- **Tanker schedule**: today's tanker stops for your barangay, with "now", "done", and share-to-Messenger text.
- **Oplan Sag-Ob stations**: fetching stations with open/closed status, hours, what to bring, and directions.
- **Hotlines**: BCWD, CDRRMD, 911, police, plus a slot to save your own barangay hall's number.
- **Safe water guide**: boiling, chlorination, storage, and conservation, in Bisaya and English.
- **Report a leak**: composes an SMS to BCWD from your own phone.

## Run it locally

No build step, no dependencies. Any static server works:

```bash
python -m http.server 8765
```

Then open http://localhost:8765. (Opening `index.html` directly from disk also works, minus the service worker.)

## Update the data

Everything a volunteer needs to change lives in `data/`. See [EDITING.md](EDITING.md) for the step-by-step guide in Bisaya and English.

| File | What it holds | Update when |
|---|---|---|
| `data/status.json` | supply MLD, dam level, calamity status, affected counts | BCWD or PIO posts a new status |
| `data/schedule.json` | today's tanker stops per barangay | PIO posts the day's rationing schedule |
| `data/stations.json` | Oplan Sag-Ob fetching stations and hours | BCWD changes stations or hours |
| `data/hotlines.json` | phone numbers | a number changes |
| `data/barangays.json` | barangay boundaries (generated, do not hand-edit) | never |

## Archived copies of every source

Official pages move, go blank, or get deleted. `tools/archive-sources.py` saves every `sourceUrl` in `data/` to the Wayback Machine and writes the snapshot address back as `archiveUrl`, which the site shows as an "archived copy" link beside the live one.

```bash
python tools/archive-sources.py
```

`--dry-run` only reports, `--force` re-archives everything. The GitHub Actions workflow in `.github/workflows/archive-sources.yml` runs it automatically whenever a data file changes on `main` and every Monday morning, committing any new links back. Facebook URLs are skipped because the archive only captures a login wall.

## Deploy (Cloudflare Pages)

1. Push this folder to a GitHub repository. Put it under a shared organization, not a personal account, so it can be handed over later.
2. In Cloudflare Pages, choose **Connect to Git**, pick the repo, leave the build command empty, and set the output directory to `/`.
3. Every push to `main` deploys in about a minute. Branches get preview URLs.
4. Add a custom domain under **Custom domains**. HTTPS is automatic. HTTPS is required for GPS and home-screen install.

GitHub Pages or Netlify work the same way, since this is plain static files.

## Project layout

```
index.html            page skeleton (Bisaya text baked in, JS swaps to English)
css/style.css         all styling, light and dark
js/app.js             app logic, strings, rendering
js/map.js             vector map, pan/zoom, pins, locate, optional Leaflet layer
data/*.json           the data volunteers edit
sw.js                 service worker: offline shell, network-first data
manifest.webmanifest  install-to-home-screen metadata
icons/                app icons
```

## Data sources and credits

- Butuan City Water District advisories: https://bcwd.gov.ph/
- Butuan City Public Information Office (daily rationing schedules on Facebook)
- City Government of Butuan emergency hotline poster (Nov 2025)
- Barangay boundaries: PSA/NAMRIA via [faeldon/philippines-json-maps](https://github.com/faeldon/philippines-json-maps) (MIT), 2019 edition, simplified to 1%
- Street map (optional layer): © OpenStreetMap contributors; Leaflet (BSD-2)

## License

MIT. See [LICENSE](LICENSE).
