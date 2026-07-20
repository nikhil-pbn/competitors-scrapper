import type {
  AppendSummary,
  BusinessRecord,
  ReferringDomain,
} from "@/lib/types";

/** Where the current domain list came from (drives the source badge). */
export type DataSource = "live" | "sample" | "upload" | "urls";

/** The single pipeline state-machine phase, shared by the status banners. */
export type Phase =
  | "idle"
  | "ahrefs"
  | "domains"
  | "analyze"
  | "ready"
  | "saving"
  | "saved"
  | "error";

export interface PipelineState {
  phase: Phase;
  error: string | null;
  domains: ReferringDomain[];
  dataSource: DataSource;
  records: BusinessRecord[];
  progress: { done: number; total: number };
  saveSummary: AppendSummary | null;
}

export const initialPipelineState: PipelineState = {
  phase: "idle",
  error: null,
  domains: [],
  dataSource: "live",
  records: [],
  progress: { done: 0, total: 0 },
  saveSummary: null,
};

export type PipelineAction =
  | { type: "fetchStart" }
  | { type: "domainsLoaded"; domains: ReferringDomain[]; dataSource: DataSource }
  | { type: "sourceError"; message: string }
  | { type: "analyzeStart"; total: number }
  | { type: "progress"; done: number; total: number; record: BusinessRecord }
  | { type: "analyzeDone"; records: BusinessRecord[] }
  | { type: "saveStart" }
  | { type: "saveDone"; summary: AppendSummary }
  | { type: "fail"; message: string };

/**
 * Pure reducer for the Ahrefs → analyze → save pipeline. Keeping the whole
 * state machine in one pure function makes the transitions easy to reason about
 * and test, and keeps the hook (side effects) and UI (rendering) thin.
 *
 * `sourceError` clears the whole result set (a failed/empty source load has no
 * domains to show), whereas `fail` preserves domains/records (an analyze or
 * save error should not discard work already on screen).
 */
export function pipelineReducer(
  state: PipelineState,
  action: PipelineAction,
): PipelineState {
  switch (action.type) {
    case "fetchStart":
      return { ...initialPipelineState, phase: "ahrefs", dataSource: "live" };
    case "domainsLoaded":
      return {
        ...state,
        phase: "domains",
        error: null,
        saveSummary: null,
        records: [],
        progress: { done: 0, total: 0 },
        domains: action.domains,
        dataSource: action.dataSource,
      };
    case "sourceError":
      return { ...initialPipelineState, phase: "error", error: action.message };
    case "analyzeStart":
      return {
        ...state,
        phase: "analyze",
        error: null,
        records: [],
        progress: { done: 0, total: action.total },
      };
    case "progress":
      return {
        ...state,
        progress: { done: action.done, total: action.total },
        records: [...state.records, action.record],
      };
    case "analyzeDone":
      return { ...state, phase: "ready", records: action.records };
    case "saveStart":
      return { ...state, phase: "saving", error: null, saveSummary: null };
    case "saveDone":
      return { ...state, phase: "saved", saveSummary: action.summary };
    case "fail":
      return { ...state, phase: "error", error: action.message };
    default:
      return state;
  }
}
