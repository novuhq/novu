import type { CacheService } from '@novu/application-generic';

export const KEYLESS_AGENT_CLAIMED_TOMBSTONE_TTL_SECONDS = 30 * 24 * 60 * 60;

export interface KeylessAgentClaimedTombstone {
  environmentId: string;
  organizationId: string;
  claimedAt: string;
}

function claimedTombstoneKey(keyHash: string): string {
  return `keyless_agent_claimed_key:{${keyHash}}`;
}

function sourceKey(environmentId: string): string {
  return `keyless_agent_source:{${environmentId}}`;
}

async function bestEffortSet(cacheService: CacheService, key: string, value: string, ttl: number): Promise<void> {
  if (!cacheService.cacheEnabled()) {
    return;
  }

  try {
    await cacheService.set(key, value, { ttl });
  } catch {
    return;
  }
}

async function bestEffortGet(cacheService: CacheService, key: string): Promise<string | null> {
  if (!cacheService.cacheEnabled()) {
    return null;
  }

  try {
    return (await cacheService.get(key)) ?? null;
  } catch {
    return null;
  }
}

export async function writeKeylessAgentClaimedTombstone(
  cacheService: CacheService,
  keyHash: string,
  value: KeylessAgentClaimedTombstone
): Promise<void> {
  await bestEffortSet(
    cacheService,
    claimedTombstoneKey(keyHash),
    JSON.stringify(value),
    KEYLESS_AGENT_CLAIMED_TOMBSTONE_TTL_SECONDS
  );
}

export async function readKeylessAgentClaimedTombstone(
  cacheService: CacheService,
  keyHash: string
): Promise<KeylessAgentClaimedTombstone | null> {
  const raw = await bestEffortGet(cacheService, claimedTombstoneKey(keyHash));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<KeylessAgentClaimedTombstone>;
    if (!parsed?.environmentId || !parsed.organizationId || !parsed.claimedAt) {
      return null;
    }

    return { environmentId: parsed.environmentId, organizationId: parsed.organizationId, claimedAt: parsed.claimedAt };
  } catch {
    return null;
  }
}

export async function writeKeylessAgentSource(
  cacheService: CacheService,
  environmentId: string,
  source: string,
  ttlSeconds: number
): Promise<void> {
  await bestEffortSet(cacheService, sourceKey(environmentId), source, ttlSeconds);
}

export async function readKeylessAgentSource(
  cacheService: CacheService,
  environmentId: string
): Promise<string | null> {
  return bestEffortGet(cacheService, sourceKey(environmentId));
}
