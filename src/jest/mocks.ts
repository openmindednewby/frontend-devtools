type Factory = () => unknown;
type Props = Record<string, unknown>;

interface ReactLike {
  createElement: (type: unknown, props: Props | null, ...children: unknown[]) => unknown;
}

interface ReactNativeLike {
  View: unknown;
  Text: unknown;
}

export interface JestLike {
  mock: (moduleName: string, factory: Factory) => unknown;
  fn: (implementation?: (...args: never[]) => unknown) => unknown;
  requireActual: (moduleName: string) => unknown;
}

export interface ConsoleHost {
  console: Console;
}

function modalFactory(jestApi: JestLike): Factory {
  return () => {
    const React = jestApi.requireActual('react') as ReactLike;
    const { View } = jestApi.requireActual('react-native') as ReactNativeLike;
    const MockModal = ({ children, visible, testID }: Props): unknown =>
      visible === true ? React.createElement(View, { testID }, children) : null;
    return { default: MockModal, __esModule: true };
  };
}

function switchFactory(jestApi: JestLike): Factory {
  return () => createSwitchMock(jestApi.requireActual('react') as ReactLike, jestApi.requireActual('react-native') as ReactNativeLike);
}

function createSwitchMock(React: ReactLike, ReactNative: ReactNativeLike): unknown {
  const MockSwitch = (props: Props): unknown => {
    const { value, testID, disabled, accessibilityLabel, accessibilityHint, onValueChange } = props;
    const handlePress = (): void => {
      if (disabled !== true && typeof onValueChange === 'function') {
        onValueChange(value !== true);
      }
    };
    return React.createElement(
      ReactNative.View,
      {
        accessibilityRole: 'switch', accessibilityLabel, accessibilityHint, disabled, testID, value,
        accessible: true, onPress: handlePress, onTouchEnd: handlePress,
      },
      React.createElement(ReactNative.Text, null, value === true ? 'ON' : 'OFF'),
    );
  };
  return { default: MockSwitch, __esModule: true };
}

function storageMocks(jestApi: JestLike): void {
  jestApi.mock('expo-constants', () => ({ expoConfig: { extra: { env: 'test' } } }));
  jestApi.mock('expo-secure-store', () => ({
    getItemAsync: jestApi.fn(async () => Promise.resolve(null)),
    setItemAsync: jestApi.fn(async () => Promise.resolve()),
    deleteItemAsync: jestApi.fn(async () => Promise.resolve()),
  }));
}

function i18nMocks(jestApi: JestLike): void {
  jestApi.mock('react-i18next', () => ({
    initReactI18next: { type: '3rdParty', init: jestApi.fn() },
    useTranslation: (): { t: (key: string) => string; i18n: unknown } => ({ t: (key: string): string => key, i18n: { changeLanguage: jestApi.fn() } }),
    I18nextProvider: ({ children }: { children: unknown }): unknown => children,
  }));
  jestApi.mock('expo-localization', () => ({ getLocales: jestApi.fn(() => [{ languageCode: 'en' }]) }));
}

/** Registers the house Expo test mocks and silences console noise; apps add their own after it. */
export function installSharedJestMocks(jestApi: JestLike, host: ConsoleHost): void {
  storageMocks(jestApi);
  jestApi.mock('react-native/Libraries/Modal/Modal', modalFactory(jestApi));
  jestApi.mock('react-native/Libraries/Components/Switch/Switch', switchFactory(jestApi));
  i18nMocks(jestApi);
  host.console = {
    ...host.console,
    debug: jestApi.fn() as Console['debug'],
    info: jestApi.fn() as Console['info'],
    warn: jestApi.fn() as Console['warn'],
    error: jestApi.fn() as Console['error'],
  };
}
