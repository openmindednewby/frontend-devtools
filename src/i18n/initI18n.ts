// i18next's default export is the configurable singleton; `.use()` / `.init()`
// are members on it — this is the documented i18next initialization pattern,
// which trips `import/no-named-as-default-member` for the whole fluent chain.
// The disable is owned by the package so the consuming apps don't repeat it.
/* eslint-disable import/no-named-as-default-member */
import i18n, { type i18n as I18nInstance, type Resource } from 'i18next';
import { initReactI18next } from 'react-i18next';

/**
 * Options for {@link initI18n}.
 *
 * Everything app-specific (the strings, the locales, the fallback language and
 * the active language) is passed in — the package owns only the init *chain*.
 */
export interface InitI18nOptions {
  /**
   * The i18next resource bundle, e.g. `{ en: { translation: en } }`.
   * The app owns its own `locales/*.json` — only the init logic is shared.
   */
  resources: Resource;

  /**
   * The active language. Apps typically derive this from device locale,
   * e.g. `expo-localization`'s `getLocales()[0]?.languageCode`.
   *
   * When omitted (or undefined), defaults to {@link fallbackLng}.
   */
  lng?: string;

  /**
   * The fallback language used when a key is missing in {@link lng}.
   * Defaults to `'en'`.
   */
  fallbackLng?: string;

  /**
   * Whether to escape interpolated values. React already escapes output, so
   * the SaaS apps run with `escapeValue: false`. Defaults to `false`.
   */
  escapeValue?: boolean;

  /**
   * Default namespace(s). i18next's default is `'translation'`; the SaaS apps
   * keep that single-namespace convention, so this is optional.
   */
  defaultNS?: string | readonly string[];

  /**
   * Namespace list. Optional — only needed when the app splits strings across
   * multiple namespaces. Single-namespace apps can omit it.
   */
  ns?: string | readonly string[];
}

const DEFAULT_FALLBACK_LNG = 'en';

/**
 * Initialize the shared i18next + react-i18next singleton.
 *
 * This is the parameterized factory that replaces the per-app `i18n.ts`. It
 * wires `react-i18next` into the i18next singleton and runs `.init()` with the
 * app-supplied resources/language, swallowing the async init rejection the same
 * way every app did (i18next resolves synchronously for in-memory resources).
 *
 * The returned value is the i18next singleton — apps `export default` it and
 * call `.t()` through their own `FM()` helper.
 *
 * @example
 * ```ts
 * import { initI18n } from '@dloizides/frontend-devtools';
 * import * as Localization from 'expo-localization';
 * import en from './locales/en.json';
 *
 * const i18n = initI18n({
 *   resources: { en: { translation: en } },
 *   lng: Localization.getLocales()[0]?.languageCode,
 * });
 * export default i18n;
 * ```
 */
export function initI18n(options: InitI18nOptions): I18nInstance {
  const {
    resources,
    lng,
    fallbackLng = DEFAULT_FALLBACK_LNG,
    escapeValue = false,
    defaultNS,
    ns,
  } = options;

  i18n
    .use(initReactI18next)
    .init({
      lng: lng ?? fallbackLng,
      fallbackLng,
      resources,
      ...(defaultNS !== undefined ? { defaultNS } : {}),
      ...(ns !== undefined ? { ns } : {}),
      interpolation: {
        escapeValue,
      },
    })
    .catch(() => {
      // i18next resolves synchronously for in-memory resources; the apps have
      // always swallowed this rejection. Kept identical to avoid behaviour drift.
    });

  return i18n;
}
