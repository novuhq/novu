window._env_ = Object.assign(
  {
    SKIP_PREFLIGHT_CHECK: 'true',
    REACT_APP_ENVIRONMENT: 'dev',
    REACT_APP_VERSION: '$npm_package_version',
    IS_V2_ENABLED: 'true',
    IS_V2_EXPERIENCE_ENABLED: 'true',
    FRONT_BASE_CONTEXT_PATH: 'http://localhost:8080',
  },
  // Allow overrides of the above defaults
  window._env_
);
