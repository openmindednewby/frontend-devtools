export const BASELINE_RULE_IDS: readonly string[] = [
  'max-lines',
  '@typescript-eslint/member-ordering',
  'member-order-fields/member-ordering',
  'member-order-accessors/member-ordering',
];

export interface LintMessageLike {
  ruleId: string | null;
}

export interface LintResultLike {
  filePath: string;
  messages: LintMessageLike[];
}

export type RuleCounts = Record<string, number>;

export type Baseline = Record<string, RuleCounts>;

export interface CountChange {
  file: string;
  ruleId: string;
  baseline: number;
  actual: number;
}

export interface GateReport {
  rises: CountChange[];
  newFiles: CountChange[];
  stale: CountChange[];
}

function toPosix(path: string): string {
  return path.replace(/\\/g, '/');
}

function toRelative(filePath: string, root: string): string {
  const base = toPosix(root).replace(/\/+$/, '');
  const file = toPosix(filePath);
  return file.startsWith(`${base}/`) ? file.slice(base.length + 1) : file;
}

function sortKeys<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.keys(record).sort().map((key) => [key, record[key] as T]));
}

function countRules(messages: LintMessageLike[], ruleIds: readonly string[]): RuleCounts {
  const counts: RuleCounts = {};
  messages
    .map((message) => message.ruleId)
    .filter((ruleId): ruleId is string => ruleId !== null && ruleIds.includes(ruleId))
    .forEach((ruleId) => {
      counts[ruleId] = (counts[ruleId] ?? 0) + 1;
    });
  return sortKeys(counts);
}

/** Counts the gated rule messages per file, keyed by the path relative to `root`. */
export function countViolations(results: LintResultLike[], root: string, ruleIds: readonly string[] = BASELINE_RULE_IDS): Baseline {
  const baseline: Baseline = {};
  results.forEach((result) => {
    const counts = countRules(result.messages, ruleIds);
    if (Object.keys(counts).length > 0) {
      baseline[toRelative(result.filePath, root)] = counts;
    }
  });
  return sortKeys(baseline);
}

function pairsOf(source: Baseline, baseline: Baseline, actual: Baseline): CountChange[] {
  return Object.keys(source).sort().flatMap((file) =>
    Object.keys(source[file] ?? {}).sort().map((ruleId) => ({
      file,
      ruleId,
      baseline: baseline[file]?.[ruleId] ?? 0,
      actual: actual[file]?.[ruleId] ?? 0,
    })));
}

/** Compares actual counts to the shrink-only baseline: rises and new files fail, drops are stale entries. */
export function compareBaseline(baseline: Baseline, actual: Baseline): GateReport {
  const increases = pairsOf(actual, baseline, actual).filter((pair) => pair.actual > pair.baseline);
  const stale = pairsOf(baseline, baseline, actual).filter((pair) => pair.actual < pair.baseline);
  return {
    rises: increases.filter((entry) => baseline[entry.file] !== undefined),
    newFiles: increases.filter((entry) => baseline[entry.file] === undefined),
    stale,
  };
}

/** True when no count rose and no new file appeared. */
export function gatePasses(report: GateReport): boolean {
  return report.rises.length === 0 && report.newFiles.length === 0;
}

/** Sums every rule across all files of a baseline. */
export function totalsPerRule(baseline: Baseline): RuleCounts {
  const totals: RuleCounts = {};
  Object.values(baseline).forEach((counts) => {
    Object.entries(counts).forEach(([ruleId, count]) => {
      totals[ruleId] = (totals[ruleId] ?? 0) + count;
    });
  });
  return sortKeys(totals);
}
