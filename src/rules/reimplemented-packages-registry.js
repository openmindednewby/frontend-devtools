export const REIMPLEMENTED_PACKAGE_REGISTRY = [
  {
    id: 'analytics',
    package: '@dloizides/analytics-web',
    use: 'createAnalytics, track, createWebVitals',
    paths: [/\/src\/lib\/analytics\//, /\/UmamiClient\.[cm]?[jt]sx?$/, /\/MultiProviderClient\.[cm]?[jt]sx?$/, /\/useWebVitalsTracking\.[cm]?[jt]sx?$/],
    literals: [],
  },
  {
    id: 'bff-csrf',
    package: '@dloizides/bff-web-client',
    use: 'createBffAxiosClient (default CSRF interceptor)',
    paths: [/\/bffCsrf\.[cm]?[jt]sx?$/],
    literals: [/^X-BFF-Csrf$/i],
  },
  {
    id: 'forgot-password',
    package: '@dloizides/auth-web',
    use: 'useBffForgotPassword, ForgotPasswordForm',
    paths: [/\/forgotPasswordRequest\.[cm]?[jt]sx?$/],
    literals: [],
  },
  {
    id: 'logger',
    package: '@dloizides/logging-web',
    use: 'logger, LoggingService',
    paths: [/\/src\/(?:lib\/)?utils\/logger\.[cm]?[jt]sx?$/],
    literals: [],
  },
];
