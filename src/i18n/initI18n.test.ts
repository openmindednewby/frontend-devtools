import type { InitOptions } from 'i18next';

// Capture the fluent chain. The factory calls i18n.use(initReactI18next).init(opts).catch().
const useMock = jest.fn();
const initMock = jest.fn();
const catchMock = jest.fn();

jest.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

jest.mock('i18next', () => {
  const singleton = {
    use: (...args: unknown[]): unknown => {
      useMock(...args);
      return singleton;
    },
    init: (opts: InitOptions): { catch: (fn: () => void) => void } => {
      initMock(opts);
      return { catch: catchMock };
    },
  };
  return { __esModule: true, default: singleton };
});

import { initI18n } from './initI18n';
import { initReactI18next } from 'react-i18next';

describe('initI18n', () => {
  beforeEach(() => {
    useMock.mockClear();
    initMock.mockClear();
    catchMock.mockClear();
  });

  it('wires react-i18next into the singleton', () => {
    initI18n({ resources: { en: { translation: {} } } });
    expect(useMock).toHaveBeenCalledWith(initReactI18next);
  });

  it('passes resources straight through', () => {
    const resources = { en: { translation: { hello: 'Hi' } } };
    initI18n({ resources });
    expect(initMock.mock.calls[0][0].resources).toBe(resources);
  });

  it('defaults lng to the fallback language when lng omitted', () => {
    initI18n({ resources: {}, fallbackLng: 'el' });
    const opts = initMock.mock.calls[0][0];
    expect(opts.lng).toBe('el');
    expect(opts.fallbackLng).toBe('el');
  });

  it('defaults fallbackLng to "en"', () => {
    initI18n({ resources: {} });
    expect(initMock.mock.calls[0][0].fallbackLng).toBe('en');
  });

  it('uses the supplied lng over the fallback', () => {
    initI18n({ resources: {}, lng: 'fr', fallbackLng: 'en' });
    expect(initMock.mock.calls[0][0].lng).toBe('fr');
  });

  it('defaults escapeValue to false (React already escapes)', () => {
    initI18n({ resources: {} });
    expect(initMock.mock.calls[0][0].interpolation).toEqual({ escapeValue: false });
  });

  it('honours an explicit escapeValue', () => {
    initI18n({ resources: {}, escapeValue: true });
    expect(initMock.mock.calls[0][0].interpolation).toEqual({ escapeValue: true });
  });

  it('omits defaultNS / ns when not provided', () => {
    initI18n({ resources: {} });
    const opts = initMock.mock.calls[0][0];
    expect('defaultNS' in opts).toBe(false);
    expect('ns' in opts).toBe(false);
  });

  it('forwards defaultNS and ns when provided', () => {
    initI18n({ resources: {}, defaultNS: 'common', ns: ['common', 'forms'] });
    const opts = initMock.mock.calls[0][0];
    expect(opts.defaultNS).toBe('common');
    expect(opts.ns).toEqual(['common', 'forms']);
  });

  it('swallows the init rejection via .catch()', () => {
    initI18n({ resources: {} });
    expect(catchMock).toHaveBeenCalledTimes(1);
    // The handler is a no-op; calling it must not throw.
    const handler = catchMock.mock.calls[0][0] as () => void;
    expect(() => handler()).not.toThrow();
  });

  it('returns the i18next singleton', () => {
    const result = initI18n({ resources: {} });
    expect(result).toBeDefined();
    expect(typeof result.init).toBe('function');
  });
});
