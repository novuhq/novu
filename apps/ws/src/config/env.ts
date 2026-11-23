import { createAppEnv } from '@novu/application-generic';

/**
 * Variables only ws uses, added to the shared ones in libs/application-generic/src/config/env.schema.ts.
 * Together the two files list every variable ws uses. Read both with `env.X` from this file; entries
 * with `readBy` are read by that dependency instead and have no `env.X`.
 */
export const { env, warnDeprecatedEnv } = createAppEnv({
  SOCKET_IO_ADMIN_PASSWORD_HASH: {
    description: 'Bcrypt hash of the Socket.IO Admin UI password. The UI is on only when the username is set too.',
  },
  SOCKET_IO_ADMIN_USERNAME: {
    description: 'Socket.IO Admin UI username. The UI is on only when the password hash is set too.',
  },
  WS_CONTEXT_PATH: {
    readBy: '@novu/shared',
    description: 'Route prefix of ws, after GLOBAL_CONTEXT_PATH. Read by getContextPath.',
  },
});
