window._env_ = Object.assign(
  {
    SKIP_PREFLIGHT_CHECK: 'true',
    REACT_APP_ENVIRONMENT: 'dev',
    REACT_APP_VERSION: '$npm_package_version',
    IS_IMPROVED_ONBOARDING_ENABLED: 'false',
  },
  // Allow overrides of the above defaults
  window._env_
);
