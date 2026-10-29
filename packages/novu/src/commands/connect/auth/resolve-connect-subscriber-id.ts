import type { ResolvedConnectAuth } from './resolve-connect-auth';

export function resolveConnectSubscriberId(auth: ResolvedConnectAuth): string {
  if (auth.user?.id) {
    return auth.user.id;
  }

  if (auth.isKeyless && auth.keylessApplicationIdentifier) {
    return `connect-keyless:${auth.keylessApplicationIdentifier}`;
  }

  return `cli:${auth.organizationId ?? 'anonymous'}:${Date.now()}`;
}
