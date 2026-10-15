import type { CacheService } from '@novu/application-generic';
import type { EnvironmentEntity } from '@novu/dal';
import { type KeylessCreationSource, SignupSourceEnum } from '@novu/shared';

import { CONNECT_CLAIM_TOKEN_TTL_SECONDS } from '../connect/services/connect-claim-token.service';
import { readKeylessAgentSource, readKeylessCreationSource } from './keyless-agent-cache';
import { isKeylessAgentEnvironment } from './keyless-agent-environment';

/** Kept as long as a claim link can live, so every claim and the signup it leads to can read it. */
export const KEYLESS_CREATION_SOURCE_TTL_SECONDS = CONNECT_CLAIM_TOKEN_TTL_SECONDS;

export interface KeylessAttribution {
  source: KeylessCreationSource;
  client?: string;
}

/** The stored creator, or the one the environment's shape implies when the cache lost it. */
export async function resolveKeylessAttribution(
  cacheService: CacheService,
  environment: Pick<EnvironmentEntity, '_id' | '_organizationId' | 'identifier' | 'name'>
): Promise<KeylessAttribution> {
  const isAgentEnvironment = isKeylessAgentEnvironment(environment);
  const [storedSource, agentClient] = await Promise.all([
    readKeylessCreationSource(cacheService, environment._id),
    isAgentEnvironment ? readKeylessAgentSource(cacheService, environment._id) : null,
  ]);
  const source = storedSource ?? (isAgentEnvironment ? SignupSourceEnum.AGENT : SignupSourceEnum.INBOX);

  return agentClient ? { source, client: agentClient } : { source };
}
