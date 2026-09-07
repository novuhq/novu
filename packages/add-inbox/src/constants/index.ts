export const FRAMEWORKS = {
  NEXTJS: 'nextjs',
  REACT: 'react',
} as const;

export type FrameworkType = (typeof FRAMEWORKS)[keyof typeof FRAMEWORKS];

export const PACKAGE_MANAGERS = {
  NPM: 'npm',
  YARN: 'yarn',
  PNPM: 'pnpm',
} as const;

export type PackageManagerType = (typeof PACKAGE_MANAGERS)[keyof typeof PACKAGE_MANAGERS];

export const ENV_VARIABLES = {
  NEXTJS: {
    APP_ID: 'NEXT_PUBLIC_NOVU_APP_ID',
  },
  REACT: {
    APP_ID: 'VITE_NOVU_APP_ID',
  },
} as const;

// segment analytics
export const ANALYTICS_ENABLED = process.env.ANALYTICS_ENABLED !== 'false';
export const SEGMENTS_WRITE_KEY = process.env.CLI_SEGMENT_WRITE_KEY || 'DkJoarwiEx8NAJ5lAkhaqe1v999ZevN9';

export default {
  FRAMEWORKS,
  PACKAGE_MANAGERS,
  ENV_VARIABLES,
  ANALYTICS_ENABLED,
  SEGMENTS_WRITE_KEY,
};
