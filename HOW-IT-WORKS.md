# How this tool works — end to end

A developer-oriented walkthrough of the **Referring Domains Automation** tool:
the UI, the code paths behind each button, the API routes, and the external
services (Ahrefs, Google Sheets, Vercel Blob). Read alongside the code — every
step names the file and function involved.

> New to the product side? See [README.md](README.md) for the non-technical
> guide. This document is the engineering map.

---

## 1. What it does (the 30-second version)

For each competitor (a tab in a master Google Sheet), the tool:

1. **Phase 1 — Ahrefs:** fetch the competitor's *referring domains* (sites that
   link to it), filtered.
2. **Phase 2 — Analyze:** visit each of those websites and scrape best-effort
   business contact details (practice name, phone, email, location…).
3. **Phase 3 — Save:** append/update the reviewed rows into that competitor's
   worksheet tab.

You can run **multiple competitors at once** — every domain/record is tagged
with its competitor, and Save writes each row back to its own tab.

Three independent, testable phases: the output of one is the input of the next
(`ReferringDomain[]` → `BusinessRecord[]` → `AppendSummary[]`).

---

## 2. Stack & top-level layout

- **Next.js 16** (App Router, Turbopack), **React 19**, **Tailwind v4**, **shadcn/ui**.
- **TypeScript**, `@/*` path alias → `src/*`.
- External: **Ahrefs API v3**, **Google Sheets API** (service account), **Vercel Blob** (audit + no-data JSON).

```
src/
  app/                    # routing only
    layout.tsx            # theme + auth gate boundary
    page.tsx              # header + <Dashboard/>
    globals.css
    admin/page.tsx        # audit log (admin only)
    nodata/page.tsx       # manual-research workspace
    api/
      ahrefs/route.ts         # Phase 1
      analyze/route.ts        # Phase 2 (SSE)
      sheets/append/route.ts  # Phase 3
      worksheets/route.ts     # list competitor tabs
      auth/{login,logout,google,google/callback}/route.ts
      admin/audit/route.ts    # delete/clear audit (admin)
      research/nodata/route.ts# no-data CRUD
  components/
    ui/                   # shadcn primitives + MultiSelect + barrel
    theme/                # dark/light provider, script, toggle
    data-table/           # FilterInput, TablePagination, TableSkeleton
    auth/                 # PasswordGate, LogoutButton
    admin/                # AdminTools, DeleteEntryButton
    research/             # ResearchWorkspace, ResearchRow
  features/
    dashboard/            # the whole main tool (see §4)
  lib/
    ahrefs/               # Phase 1 service (client, filters, types)
    analyzer/             # Phase 2 service (scraper, extractors, normalize)
    sheets/               # Phase 3 service (client, append, upsert, delete, ...)
    audit/store.ts        # save-audit log (Blob)
    research/store.ts     # no-data research list (Blob)
    auth/                 # session, password, google, current-user, config
    parse/                # CSV / paste / URL-list parsers
    types.ts, format.ts, csv.ts, competitors.ts, env.ts, client-api.ts, blob-json.ts
  proxy.ts                # edge gate for /api/* (Next 16's renamed middleware)
```

**Architecture rule:** routes are thin adapters; all logic lives in `lib/`
services; UI components hold no business logic.

---

## 3. Every request is gated (auth)

Before any feature runs, two independent gates enforce sign-in:

1. **`src/proxy.ts`** (runs on the server before routes, Next 16's `middleware`
   rename). Matcher: `/api/:path*`. It lets `/api/auth/*` through, and for every
   other API call it requires a valid signed session cookie (`verifySession`);
   otherwise **401**. This protects the Sheets/Ahrefs APIs even from direct curl.
2. **`src/app/layout.tsx`** (server component) reads the session cookie and
   renders `children` only when authenticated — otherwise it renders
   `<PasswordGate/>` in its place. So the dashboard's HTML/JS is never shipped to
   an unauthenticated browser.

**Two ways in** (both mint the same signed cookie via `createSession`):

- **Shared password** — `PasswordGate` → `POST /api/auth/login` →
  `verifyPassword()` (scrypt hash in `APP_PASSWORD_HASH`, constant-time compare,
  in-memory rate limit) → sets `cs_session` (HttpOnly, Secure, SameSite, HS256
  JWT signed with `AUTH_SECRET`). Session subject = `"password"`.
- **Google** — `GET /api/auth/google` (sets a CSRF `state` cookie, redirects to
  Google) → `GET /api/auth/google/callback` verifies `state`, exchanges the code,
  **verifies the id_token against Google's JWKS**, enforces the
  `@practicenumbers.com` domain (`lib/auth/google.ts`), then `createSession(email)`.
  Session subject = the email.

