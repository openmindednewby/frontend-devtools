import { GateMode } from './GateMode';

export const DEFAULT_BASELINE_FILE = 'eslint-baseline.json';

export const GATE_USAGE = 'usage: eslint-baseline <check|write> --input <eslint-results.json> [--baseline eslint-baseline.json] [--root <dir>] | eslint-baseline lint [--baseline eslint-baseline.json] [-- <eslint args>]';

const PASSTHROUGH = '--';

export interface GateArgs {
  mode: GateMode;
  input: string;
  baseline: string;
  root: string;
  passthrough: string[];
}

function toMode(value: string | undefined): GateMode {
  if (value === GateMode.Check || value === GateMode.Write || value === GateMode.Lint) {
    return value;
  }
  throw new Error(GATE_USAGE);
}

function optionValues(options: string[]): Record<string, string | undefined> {
  const values: Record<string, string | undefined> = {};
  for (let index = 0; index < options.length; index += 2) {
    const name = options[index] ?? '';
    if (!name.startsWith('--')) {
      throw new Error(GATE_USAGE);
    }
    values[name.slice(2)] = options[index + 1];
  }
  return values;
}

/** Parses the gate command line (see GATE_USAGE); throws the usage text when invalid. */
export function parseGateArgs(argv: string[], cwd: string): GateArgs {
  const [modeArg, ...rest] = argv;
  const mode = toMode(modeArg);
  const split = rest.indexOf(PASSTHROUGH);
  const options = split === -1 ? rest : rest.slice(0, split);
  const passthrough = split === -1 ? [] : rest.slice(split + 1);
  const values = optionValues(options);
  const input = values.input ?? '';
  if (input === '' && mode !== GateMode.Lint) {
    throw new Error(GATE_USAGE);
  }
  return { mode, input, baseline: values.baseline ?? DEFAULT_BASELINE_FILE, root: values.root ?? cwd, passthrough };
}
