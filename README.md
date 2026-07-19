# Referring Domains Automation

### 🔗 Open the tool → **(https://competitors-scrapper-xi.vercel.app/)**

> _Not set yet? Whoever deploys the tool (see [Setup & deploy](#setup--deploy-technical--for-whoever-installs-the-tool)) should paste the live URL above so the team can bookmark it._

---

Find a competitor's backlink sources, pull their contact details, and drop them into
the right Google Sheet — automatically, in one place.

Instead of manually exporting from Ahrefs, visiting each site for a phone/email, and
pasting into a spreadsheet, this tool does all three steps for you.

---

## How it works — 3 simple steps

| Step | What happens | Cost |
| ---- | ------------ | ---- |
| **1. Get domains** | Pull the list of sites linking to a competitor (from Ahrefs, or your own list) | Ahrefs credits **only if you use Search** |
| **2. Analyze sites** | The tool visits each site and grabs practice name, phone, email, city, state | **Free** |
| **3. Save** | Adds the results as new rows in that competitor's tab in the master sheet | **Free** |

**What costs Ahrefs credits:** only the **Search** button (live Ahrefs lookup).
**What's always free:** uploading/pasting your own data, analyzing sites, and saving to the sheet.

---

## How to use it (step by step)

> Open the tool's link in your browser. No install needed.

### 1. Choose the competitor
At the top, pick the competitor from the dropdown (e.g. *Weave*, *Adit*, *Mango*).
This is the Google Sheet tab your results will be added to.

**Nothing works until you pick one** — this is required first.

### 2. Get the list of domains — pick ONE way:

- **Search** — type the competitor's website (e.g. `adit.com`), set filters, click
  **Search**. Pulls live data from Ahrefs. *(Uses Ahrefs credits.)*
- **Upload CSV** — if you already have a spreadsheet/export file, upload it.
- **Paste** (under *"Or paste URLs, a CSV, or an Ahrefs table"*) — paste one of:
  - a plain list of website links (one per line),
  - a CSV, or
  - **a table copied straight from Ahrefs** (select rows in the Ahrefs Referring
    domains report → copy → paste here).
  Then click **Use pasted data**.
- **Load sample data** — just to see how it looks with example rows.

Either way, you'll get a **Referring domains** table (DR, Traffic, Keywords, etc.).

### 3. Analyze the websites
Click **Analyze N websites →**. The tool visits each site and pulls contact details.
Results **appear live** as it goes, with a progress bar.

- Sites where nothing useful was found are **left out** and listed in a yellow note,
  with a **Copy URLs** button so you can grab them if you want to check by hand.

### 4. Review and save
Look over the **Contact details** table. You can sort, search, and untick any rows
you don't want. Then click **Save … to "<competitor>"**.

- The rows are added to that competitor's tab in the master sheet.
- **Duplicates are skipped** automatically (a site already in the sheet won't be added twice).
- Your existing rows are never changed — new ones are added below.

You'll see a confirmation of how many were added and how many duplicates were skipped.

---

## Filters (for the Search option)

- **Domain contains** — only domains with this word (e.g. `dent`).
- **Status** — All / New / Lost referring domains (with an extra sub-option for New/Lost).
- **Last month only** — only recently found links.
- **Row limit** — how many domains to pull (keep it modest to save Ahrefs credits and time).

---

## Good to know

- **Copy from Ahrefs works directly** — no need to export a file. Just copy the table and paste it.
- **You don't need Ahrefs at all** if you already have a list — use Upload or Paste.
- Some sites hide their info, so a few fields (especially owner/manager names) may be
  blank. That's normal.

---

## If something looks wrong

- **"API units limit reached"** → your team's Ahrefs monthly credits are used up.
  Wait for the reset, upgrade the plan, or just **paste/upload** your data instead
  (that never uses credits).
- **Competitor list is empty / Save fails** → the tool has lost access to the Google
  Sheet. Ask whoever set it up to re-check the sheet is shared with the tool's account.
- **Few results after analyzing** → many of those sites simply don't publish contact
  info. The skipped ones are listed with a **Copy URLs** button.

---

## Setup & deploy (technical — for whoever installs the tool)

Most people only need the link above. This section is for the person deploying it.

**Requirements:** Node.js 20+, an Ahrefs API v3 token, a Google Cloud **service
account** (Sheets API enabled), and **Editor** access to the master spreadsheet.

**Environment variables** (copy `.env.example` → `.env.local`, or set in your host):

| Variable | What it is |
| -------- | ---------- |
| `AHREFS_API_KEY` | Ahrefs API v3 token |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | The ID in the sheet's URL (`…/d/<ID>/edit`) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` from the service-account JSON |
| `GOOGLE_PRIVATE_KEY` | `private_key` from the JSON (one line, keep the `\n`, wrapped in quotes) |

**Important:** share the master spreadsheet with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as **Editor**.

**Run locally:**
```bash
npm install
npm run dev            # http://localhost:3000  (development)
# or
npm run build && npm run start   # production
```