`/admin` additionally requires `isAdminEmail()` (`ADMIN_EMAILS`, default
`nikhil.kumar@practicenumbers.com`) — so it's reachable only via Google sign-in
as that person. `/nodata` is open to any signed-in user.

---

## 4. The dashboard = a state machine + hooks + sections

`src/features/dashboard/` is the whole main tool.

- **`dashboard.tsx`** — thin composition root. Owns UI state (`selected`
  competitors, `filters`, `urlText`) and wires the hooks to the section
  components. No business logic.
- **`pipeline.ts`** — the **pure reducer** (`pipelineReducer`) + `PipelineState`.
  This is the single source of truth for the Ahrefs→analyze→save flow. Phases:
  `idle → ahrefs → domains → analyze → ready → saving → saved` (+ `error`).
- **Hooks:**
  - `hooks/use-worksheets.ts` — loads competitor tab names for the picker.
  - `hooks/use-pipeline.ts` — owns `useReducer(pipelineReducer)`, plus `analyze`
    and `save`; composes `useDomainSources`.
  - `hooks/use-domain-sources.ts` — the Phase-1 loaders: `search`, `sample`,
    `usePasted`, `upload`.
  - `hooks/use-review.ts` — review-time overrides (excluded / re-included /
    manually-added rows).
- **`selectors.ts`** — pure derivations: `mergeRecords`, `inTable`,
  `computeNoDataItems`.
- **`keys.ts`** — `sourceKey` (normalize a URL for matching), `normalizeSourceUrl`.

Data-flow diagram:

```
useWorksheets ─► competitor picker
useDomainSources ─► domains ─► reducer.domainsLoaded
        │                          │
        ▼                          ▼
   /api/ahrefs                (ReferringDomainsSection table)
                                   │  Analyze
                                   ▼
   usePipeline.analyze ─► /api/analyze (SSE) ─► reducer.progress/analyzeDone
                                   │
                                   ▼
   selectors ─► tableRecords / noDataItems ─► ContactDetailsSection
                                   │  Save
                                   ▼
   usePipeline.save ─► /api/sheets/append (per tab) ─► reducer.saveDone
```

---

## 5. Phase 1 — the **Search** button, click to sheet data

**UI:** the competitor **MultiSelect** (`components/ui/multi-select.tsx`) +
`FilterPanel` + the **Search** button (`SourceActions`), all inside `SearchPanel`.
Search is enabled when ≥1 selected competitor has a known domain.

**Step by step when you click Search:**

1. `dashboard.tsx` computes `searchableCompetitors` =
   `selected.map(name => ({ name, domain: competitorUrlFor(name) })).filter(has domain)`
   (`competitorUrlFor` in `lib/competitors.ts` maps a tab name → its site).
   `onSearch={() => pipeline.search(searchableCompetitors, filters)}`.
2. **`use-domain-sources.ts → search()`**: `onReset()` (clears review), dispatch
   `fetchStart` (phase → `ahrefs`). Then **for each competitor**:
   - `await fetchDomains(c.domain, filters)` — `lib/client-api.ts` does
     `POST /api/ahrefs` with `{ target, filters }`, returns `data.domains`.
   - Tag each returned domain with `competitor: c.name` and **dedupe across
     competitors** by `sourceKey` (first competitor wins).
   - Per-competitor errors are collected but don't abort the others.
3. dispatch `domainsLoaded({ domains: all, dataSource: "live" })` → phase
   `domains`; the reducer stores the combined list.

**The API call (`src/app/api/ahrefs/route.ts`):**

- Zod-validates `{ target, filters }`. `filters` = `{ domainKeyword?, status?,
  linkStatus?, range?, limit? }`.
- Calls **`lib/ahrefs/client.ts → fetchReferringDomains()`**, which:
  - Builds the query for `GET https://api.ahrefs.com/v3/site-explorer/refdomains`:
    `target`, `mode=subdomains`, `protocol=both`, `select=<SELECT_COLUMNS>`,
    `order_by=domain_rating:desc`, `limit`, `history`, `output=json`.
    **`mode=subdomains` is required for a bare domain target** — `mode=domain`
    excludes `www` and other subdomains and does not match the web UI.
  - `history` comes from **`lib/ahrefs/filters.ts → buildHistory()`**: `"live"`
    for All/New (the current snapshot), and `since:YYYY-MM-DD` / `all_time` for
    Lost (so lost rows are included in the report).
  - `where` comes from **`buildWhere()`** — a JSON boolean expression:
    - `domainKeyword` → `isubstring` on `domain`.
    - `status="new"` → **`first_seen >= sinceDateFor(range)`** (a referring
      domain is "new" when its FIRST link appeared in the window — *not*
      `new_links>0`, which also matches old domains that merely gained another
      link, the bug that returned 72 rows where Ahrefs showed 10).
    - `status="lost"` → `last_seen >= sinceDateFor(range)` (or `lost_links>0`
      for "All time").
    - `status="all"` → no date/status condition; lists every current referring
      domain, so the date range does not filter it (matches the Ahrefs "All" tab).
    - `linkStatus` (New only) → `discovered_status` = `pagefound`
      (Newly published) / `linkfound` (Link added) / `linkrestored`
      (Link restored).
  - `Authorization: Bearer ${AHREFS_API_KEY}`, `cache: "no-store"`.
  - Maps each raw row (`toReferringDomain`) to the clean `ReferringDomain` model
    and dedupes by domain.
