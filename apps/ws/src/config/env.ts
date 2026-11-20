import { createAppEnv } from '@novu/application-generic';

/**
 * Variables only ws reads, added to the shared ones in
 * libs/application-generic/src/config/env.schema.ts. Read both with `env.X` from this file.
 */
export const { env, warnDeprecatedEnv } = createAppEnv({
  SOCKET_IO_ADMIN_PASSWORD_HASH: {
    description: 'Bcrypt hash of the Socket.IO Admin UI password. The UI is on only when the username is set too.',
  },
  SOCKET_IO_ADMIN_USERNAME: {
    description: 'Socket.IO Admin UI username. The UI is on only when the password hash is set too.',
  },
});
