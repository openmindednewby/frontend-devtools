export interface LintArgs {
  eslintArgs: string[];
  maxWarnings: number;
}

const NO_WARNING_CAP = -1;
const MAX_WARNINGS_FLAG = '--max-warnings';
const DEFAULT_TARGETS = ['.'];
const VALUE_FLAGS = ['--ext', '--config', '-c', '--ignore-pattern', '--rule', '--format', '-f', '--output-file', '-o', '--cache-location', '--resolve-plugins-relative-to', '--plugin', '--parser', '--env', '--global'];

function hasTarget(args: string[]): boolean {
  return args.some((value, index) => !value.startsWith('-') && !VALUE_FLAGS.includes(args[index - 1] ?? ''));
}

/** Splits the ESLint arguments after `--`: the gate keeps `--max-warnings`; the target defaults to `.`. */
export function parseLintArgs(passthrough: string[]): LintArgs {
  const at = passthrough.indexOf(MAX_WARNINGS_FLAG);
  const cap = at === -1 ? NO_WARNING_CAP : Number(passthrough[at + 1]);
  const eslintArgs = at === -1 ? passthrough : passthrough.filter((_value, index) => index !== at && index !== at + 1);
  return { eslintArgs: hasTarget(eslintArgs) ? eslintArgs : [...eslintArgs, ...DEFAULT_TARGETS], maxWarnings: Number.isNaN(cap) ? NO_WARNING_CAP : cap };
}
