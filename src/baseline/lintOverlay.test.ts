import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { GATED_RULES } from './gatedRules';
import { buildOverlay, OVERLAY_FILE } from './lintOverlay';

interface OverlayLoad {
  status: number | null;
  stdout: string;
  stderr: string;
}

function loadOverlay(appConfig: string): OverlayLoad {
  const dir = mkdtempSync(join(tmpdir(), 'overlay-'));
  try {
    writeFileSync(join(dir, 'eslint.config.mjs'), appConfig);
    writeFileSync(join(dir, OVERLAY_FILE), buildOverlay('eslint.config.mjs', GATED_RULES));
    const url = pathToFileURL(join(dir, OVERLAY_FILE)).href;
    const script = `const m = await import(${JSON.stringify(url)}); const last = m.default.at(-1); console.log(Object.keys(last.rules).sort().join(","));`;
    const run = spawnSync(process.execPath, ['--input-type=module', '-e', script], { cwd: dir, encoding: 'utf8' });
    return { status: run.status, stdout: run.stdout, stderr: run.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('buildOverlay loaded by node', () => {
  it('with no typescript-eslint plugin in the app config or node_modules, fails loudly naming the missing plugin', () => {
    const appConfig = 'export default [{ rules: {} }];';

    const load = loadOverlay(appConfig);

    expect([load.status !== 0, load.stderr.includes('no @typescript-eslint plugin')]).toEqual([true, true]);
  });

  it('with the typescript-eslint plugin in the app config, loads and appends all four gated rules', () => {
    const appConfig = 'export default [{ plugins: { "@typescript-eslint": { rules: {} } } }];';

    const load = loadOverlay(appConfig);

    expect([load.status, load.stdout.trim()]).toEqual([0, Object.keys(GATED_RULES).sort().join(',')]);
  });
});
