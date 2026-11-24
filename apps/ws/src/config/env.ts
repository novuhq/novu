import { createAppEnv, type EnvVarDefinition } from '@novu/application-generic';

/**
 * Variables only ws uses, added to the shared ones in libs/application-generic/src/config/env.schema.ts.
 * Together the two files list every variable ws uses, and apps/ws/ENVIRONMENT.md is generated from them.
 * Read both with `env.X` from this file; entries with `readBy` are read by those dependencies instead and have
 * no `env.X`. Their `boot` rules for `ws` decide what `validateEnv` checks.
 */
export const appEnvSchema = {
  SOCKET_IO_ADMIN_PASSWORD_HASH: {
    description: 'Bcrypt hash of the Socket.IO Admin UI password. The UI is on only when the username is set too.',
  },
  SOCKET_IO_ADMIN_USERNAME: {
    description: 'Socket.IO Admin UI username. The UI is on only when the password hash is set too.',
  },
  WS_CONTEXT_PATH: {
    readBy: ['@novu/shared'],
    description: 'Route prefix of ws, after GLOBAL_CONTEXT_PATH. Read by getContextPath.',
  },
} satisfies Record<string, EnvVarDefinition>;

export const { env, validateEnv, warnDeprecatedEnv } = createAppEnv(appEnvSchema, { service: 'ws' });