- Route returns `{ domains, count }`.

**Cost note:** N selected competitors = N Ahrefs calls = N× units.

**Alternatives to Search** (all in `use-domain-sources.ts`, single-competitor —
require exactly one selected, which tags the domains):

- `sample(competitor)` — `SAMPLE_REFERRING_DOMAINS` (no API units).
- `usePasted(text, competitor)` — `lib/parse/index.ts → parsePastedData()`
  detects an Ahrefs web-table copy, a CSV/TSV, or a plain URL list.
- `upload(file, competitor)` — `parseReferringDomainsFile()` (tolerant CSV/TSV).

---

## 6. Phase 2 — the **Analyze** button (streaming scrape)

**UI:** `ReferringDomainsSection` shows the domain table + an **analyze-scope
MultiSelect** (which competitors to include) + the **Analyze** button. The button
analyzes only the domains whose competitor is in the scope.

**Step by step:**

1. `onAnalyze(subset)` → `dashboard` → `pipeline.analyze(subset)`.
2. **`use-pipeline.ts → analyze()`**: `onReset()`, dispatch `analyzeStart(total)`
   (phase → `analyze`), build a `domain → competitor` map from the subset.
   Then `analyzeDomains(subset.map(d => d.domain), { onProgress, onDone, onError })`.
3. **`lib/client-api.ts → analyzeDomains()`** does `POST /api/analyze` and reads
   the **Server-Sent Events** stream, dispatching:
   - `progress` → append the record (tagged with its competitor) to state.
   - `done` → replace with the final ordered set (phase → `ready`).
   - `error` → phase `error`.

**The API call (`src/app/api/analyze/route.ts`):** returns a
`text/event-stream` `ReadableStream`; frames are `event: <name>\ndata: <json>\n\n`
(`progress` / `done` / `error`). `maxDuration = 300`. It calls the scraper:

**`lib/analyzer/scraper.ts`:**
- `analyzeDomains()` runs a **bounded-concurrency worker pool** (default 8),
  calling `onProgress` after each domain resolves (this is what streams the SSE).
- `analyzeDomain(domain)` fetches the homepage (10s timeout, HTML only), and if
  key fields are still missing, tries `/contact`, `/contact-us`, `/about`,
  `/about-us`, merging results. Always resolves — a dead site yields a record
  with only `source_url`.
- Extraction is pure & unit-testable in **`lib/analyzer/extractors/`**
  (`html.ts` JSON-LD parsing, `location.ts` address/US-state, `contact-fields.ts`
  name/email/phone/doctor), assembled by **`normalize.ts → normalizeFromHtml()`**
  into a `BusinessRecord`.

Records stream into the **Contact details** table live as they complete.

---

## 7. Review stage

Between analyze and save, `use-review.ts` + `selectors.ts` shape the table:

- Domains with **no contact data** are excluded and listed in the amber
  **NoDataNotice** (each carries its competitor). From there you can `＋` a URL
  back into the table, **Copy URLs**, **Save for research** (→ `/nodata`, grouped
  by competitor), or **View all no-data URLs**.
- **Move to no-data** on an unchecked row pushes it out.
- **Add a row manually** (`AddRecordForm`) — pick a competitor, fill fields.
- Row checkboxes + a **Save-scope MultiSelect** decide exactly what saves.

---

## 8. Phase 3 — the **Save** button (per-tab upsert)

**UI:** `ContactDetailsSection`. The effective save set = **checked rows** whose
competitor is in the **Save-to** scope.

**Step by step:**

1. `onSave(toSave)` → `pipeline.save(toSave)`.
2. **`use-pipeline.ts → save()`**: a `savingRef` guard blocks double-clicks;
   **group records by `competitor`**; dispatch `saveStart`; then **for each
   `[tab, group]`**: `appendToSheet(tab, group)` (`client-api` → `POST
   /api/sheets/append`), collecting an `AppendSummary`; dispatch
   `saveDone(summaries)`. `SaveStatus` shows a per-tab breakdown.

