window._env_ = Object.assign(
  {
    SKIP_PREFLIGHT_CHECK: 'true',
    REACT_APP_ENVIRONMENT: 'dev',
    REACT_APP_VERSION: '$npm_package_version',
    IS_V2_ENABLED: 'true',
  },
  // Allow overrides of the above defaults
  window._env_
);
