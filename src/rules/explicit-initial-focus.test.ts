import { RuleTester } from 'eslint';

import plugin from './explicit-initial-focus.js';

const rule = plugin.rules['explicit-initial-focus'] as unknown as Parameters<RuleTester['run']>[1];

const ruleTester = new RuleTester({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
});

const MENU = [{ messageId: 'missingMenuDefault' }];
const DIALOG = [{ messageId: 'missingDialogFocus' }];

ruleTester.run('explicit-initial-focus', rule, {
  valid: [
    { code: "import { MENU_DEFAULT_ATTR } from '@dloizides/game-input';\nconst html = `<button>Garage</button><button ${MENU_DEFAULT_ATTR}>Continue</button>`;" },
    { code: 'const html = `<button>Garage</button><button data-menu-default>Continue</button>`;' },
    { code: "function m() { const a = document.createElement('button'); const b = document.createElement('button'); b.dataset.menuDefault = ''; }" },
    { code: "function m() { const a = document.createElement('button'); const b = document.createElement('button'); b.setAttribute('data-menu-default', ''); }" },
    { code: "const nav = createMenuNav({ baseRoot: () => app, initialFocus });\nconst html = '<button>A</button><button>B</button>';" },
    { code: "const html = '<button>Only one</button>';" },
    { code: "function m() { const b = document.createElement('button'); root.append(b); }" },
    { code: 'const D = () => <ConfirmDialog visible><Button autoFocus title={t} /></ConfirmDialog>;' },
    { code: 'const D = () => <Modal visible initialFocus="cancel"><Body /></Modal>;' },
    { code: 'const D = () => { useEffect(() => { ref.current?.focus(); }, []); return <EditDialog><Field ref={ref} /></EditDialog>; };' },
    { code: 'const D = () => <AppDialog visible><Body /></AppDialog>;', options: [{ selfFocusing: ['AppDialog'] }] },
    { code: 'const S = () => <View><Text>Plain screen</Text></View>;' },
    { code: "const html = '<button>A</button><button>B</button>';", options: [{ minControls: 3 }] },
  ],
  invalid: [
    { code: 'const html = `<button>Garage</button><button>Continue</button>`;', errors: MENU },
    { code: "const html = '<div class=\"menu\"><BUTTON>A</BUTTON></div>' + '<button>B</button>';", errors: MENU },
    { code: "function m() { const a = document.createElement('button'); const b = document.createElement('BUTTON'); root.append(a, b); }", errors: MENU },
    { code: "function m() { const a = document.createElement('button'); a.dataset.go = '1'; return `${a.outerHTML}<button>Back</button>`; }", errors: MENU },
    { code: 'const D = () => <ConfirmDialog visible><Button title={t} /></ConfirmDialog>;', errors: DIALOG },
    { code: 'const D = () => <Modal visible><Body /></Modal>;', errors: DIALOG },
    { code: 'const D = () => <UI.SheetModal><Body /></UI.SheetModal>;', errors: DIALOG },
    { code: 'const D = () => <View role="dialog"><Body /></View>;', errors: DIALOG },
    { code: 'const D = () => <View accessibilityRole="dialog"><Body /></View>;', errors: DIALOG },
    { code: 'const D = () => <Panel />;', options: [{ dialogPattern: 'Panel$' }], errors: DIALOG },
  ],
});
