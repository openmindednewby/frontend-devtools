import { RuleTester } from 'eslint';

import plugin from './game-menu-focusable.js';

const rule = plugin.rules['game-menu-focusable'] as unknown as Parameters<RuleTester['run']>[1];

const ruleTester = new RuleTester({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const POINTER_ONLY = [{ messageId: 'pointerOnlyItem' }];
const KEYDOWN_STOP = [{ messageId: 'keydownStopPropagation' }];

ruleTester.run('game-menu-focusable', rule, {
  valid: [
    { code: "function m() { const b = document.createElement('button'); b.addEventListener('click', go); }" },
    { code: "function m() { const d = document.createElement('div'); d.tabIndex = 0; d.addEventListener('click', go); }" },
    { code: "function m() { const d = document.createElement('div'); d.setAttribute('role', 'button'); d.onclick = go; }" },
    { code: "function m() { const li = document.createElement('li'); li.setAttribute('tabindex', '0'); li.addEventListener('pointerup', go); }" },
    { code: "function m() { const d = document.createElement('div'); d.addEventListener('pointermove', go); }" },
    { code: "function m(host) { host.addEventListener('click', go); }" },
    { code: "function m() { const a = document.createElement('a'); a.onclick = go; }" },
    { code: "window.addEventListener('keydown', (e) => { e.preventDefault(); });" },
    { code: "window.addEventListener('keydown', (e) => { list.forEach(() => { other.stopPropagation(); }); });" },
    { code: "root.addEventListener('pointerdown', (e) => e.stopPropagation());" },
  ],
  invalid: [
    { code: "function m() { const d = document.createElement('div'); d.addEventListener('click', go); }", errors: POINTER_ONLY },
    { code: "function m() { const s = document.createElement('span'); s.addEventListener('pointerdown', go); }", errors: POINTER_ONLY },
    { code: "function m() { const li = document.createElement('li'); li.onclick = go; }", errors: POINTER_ONLY },
    { code: "function m() { const i = document.createElement('IMG') as HTMLImageElement; i.addEventListener('pointerup', go); }", errors: POINTER_ONLY },
    { code: "function m() { let d; d = document.createElement('div'); d.className = 'item'; d.addEventListener('click', go); }", errors: POINTER_ONLY },
    { code: "window.addEventListener('keydown', (e) => { e.stopPropagation(); });", errors: KEYDOWN_STOP },
    { code: "function onKey(e) { if (e.key === 'Escape') e.stopPropagation(); }\nroot.addEventListener('keydown', onKey);", errors: KEYDOWN_STOP },
    { code: "const onKey = (e: KeyboardEvent) => e.stopPropagation();\nroot.onkeydown = onKey;", errors: KEYDOWN_STOP },
  ],
});
