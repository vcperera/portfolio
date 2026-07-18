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
| `certificates` | Accolades page | ID, Title, Issuer, Verification Link, Thumbnail, Certificate, Subject, Series, Scale |
| `featured` | Featured page | ID, Title, Description, Thumbnail, Post_Link, Tags, Scale |
| `projects` | Projects page + landing Missions list | ID, Title, Description, Explanation, Tags, Thumbnail, Media, Scale |

Notes on a few columns:

- **Image / Thumbnail** values are filenames relative to that section's asset
  folder (see below) — e.g. `4) SEDS KDU.png`.
- **Back_Description** (`organisations`) is the text shown when a card is flipped.
- **Scale** carries two meanings by sheet. In the logo sheets
  (`organisations`, `education`, `techstack`) it is a numeric per-logo CSS
  scale — `1` is baseline, `1.3` renders 30% bigger, `0.7` 30% smaller;
  applied live in the browser (never touches the source image) and clamped to
  a sane range. In the card sheets (`certificates`, `featured`, `projects`) it
  is a thumbnail-fit flag — `NO` fits (contain) rather than fills (cover);
  blank/`YES` fills.
- **Certificate thumbs/PDFs** (`certificates`) are named after the certificate
  **Title** (e.g. `thumbs/Claude 101.webp`, `pdfs/Claude 101.pdf`), not a
  numeric index, so reordering rows never means renaming files. Blank falls
  back to `thumbs/<ID>.webp` / `pdfs/<ID>.pdf`.
- **Media** (`projects`) is a `|`-separated ordered list of image paths for the
  detail viewer. **Explanation** paragraphs are separated by a blank line.

### Where images live

| Section | Folder |
|---------|--------|
| Organisation logos | `assets/logos/organisations/` |
| Institution crests (education) | `assets/logos/education/` |
| Tech-stack logos | `assets/logos/techstack/` |
| Personas / memoji | `assets/memoji/` |
| Certificate files / thumbs | `accolades/pdfs/`, `accolades/thumbs/` |
| Featured thumbs | `featured/thumbs/` |
| Project images | `projects/Project <N>/` |

### Adding new content — examples

- **New organisation:** drop the logo in `assets/logos/organisations/`, then add a
  row to the `organisations` sheet (fill `Image` with the filename and write a
  `Back_Description`).
- **New certificate:** add the PDF to `accolades/pdfs/` and a `.webp` thumb to
  `accolades/thumbs/`, then add a row to the `certificates` sheet.
- **New tool:** drop the logo in `assets/logos/techstack/` and add a row to the
  `techstack` sheet (reuse an existing `Category` / `Sub-Category` to slot it into a
  group).

---

## Project structure

```
/
├── index.html            Landing page (Mission Control)
├── home.js               Landing-page logic (reads organisations, education, techstack, personas, projects)
├── fetch.xlsx            Master data workbook — one sheet per section
├── README.md
├── assets/
│   ├── data.js           Shared workbook loader (SheetJS wrapper)
│   ├── mission.css       Shared design system
│   ├── mission.js        Shared behaviours (cursor, starfield, transitions, reveals)
│   ├── space-bg.js, star-avatar.js, vish-avatar.js, mission.js
│   ├── logos/            organisations/ · education/ · techstack/
│   ├── me/  memoji/      portraits and personas
├── accolades/       Accolades page (index.html) + pdfs/ + thumbs/
├── featured/             Featured page (index.html, featured.js) + thumbs/
└── projects/             Projects page (index.html, projects.js) + Project <N>/ folders
```

---

## Running locally

Because the pages fetch `fetch.xlsx` over HTTP, they must be served from a local
web server — opening the files directly with `file://` will not work (browsers
block local fetches).

Run a simple static server from the project root, then open the printed URL:

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
