import type { LintMessageLike, LintResultLike } from './countGate';

import { BASELINE_RULE_IDS } from './countGate';

export interface SeverityMessage extends LintMessageLike {
  severity: number;
}

export interface SeverityResult extends LintResultLike {
  messages: SeverityMessage[];
  errorCount: number;
  warningCount: number;
  fixableErrorCount?: number;
  fixableWarningCount?: number;
}

export interface UngatedSummary {
  results: SeverityResult[];
  errors: number;
  warnings: number;
}

const ERROR_SEVERITY = 2;
const WARNING_SEVERITY = 1;

function isGated(message: LintMessageLike, ruleIds: readonly string[]): boolean {
  return message.ruleId !== null && ruleIds.includes(message.ruleId);
}

function withoutGated(result: SeverityResult, ruleIds: readonly string[]): SeverityResult {
  const messages = result.messages.filter((message) => !isGated(message, ruleIds));
  return {
    ...result,
    messages,
    errorCount: messages.filter((message) => message.severity === ERROR_SEVERITY).length,
    warningCount: messages.filter((message) => message.severity === WARNING_SEVERITY).length,
    fixableErrorCount: 0,
    fixableWarningCount: 0,
  };
}

/** Removes the count-gated rule messages so the rest of the lint result passes or fails as plain ESLint would. */
export function ungatedResults(results: SeverityResult[], ruleIds: readonly string[] = BASELINE_RULE_IDS): UngatedSummary {
  const ungated = results.map((result) => withoutGated(result, ruleIds));
  return {
    results: ungated,
    errors: ungated.reduce((sum, result) => sum + result.errorCount, 0),
    warnings: ungated.reduce((sum, result) => sum + result.warningCount, 0),
  };
}

/** True when the ungated result fails: any error, or more warnings than `maxWarnings` allows (negative = no cap). */
export function ungatedFails(summary: UngatedSummary, maxWarnings: number): boolean {
  return summary.errors > 0 || (maxWarnings >= 0 && summary.warnings > maxWarnings);
}
