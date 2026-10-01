import type {
  AppendSummary,
  BusinessRecord,
  DentalCheck,
  ReferringDomain,
} from "@/lib/types";
import { sourceKey } from "@/features/dashboard/keys";

/** Where the current domain list came from (drives the source badge). */
export type DataSource = "live" | "sample" | "upload" | "urls";

/** The single pipeline state-machine phase, shared by the status banners. */
export type Phase =
  | "idle"
  | "ahrefs"
  | "domains"
  | "classify"
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
  /** Dental check results, keyed by sourceKey(domain). Empty until checked. */
  dental: Record<string, DentalCheck>;
  records: BusinessRecord[];
  /** Progress of the running dental check or analysis. */
  progress: { done: number; total: number };
  /** One summary per competitor tab written in the last save. */
  saveSummaries: AppendSummary[];
}

export const initialPipelineState: PipelineState = {
  phase: "idle",
  error: null,
  domains: [],
  dataSource: "live",
  dental: {},
  records: [],
  progress: { done: 0, total: 0 },
  saveSummaries: [],
};

export type PipelineAction =
  | { type: "fetchStart" }
  | { type: "domainsLoaded"; domains: ReferringDomain[]; dataSource: DataSource }
  | { type: "sourceError"; message: string }
  | { type: "classifyStart"; total: number }
  | {
      type: "classifyProgress";
      done: number;
      total: number;
      domain: string;
      check: DentalCheck;
    }
  | { type: "classifyDone" }
  | { type: "analyzeStart"; total: number }
  | { type: "progress"; done: number; total: number; record: BusinessRecord }
  | { type: "analyzeDone"; records: BusinessRecord[] }
  | { type: "saveStart" }
  | { type: "saveDone"; summaries: AppendSummary[] }
  | { type: "fail"; message: string };

/**
 * Pure reducer for the Ahrefs → dental check → analyze → save pipeline.
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
        saveSummaries: [],
        records: [],
        progress: { done: 0, total: 0 },
        dental: {},
        domains: action.domains,
        dataSource: action.dataSource,
      };
    case "sourceError":
      return { ...initialPipelineState, phase: "error", error: action.message };
    case "classifyStart":
      return {
        ...state,
        phase: "classify",
        error: null,
        progress: { done: 0, total: action.total },
      };
    case "classifyProgress":
      return {
        ...state,
        progress: { done: action.done, total: action.total },
        dental: { ...state.dental, [sourceKey(action.domain)]: action.check },
      };
    case "classifyDone":
      // Back to wherever the flow was: contact results stay on screen.
      return {
        ...state,
        phase: state.records.length > 0 ? "ready" : "domains",
      };
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
      return { ...state, phase: "saving", error: null, saveSummaries: [] };
    case "saveDone":
      return { ...state, phase: "saved", saveSummaries: action.summaries };
    case "fail":
      return { ...state, phase: "error", error: action.message };
    default:
      return state;
  }
}
