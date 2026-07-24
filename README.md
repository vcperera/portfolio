# Vishal Perera — Portfolio

A static "Mission Control" portfolio site. Plain HTML / CSS / JavaScript, no build
step and no server-side code. Every page reads its content at runtime from a single
Excel workbook — **`fetch.xlsx`** — so adding or editing content never requires
touching code.

---

## How content works

All displayed data lives in one workbook at the site root: **`fetch.xlsx`**.
Each worksheet (tab) feeds one section of the site. To change what appears on the
site, open `fetch.xlsx`, edit the relevant sheet, save, and redeploy. That is the
entire workflow.

The pages load the workbook in the browser using [SheetJS](https://sheetjs.com)
(pulled from a CDN) via the shared helper `assets/data.js`, which exposes
`PortfolioData.load("<sheet>")` and returns each row as an object keyed by the
column headers.

### Sheets in `fetch.xlsx`

| Sheet | Feeds | Key columns |
|-------|-------|-------------|
| `organisations` | Flight Log cards ("Organizations Served") + card flip backs | ID, Name, Image, Year, Tag, Role, Start, End, Location, **Back_Description**, Scale |
| `education` | Education ledger | ID, Name, Image, Years, Location, Title, Blurb, Scale |
| `techstack` | Tech Stack grid + category rail | ID, Category, Color, Sub-Category, Sub_Color, Tool, Image, Scale |
| `personas` | Hero persona / callsign rotator | ID, Image, Tag |
| `certificates` | Accolades page | ID, Title, Issuer, Verification Link, Thumbnail, Certificate, Subject, Series, Series_Order, Scale |
| `featured` | Featured page | ID, Title, Description, Thumbnail, Post_Link, Tags, Scale |
| `projects` | Projects page + landing Missions list | ID, Title, Description, Explanation, Tags, Thumbnail, Media, Scale |

Notes on a few columns:

- **Image / Thumbnail** values are filenames relative to that section's asset
  folder (see below) — e.g. `Github.webp`, `thumbs/14.webp`.
- **Back_Description** (`organisations`) is the text shown when a card is flipped.
- **Scale** carries two meanings by sheet. In the logo sheets
  (`organisations`, `education`, `techstack`) it is a numeric per-logo CSS
  scale — `1` is baseline, `1.3` renders 30% bigger, `0.7` 30% smaller;
  applied live in the browser (never touches the source image) and clamped to
  a sane range. In the card sheets (`certificates`, `featured`, `projects`) it
  is a thumbnail-fit flag — `NO` fits the whole image (CSS `contain`, nothing
  cropped) rather than filling the frame (`cover`); blank/`YES` fills.
- **Media** (`projects`) is a `|`-separated ordered list of image paths for the
  detail viewer. **Explanation** paragraphs are separated by a blank line.
- **Series / Series_Order** (`certificates`) group multi-part courses together
  in the Accolades layout; `Subject` drives that page's subject filters.

### Display order — newest first

`featured` and `projects` render in **descending ID order**, so the entry with the
**highest ID appears at the top**. This makes adding content append-only: give the
new row the next number up and it lands on top automatically — no renumbering of the
existing rows.

- The sort lives in `featured/featured.js`, `projects/projects.js` and the landing
  Missions list in `home.js` (all three use `b.id.localeCompare(a.id, …)`).
- Because these two sections order by ID, **their image files are named by that
  same numeric ID** (see below), so the ID, the row, and its files stay in lock-step.
- The landing Missions list numbers rows by their **display position** (01, 02, 03…
  from the top), independent of the underlying ID.

`certificates` (Accolades) is the exception: it is **curated**, not recency-ordered.
It renders in ascending Column-A (ID) order and then regroups by `Subject` /
`Series` when those filters are active, with an optional pinned entry. Its files are
named by **Title**, not ID, so its ordering is independent of any numbering scheme.

### Where images live

| Section | Folder | Naming |
|---------|--------|--------|
| Organisation logos | `assets/logos/organisations/` | by `Image` filename |
| Institution crests (education) | `assets/logos/education/` | by `Image` filename |
| Tech-stack logos | `assets/logos/techstack/` | by `Image` filename |
| Personas / memoji | `assets/memoji/` | by `Image` filename |
| Portrait rotator (hero) | `assets/me/web/` | `1.jpg` … `4.jpg` |
| Certificate files / thumbs | `accolades/pdfs/`, `accolades/thumbs/` | by **Title** (e.g. `Claude 101.webp`) |
| Featured thumbs | `featured/thumbs/` | by **ID** — `<ID>.webp` (e.g. `14.webp`) |
| Project images | `projects/Project <ID>/` | `<ID>-<n>.webp` (e.g. `Project 7/7-1.webp`) |

### Adding new content — examples

- **New featured post (lands at the top):** save the thumbnail as
  `featured/thumbs/<next-ID>.webp` (e.g. `15.webp`), then add a `featured` row with
  that ID, its `Title`, `Description`, `Post_Link`, `Tags`, and `Scale` (`NO` to show
  the whole image uncropped). Descending order places it first automatically.
- **New project (lands at the top):** create `projects/Project <next-ID>/`, add the
  images as `<next-ID>-1.webp`, `<next-ID>-2.webp`, … then add a `projects` row with
  that ID, pointing `Thumbnail` and the `|`-separated `Media` list at those files.
- **New certificate:** add the PDF to `accolades/pdfs/` and a `.webp` thumb to
  `accolades/thumbs/`, both named after the certificate `Title`, then add a
  `certificates` row (set `Subject`, and `Series` / `Series_Order` if it is part of a
  course). Row position follows the curated ID order, not recency.
- **New organisation:** drop the logo in `assets/logos/organisations/`, then add a
  row to the `organisations` sheet (fill `Image` with the filename and write a
  `Back_Description`).
- **New tool:** drop the logo in `assets/logos/techstack/` and add a row to the
  `techstack` sheet (reuse an existing `Category` / `Sub-Category` to slot it into a
  group).

---

## Site analytics (header counter)

The landing-page header shows a single live **VIEWS** counter (total page views),
powered by [GoatCounter](https://www.goatcounter.com). The count is fetched in
`assets/mission.js` (`initStats`) from the site's GoatCounter `TOTAL.json` endpoint;
`assets/mission.js` also loads the GoatCounter tracking script that records the
views. Unique-visitor totals are intentionally **not displayed**. `localhost` is
deliberately not counted, so local previews never inflate the numbers.

---

## Project structure

```
/
├── index.html            Landing page (Mission Control)
├── home.js               Landing-page logic (reads organisations, education, techstack, personas, projects)
├── fetch.xlsx            Master data workbook — one sheet per section
├── serve.bat             Local preview launcher (runs tools/build.py, then a static server)
├── vercel.json           Static-host (Vercel) config
├── README.md
├── assets/
│   ├── data.js           Shared workbook loader (SheetJS wrapper)
│   ├── mission.css       Shared design system
│   ├── mission.js        Shared behaviours (cursor, starfield, transitions, reveals, VIEWS counter)
│   ├── logo-normalize.js Per-logo CSS scaling from the Scale column
│   ├── space-bg.js · star-avatar.js · vish-avatar.js   Hero/background visuals
│   ├── logos/            organisations/ · education/ · techstack/
│   ├── memoji/           Persona / callsign images
│   └── me/web/           Portrait rotator images
├── accolades/            Accolades page (index.html) + pdfs/ + thumbs/   (files named by Title)
├── featured/             Featured page (index.html, featured.js) + thumbs/   (files named by ID)
├── projects/             Projects page (index.html, projects.js) + Project <ID>/ folders (files named by ID)
├── contact/              Contact page (index.html) — form submits via Web3Forms
└── tools/
    └── build.py          Pre-flight reference validator (see below)
```

---

## Pre-flight check (`tools/build.py`)

Windows filenames are case-**insensitive**; Vercel (Linux) is case-**sensitive**, so
a row pointing at `Github.webp` when the file is really `GitHub.webp` works locally
but silently 404s in production. `tools/build.py` prevents that: it reads every
image/PDF reference in `fetch.xlsx` and compares it against the real directory
listing using **exact** string matching, reproducing Linux behaviour on any OS.

It validates the `Image`, `Thumbnail`, `Media` and `Certificate` columns across all
seven sheets, reports any `missing` files or case mismatches, never modifies
`fetch.xlsx`, and never blocks the server from starting. `serve.bat` runs it
automatically; you can also run it directly:

```
python tools/build.py
```

A clean run prints `All references resolve exactly. Safe to commit and deploy.`

---

## Running locally

Because the pages fetch `fetch.xlsx` over HTTP, they must be served from a local
web server — opening the files directly with `file://` will not work (browsers
block local fetches).

On Windows, `serve.bat` runs the pre-flight check and starts a static server in one
step. Otherwise, run a simple static server from the project root:

```
python -m http.server 8010
```

Then visit `http://localhost:8010/`.

  (Port 8010, not 8000 — a stale service worker/cache from a different
  project can get stuck on `localhost:8000` and silently serve its own old
  page instead of this site. If you ever see a blank page with 404s for
  files this project doesn't have, open DevTools > Application > Service
  Workers and unregister anything listed, then Clear site data.)

---

## Deployment

The site is fully static and deploys to any static host. On **Vercel**, import the
repository and deploy with no build command and the project root as the output
directory. `fetch.xlsx` and the `assets/` folder ship as-is; SheetJS loads from its
CDN at runtime. No environment variables, secrets, or server code are required.
Run `python tools/build.py` before deploying to catch any case-sensitivity 404s.
