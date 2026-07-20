"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AhrefsFilters } from "@/lib/ahrefs/types";
import {
  hasContactData,
  type AppendSummary,
  type BusinessRecord,
  type ReferringDomain,
} from "@/lib/types";
import {
  analyzeDomains,
  appendToSheet,
  fetchDomains,
  loadWorksheets,
} from "@/lib/client-api";
import { competitorUrlFor } from "@/lib/competitors";
import { parsePastedData, parseReferringDomainsFile } from "@/lib/parse-upload";
import { SAMPLE_REFERRING_DOMAINS } from "@/lib/sample-data";
import { AddRecordForm } from "./add-record-form";
import { FilterPanel } from "./filter-panel";
import { ReferringDomainsTable } from "./referring-domains-table";
import { ResultsTable } from "./results-table";
import { SaveStatus } from "./save-status";
import { StatusSummary, type Phase } from "./status-summary";
import { Button, Card, Field, Select, TextInput } from "./ui";

const DEFAULT_FILTERS: AhrefsFilters = {
  domainKeyword: "dent",
  status: "all",
  linkStatus: "any",
  sinceLastMonth: true,
};

/** Normalize a source URL for matching (protocol/path/case-insensitive). */
function sourceKey(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

/** Ensure a manually-entered URL has a protocol so links work. */
function normalizeSourceUrl(url: string): string {
  const u = url.trim();
  if (!u) return u;
  return /^https?:\/\//i.test(u) ? u : `https://${u.replace(/^\/+/, "")}`;
}

export function Dashboard() {
  const [worksheets, setWorksheets] = useState<string[]>([]);
  const [worksheetsError, setWorksheetsError] = useState<string | null>(null);
  const [worksheet, setWorksheet] = useState("");
  const [target, setTarget] = useState("");
  const [filters, setFilters] = useState<AhrefsFilters>(DEFAULT_FILTERS);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [domains, setDomains] = useState<ReferringDomain[]>([]);
  const [dataSource, setDataSource] = useState<
    "live" | "sample" | "upload" | "urls"
  >("live");
  const [urlText, setUrlText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<BusinessRecord[]>([]);
  const [selected, setSelected] = useState<BusinessRecord[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [saveSummary, setSaveSummary] = useState<AppendSummary | null>(null);
  const [copiedEmpty, setCopiedEmpty] = useState(false);
  // Source-URL keys the user manually moved out of the table into the no-data list.
  const [excludedUrls, setExcludedUrls] = useState<Set<string>>(new Set());
  // Keys of no/low-data URLs the user pulled back into the table.
  const [includedUrls, setIncludedUrls] = useState<Set<string>>(new Set());
  // Rows the user typed in by hand (merged with scraped results, override by URL).
  const [manualRecords, setManualRecords] = useState<BusinessRecord[]>([]);
  // Synchronous guard so rapid double-clicks can't fire concurrent saves.
  const savingRef = useRef(false);

  // Load worksheet names (Phase 3 read) on mount. Nothing is selected by
  // default — the user must explicitly choose a competitor to enable actions.
  useEffect(() => {
    loadWorksheets()
      .then((names) => setWorksheets(names))
      .catch((e) => setWorksheetsError(e.message));
  }, []);

  // Select a competitor/worksheet and auto-fill its preset URL (still editable).
  function selectWorksheet(name: string) {
    setWorksheet(name);
    const url = competitorUrlFor(name);
    if (url !== undefined) setTarget(url);
  }

  const busy =
    phase === "ahrefs" || phase === "analyze" || phase === "saving";
  // A competitor/worksheet must be selected before any action is allowed.
  const noCompetitor = !worksheet;
  const blocked = busy || noCompetitor;

  function resetResults() {
    setError(null);
    setSaveSummary(null);
    setDomains([]);
    setRecords([]);
    setSelected([]);
    setExcludedUrls(new Set());
    setIncludedUrls(new Set());
    setManualRecords([]);
    setProgress({ done: 0, total: 0 });
  }

  // Phase 1 only: fetch referring domains and show the Ahrefs-style table.
  const handleSearch = useCallback(async () => {
    if (!worksheet || !target.trim()) return;
    resetResults();
    setDataSource("live");
    try {
      setPhase("ahrefs");
      const result = await fetchDomains(target.trim(), filters);
      setDomains(result);
      setPhase("domains");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
      setPhase("error");
    }
  }, [worksheet, target, filters]);

  // Preview the Phase 1 table with sample data (no API units consumed).
  const handleSample = useCallback(() => {
    if (!worksheet) return;
    resetResults();
    setDataSource("sample");
    setDomains(SAMPLE_REFERRING_DOMAINS);
    setPhase("domains");
  }, [worksheet]);

  // Use pasted data, skipping the Ahrefs step. Accepts a plain URL list, a
  // clean CSV/TSV, or a table copied directly from the Ahrefs web UI.
  const handleAddUrls = useCallback(() => {
    if (!worksheet) return;
    resetResults();

    const { domains: parsed, source } = parsePastedData(urlText);
    if (parsed.length === 0) {
      setError("No valid URLs or rows found. Paste a URL list, CSV, or Ahrefs table.");
      setPhase("error");
      return;
    }
    setDataSource(source);
    setDomains(parsed);
    setPhase("domains");
  }, [urlText, worksheet]);

  // Upload a CSV/TSV of previously-fetched domains, skipping the Ahrefs step.
  const handleUpload = useCallback(
    async (file: File) => {
      if (!worksheet) return;
      resetResults();
      try {
        const text = await file.text();
        const { domains: parsed, unmatchedHeaders } =
          parseReferringDomainsFile(text);
        if (parsed.length === 0) {
          setError("No rows found in the file. Check it has a header + data.");
          setPhase("error");
          return;
        }
        if (unmatchedHeaders.length > 0) {
          // Non-fatal: just log which columns were ignored.
          console.info("Ignored unrecognized columns:", unmatchedHeaders);
        }
        setDataSource("upload");
        setDomains(parsed);
        setPhase("domains");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not read the file.");
        setPhase("error");
      }
    },
    [worksheet],
  );

  // Phase 2: analyze the referring domains' websites (streamed).
  const handleAnalyze = useCallback(async () => {
    if (!worksheet || domains.length === 0) return;
    setError(null);
    setRecords([]);
    setSelected([]);
    setExcludedUrls(new Set());
    setIncludedUrls(new Set());
    setManualRecords([]);
    setPhase("analyze");
    setProgress({ done: 0, total: domains.length });
    try {
      await analyzeDomains(
        domains.map((d) => d.domain),
        {
          // Stream each result into the table as soon as it's analyzed, so
          // rows appear live instead of after the whole batch finishes.
          onProgress: (done, total, record) => {
            setProgress({ done, total });
            setRecords((prev) => [...prev, record]);
          },
          // Replace with the canonical, complete, ordered set at the end.
          onDone: (recs) => {
            setRecords(recs);
            setPhase("ready");
          },
          onError: (message) => {
            setError(message);
            setPhase("error");
          },
        },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
      setPhase("error");
    }
  }, [worksheet, domains]);

  // Phase 3: append selected records to the chosen worksheet.
  const handleSave = useCallback(async () => {
    // Block re-entry: a second click while a save is in flight is ignored, so
    // the same rows can never be appended twice. (The backend also dedupes by
    // source_url as a second line of defense.)
    if (savingRef.current) return;
    if (selected.length === 0 || !worksheet) return;
    savingRef.current = true;
    setError(null);
    setSaveSummary(null);
    setPhase("saving");
    try {
      const summary = await appendToSheet(worksheet, selected);
      setSaveSummary(summary);
      setPhase("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
      setPhase("error");
    } finally {
      savingRef.current = false;
    }
  }, [selected, worksheet]);

  const showDomains = domains.length > 0;
  const showRecords = records.length > 0 || manualRecords.length > 0;

  // Scraped + manual results, with manual entries overriding scraped ones by URL.
  const mergedRecords = useMemo(() => {
    const manualByKey = new Map(
      manualRecords.map((r) => [sourceKey(r.source_url), r]),
    );
    const out: BusinessRecord[] = [];
    const scrapedKeys = new Set<string>();
    for (const r of records) {
      const k = sourceKey(r.source_url);
      scrapedKeys.add(k);
      out.push(manualByKey.get(k) ?? r);
    }
    // Manual rows for URLs that weren't in the scraped set.
    for (const r of manualRecords) {
      if (!scrapedKeys.has(sourceKey(r.source_url))) out.push(r);
    }
    return out;
  }, [records, manualRecords]);

  // Whether a record belongs in the table: not set aside, and either it has
  // contact data or the user explicitly pulled it back in from the no-data list.
  const inTable = useCallback(
    (r: BusinessRecord) => {
      const key = sourceKey(r.source_url);
      return (
        !excludedUrls.has(key) && (hasContactData(r) || includedUrls.has(key))
      );
    },
    [excludedUrls, includedUrls],
  );

  const tableRecords = useMemo(
    () => mergedRecords.filter(inTable),
    [mergedRecords, inTable],
  );

  // No-data list = everything not in the table. Each carries its match key so
  // it can be pulled back in, plus a display domain for the warning + copy.
  const noDataItems = useMemo(() => {
    const seen = new Set<string>();
    const out: { key: string; display: string }[] = [];
    for (const r of mergedRecords) {
      if (inTable(r)) continue;
      const key = sourceKey(r.source_url);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ key, display: r.source_url.replace(/^https?:\/\//, "") });
    }
    return out;
  }, [mergedRecords, inTable]);

  // Move a row out of the table into the no-data list.
  const handleExclude = useCallback((record: BusinessRecord) => {
    const key = sourceKey(record.source_url);
    setExcludedUrls((prev) => new Set(prev).add(key));
    setIncludedUrls((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  // Pull a no/low-data URL back into the table (with whatever details it has).
  const handleIncludeFromNoData = useCallback((key: string) => {
    setIncludedUrls((prev) => new Set(prev).add(key));
    setExcludedUrls((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  // Add a hand-researched row: it joins the table and un-excludes that URL.
  const handleAddManual = useCallback((record: BusinessRecord) => {
    const normalized: BusinessRecord = {
      ...record,
      source_url: normalizeSourceUrl(record.source_url),
    };
    const key = sourceKey(normalized.source_url);
    setExcludedUrls((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setManualRecords((prev) => [
      ...prev.filter((r) => sourceKey(r.source_url) !== key),
      normalized,
    ]);
  }, []);

  const copyNoDataDomains = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(
        noDataItems.map((i) => i.display).join("\n"),
      );
      setCopiedEmpty(true);
      setTimeout(() => setCopiedEmpty(false), 1500);
    } catch {
      // Clipboard may be unavailable (e.g. non-secure context) — ignore.
    }
  }, [noDataItems]);

  return (
    <div className="flex flex-col gap-6">
      {/* Search controls */}
      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Competitor / worksheet"
            hint="required — target worksheet for Search, Upload & URLs"
          >
            {worksheetsError ? (
              <span className="text-xs text-red-500">{worksheetsError}</span>
            ) : (
              <Select
                value={worksheet}
                onChange={(e) => selectWorksheet(e.target.value)}
                disabled={busy || worksheets.length === 0}
              >
                <option value="">
                  {worksheets.length === 0
                    ? "Loading…"
                    : "Select competitor…"}
                </option>
                {worksheets.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Competitor domain" hint="e.g. adit.com">
            <TextInput
              value={target}
              placeholder="competitor.com"
              disabled={busy}
              onChange={(e) => setTarget(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
            />
          </Field>
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            Filters
          </h2>
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            disabled={blocked}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          {noCompetitor ? (
            <span className="mr-auto text-xs text-amber-600 dark:text-amber-400">
              Select a competitor above to enable actions.
            </span>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = ""; // allow re-uploading the same file
            }}
          />
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={blocked}
          >
            Upload CSV
          </Button>
          <Button variant="ghost" onClick={handleSample} disabled={blocked}>
            Load sample data
          </Button>
          <Button onClick={handleSearch} disabled={blocked || !target.trim()}>
            {phase === "ahrefs" ? "Fetching…" : "Search"}
          </Button>
        </div>

        <details className="mt-4 border-t border-border pt-4">
          <summary className="cursor-pointer text-sm text-muted">
            Or paste URLs, a CSV, or an Ahrefs table (skip Ahrefs API)
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-xs text-muted">
              Paste any of: a plain list of URLs (one per line), a CSV with a
              header row (Domain, DR, Traffic, …), or a table copied straight
              from the Ahrefs Referring domains report. All are converted to the
              table below.
            </p>
            <textarea
              value={urlText}
              onChange={(e) => setUrlText(e.target.value)}
              disabled={blocked}
              rows={6}
              placeholder={
                "URLs only:\nbrightdentalcare.com\nhttps://familysmiles.com/\n\nor a CSV:\nDomain,DR,Traffic,First seen\nrosecrestdental.com,35,63,2026-06-30"
              }
              className="w-full rounded-md border border-border bg-card p-3 font-mono text-sm outline-none placeholder:text-muted focus:border-accent"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleAddUrls}
                disabled={blocked || !urlText.trim()}
              >
                Use pasted data
              </Button>
            </div>
          </div>
        </details>
      </Card>

      <StatusSummary
        phase={phase}
        domainCount={domains.length}
        recordCount={records.length}
        progress={progress}
        error={error}
      />

      {/* Phase 1 results — Ahrefs-style referring domains table */}
      {showDomains ? (
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              Referring domains
              {dataSource === "sample" ? (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                  SAMPLE DATA
                </span>
              ) : dataSource === "upload" ? (
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  UPLOADED
                </span>
              ) : dataSource === "urls" ? (
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  URLS ONLY
                </span>
              ) : null}
            </h2>
            <Button onClick={handleAnalyze} disabled={blocked}>
              {phase === "analyze"
                ? "Analyzing…"
                : `Analyze ${domains.length} websites →`}
            </Button>
          </div>
          <ReferringDomainsTable domains={domains} exportDisabled={blocked} />
        </Card>
      ) : phase === "domains" ? (
        <Card className="p-10 text-center text-sm text-muted">
          No referring domains matched your filters.
        </Card>
      ) : null}

      {/* Phase 2 results — enriched contact records for review + save */}
      {showRecords ? (
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">
              Contact details{" "}
              <span className="font-normal text-muted">
                ({tableRecords.length})
              </span>
            </h2>
            <Button
              onClick={handleSave}
              disabled={busy || selected.length === 0 || !worksheet}
            >
              {phase === "saving" ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Saving…
                </>
              ) : (
                `Save ${selected.length} to "${worksheet}"`
              )}
            </Button>
          </div>

          <SaveStatus phase={phase} worksheet={worksheet} summary={saveSummary} />

          <details className="mb-4">
            <summary className="cursor-pointer text-sm text-muted">
              ＋ Add a row manually (for URLs you researched by hand)
            </summary>
            <div className="mt-3">
              <AddRecordForm onAdd={handleAddManual} disabled={blocked} />
            </div>
          </details>

          {noDataItems.length > 0 ? (
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              <div className="mb-2 flex items-start justify-between gap-3">
                <p className="font-medium">
                  {noDataItems.length} site
                  {noDataItems.length > 1 ? "s" : ""} with no / low contact
                  details (excluded from save) — click ＋ to add one back to the
                  table:
                </p>
                <button
                  type="button"
                  onClick={copyNoDataDomains}
                  className="shrink-0 rounded border border-amber-400 px-2 py-1 text-[11px] font-medium hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/40"
                >
                  {copiedEmpty ? "Copied!" : "Copy URLs"}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {noDataItems.map((item) => (
                  <span
                    key={item.key}
                    className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-100/60 py-0.5 pl-2 pr-0.5 dark:border-amber-800 dark:bg-amber-900/40"
                  >
                    {item.display}
                    <button
                      type="button"
                      onClick={() => handleIncludeFromNoData(item.key)}
                      title="Add this URL back to the table"
                      className="rounded px-1 font-semibold text-amber-700 hover:bg-amber-200 dark:text-amber-300 dark:hover:bg-amber-800"
                    >
                      ＋
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {tableRecords.length > 0 ? (
            <ResultsTable
              records={tableRecords}
              onSelectedChange={setSelected}
              onExclude={handleExclude}
              exportDisabled={blocked}
            />
          ) : phase !== "analyze" ? (
            <p className="py-6 text-center text-sm text-muted">
              No contact details to show — all analyzed sites are in the no-data
              list above.
            </p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