**The API call (`src/app/api/sheets/append/route.ts`):**
- Zod-validates `{ worksheet, records }` (the extra `competitor` field on records
  is stripped here — it's metadata, never a sheet column).
- **`lib/sheets/append.ts → appendRecords()`**:
  - Reads the worksheet's header row and existing rows via the Sheets API
    (`lib/sheets/client.ts`, service-account JWT auth).
  - **`lib/sheets/upsert.ts → planUpsert()`** (pure): matches by `source_url`,
    decides new rows vs in-place updates (only when a mapped cell actually
    changed) vs unchanged, and returns `addedUrls`. Maps `BusinessRecord` fields
    to the sheet's own header columns by name.
  - Applies `values.batchUpdate` (updates) + `values.append` (new rows).
  - Returns an `AppendSummary { worksheet, added, updated, unchanged,
    skippedDuplicates, received, addedUrls }`.
- **Audit:** best-effort `logSave()` (see §9) records who saved, which tab, and
  the counts.

---

## 9. Audit log (`/admin`)

- **`lib/audit/store.ts`** stores one JSON file, `audit.json`, in a **private
  Vercel Blob** store (read via `readStreamJson` in `lib/blob-json.ts` to avoid a
  Node `ArrayBuffer.transfer` crash). Each save appends `{ id, timestamp (IST),
  user, worksheet, received, added, updated, unchanged, addedUrls }`.
- **`/admin`** (`app/admin/page.tsx`) is admin-gated, reads the log, and renders a
  table with **auto-refresh (hourly)**, **Download JSON**, **Clear all**, and
  **per-row Delete**.
- **Deleting a row** (`POST /api/admin/audit`, admin-only) also removes the exact
  rows that save added from the worksheet tab (`lib/sheets/delete.ts →
  deleteRowsByUrls`, matched by `source_url`, deleted bottom-up).

---

## 10. No-data research (`/nodata`)

- **`lib/research/store.ts`** stores `nodata.json` in the same Blob store — a list
  of editable records `{ id, worksheet, source_url, + contact fields }`.
- **`/nodata`** is a thin page; **`ResearchWorkspace`** fetches its data
  client-side from `GET /api/research/nodata` (list) so the page never does
  network reads during server render. Features: a **tab filter**, **Export CSV**
  (URL + tab), and per-row **edit → Save / Add to sheet / Delete**.
- **Add to sheet** posts the edited row to the same `POST /api/sheets/append`
  (its origin tab) and then removes it from the list. All mutations go through
  `POST /api/research/nodata` (`add` / `update` / `delete`).

---

## 11. Data models (`lib/types.ts`)

- **`ReferringDomain`** — Phase 1 output: `domain` + Ahrefs metrics
  (`domainRating`, `trafficDomain`, `keywords`, `firstSeen`, `newLinks`, …) +
  optional `competitor` tag.
- **`BusinessRecord`** — Phase 2 output & Phase 3 input: the 8 contact fields
  (`practice_name … source_url`) + optional `competitor` (metadata; not in
  `BUSINESS_RECORD_FIELDS`, so never written as a column). `hasContactData()`,
  `emptyBusinessRecord()`.
- **`AppendSummary`** — Phase 3 result per tab.

---

## 12. Environment variables

Set in Vercel (and `.env.local` for dev) — see [.env.example](.env.example):

| Var | Purpose |
| --- | --- |
| `AHREFS_API_KEY` | Ahrefs API v3 bearer token (Phase 1) |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Master spreadsheet id |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` | Service-account creds (Phase 3); share the sheet with the SA as Editor |
| `AUTH_SECRET` | Signs the session cookie |
| `APP_PASSWORD_HASH` | scrypt hash of the shared password (`scrypt:salt:hash`) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional — enables "Continue with Google" |
| `ADMIN_EMAILS` | Optional — who can open `/admin` |
| `BLOB_READ_WRITE_TOKEN` | Connect a Vercel Blob store → enables the audit log + `/nodata` |

---

## 13. Where to change things (cheat sheet)

| Want to change… | Edit… |
| --- | --- |
| Ahrefs columns / filters / date ranges | `lib/ahrefs/client.ts`, `lib/ahrefs/filters.ts`, `lib/ahrefs/types.ts` |
| What gets scraped | `lib/analyzer/extractors/*`, `normalize.ts`; concurrency/timeout in `scraper.ts` |
| Sheet columns / upsert rules | `lib/sheets/upsert.ts` (+ your sheet's header row) |
| The pipeline state machine | `features/dashboard/pipeline.ts` |
| Competitor → domain map | `lib/competitors.ts` |
| Auth (who can get in, admin list) | `lib/auth/*` |
| A UI primitive | `components/ui/*` (shadcn) |

Verify with `npm run build` (typecheck + compile) and `npx eslint src`.
```
