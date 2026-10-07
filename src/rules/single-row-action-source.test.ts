import { RuleTester } from 'eslint';

import plugin from './single-row-action-source.js';

const rule = plugin.rules['single-row-action-source'] as unknown as Parameters<RuleTester['run']>[1];

const ruleTester = new RuleTester({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
});

const GROUP_IMPORT = "import { RowActionGroup } from '@dloizides/ui-buttons';\n";
const BUILD_IMPORT = "import { buildAttendeeRowActions, attendeeRowActions } from './attendeeRowActions';\n";
const ERROR = [{ messageId: 'localRowActions' }];

ruleTester.run('single-row-action-source', rule, {
  valid: [
    { code: `${GROUP_IMPORT}${BUILD_IMPORT}const C = (p) => <RowActionGroup actions={buildAttendeeRowActions(p.row)} />;` },
    { code: `${GROUP_IMPORT}${BUILD_IMPORT}const C = (p) => <RowActionGroup actions={attendeeRowActions.build(p.row, { omit: { checkIn: 'x' } })} />;` },
    { code: `${GROUP_IMPORT}const C = ({ actions }) => <RowActionGroup actions={actions} />;` },
    { code: `${GROUP_IMPORT}const C = (props) => <RowActionGroup actions={props.actions} />;` },
    { code: `${GROUP_IMPORT}${BUILD_IMPORT}const C = (p) => { const actions = buildAttendeeRowActions(p.row); return <RowActionGroup actions={actions} />; };` },
    { code: `${GROUP_IMPORT}${BUILD_IMPORT}import { useMemo } from 'react';\nconst C = (p) => { const a = useMemo(() => buildAttendeeRowActions(p.row), [p.row]); return <RowActionGroup actions={a} />; };` },
    { code: `${GROUP_IMPORT}${BUILD_IMPORT}const set = attendeeRowActions;\nconst C = (p) => <RowActionGroup actions={set.build(p.row)} />;` },
    { code: "import { RowActionGroup } from './local';\nconst C = () => <RowActionGroup actions={[{ key: 'a' }]} />;" },
    { code: `${GROUP_IMPORT}const C = () => <OtherGroup actions={[{ key: 'a' }]} />;` },
  ],
  invalid: [
    { code: `${GROUP_IMPORT}const C = () => <RowActionGroup actions={[{ key: 'edit' }]} />;`, errors: ERROR },
    { code: `${GROUP_IMPORT}const actions = [{ key: 'edit' }];\nconst C = () => <RowActionGroup actions={actions} />;`, errors: ERROR },
    { code: `${GROUP_IMPORT}import type { RowActionSpec } from '@dloizides/ui-buttons';\nconst C = (p) => { const actions: RowActionSpec[] = p.ok ? [{ key: 'a' }] : []; return <RowActionGroup actions={actions} />; };`, errors: ERROR },
    { code: `${GROUP_IMPORT}import { useMemo } from 'react';\nconst C = () => { const a = useMemo(() => [{ key: 'a' }], []); return <RowActionGroup actions={a} />; };`, errors: ERROR },
    { code: `${GROUP_IMPORT}function buildLocal() { return [{ key: 'a' }]; }\nconst C = () => <RowActionGroup actions={buildLocal()} />;`, errors: ERROR },
    { code: `${GROUP_IMPORT}const buildLocal = () => [{ key: 'a' }];\nconst C = () => <RowActionGroup actions={buildLocal()} />;`, errors: ERROR },
    { code: `${GROUP_IMPORT}${BUILD_IMPORT}const C = (p) => <RowActionGroup actions={[...buildAttendeeRowActions(p.row), { key: 'extra' }]} />;`, errors: ERROR },
    { code: "import { RowActionGroup as Group } from '@dloizides/ui-buttons';\nconst C = () => <Group actions={[]} />;", errors: ERROR },
    { code: "import * as Ui from '@dloizides/ui-buttons';\nconst C = () => <Ui.RowActionGroup actions={[]} />;", errors: ERROR },
    { code: `${GROUP_IMPORT}import type { RowActionSpec } from '@dloizides/ui-buttons';\nconst C = (p) => { let actions: RowActionSpec[]; if (p.ok) actions = [{ key: 'a' }]; else actions = []; return <RowActionGroup actions={actions} />; };`, errors: ERROR },
  ],
});
