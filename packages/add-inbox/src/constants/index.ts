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

export const ANALYTICS_ENABLED = true;
export const SEGMENTS_WRITE_KEY = 'YOUR_SEGMENT_WRITE_KEY'; // Replace with actual key if needed

module.exports = {
  FRAMEWORKS,
  PACKAGE_MANAGERS,
  ENV_VARIABLES,
  ANALYTICS_ENABLED,
  SEGMENTS_WRITE_KEY,
};
