window._env_ = Object.assign(
  {
    SKIP_PREFLIGHT_CHECK: 'true',
    IS_V2_ENABLED: 'true',
    IS_V2_EXPERIENCE_ENABLED: 'true',
    VITE_ENVIRONMENT: 'dev',
    VITE_VERSION: '$npm_package_version',
    IS_IMPROVED_ONBOARDING_ENABLED: 'false',
  },
  // Allow overrides of the above defaults
  window._env_
);
