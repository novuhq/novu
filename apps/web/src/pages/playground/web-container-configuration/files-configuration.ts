import { PACKAGE_JSON, PNPM_LOCK_YAML, TS_CONFIG, TUNNEL, VITE_CONFIG } from './sandbox-vite';

export const configureFiles = (workflowsCode: string, reactEmailCode: string) => {
  return {
    src: {
      directory: {
        'workflows.ts': {
          file: {
            contents: workflowsCode,
          },
        },
        'react-email.tsx': {
          file: {
            contents: reactEmailCode,
          },
        },
      },
    },
    'tunnel.ts': {
      file: {
        contents: TUNNEL,
      },
    },
    'vite.config.ts': {
      file: {
        contents: VITE_CONFIG,
      },
    },
    'package.json': {
      file: {
        contents: PACKAGE_JSON,
      },
    },
    'tsconfig.json': {
      file: {
        contents: TS_CONFIG,
      },
    },
    'pnpm-lock.yaml': {
      file: {
        contents: PNPM_LOCK_YAML,
      },
    },
  };
};
