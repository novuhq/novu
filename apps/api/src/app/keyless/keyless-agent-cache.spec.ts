import type { CacheService } from '@novu/application-generic';
import { expect } from 'chai';
import sinon from 'sinon';

import {
  KEYLESS_AGENT_CLAIMED_TOMBSTONE_TTL_SECONDS,
  readKeylessAgentClaimedTombstone,
  readKeylessAgentSource,
  writeKeylessAgentClaimedTombstone,
  writeKeylessAgentSource,
} from './keyless-agent-cache';

describe('keyless-agent-cache', () => {
  function makeCache(options: { enabled?: boolean; failing?: boolean } = {}) {
    const store = new Map<string, string>();
    const failure = new Error('redis down');
    const cache = {
      cacheEnabled: () => options.enabled ?? true,
      set: sinon.stub().callsFake(async (key: string, value: string) => {
        if (options.failing) throw failure;
        store.set(key, value);

        return 'OK';
      }),
      get: sinon.stub().callsFake(async (key: string) => {
        if (options.failing) throw failure;

        return store.get(key) ?? null;
      }),
    };

    return { cacheService: cache as unknown as CacheService, cache, store };
  }

  const tombstone = { environmentId: 'env-1', organizationId: 'org-keyless', claimedAt: '2026-10-14T00:00:00.000Z' };

  it('writes and reads back a claimed-key tombstone for 30 days', async () => {
    const { cacheService, cache } = makeCache();

    await writeKeylessAgentClaimedTombstone(cacheService, 'hash-1', tombstone);

    expect(cache.set.firstCall.args[0]).to.equal('keyless_agent_claimed_key:{hash-1}');
    expect(cache.set.firstCall.args[2]).to.deep.equal({ ttl: KEYLESS_AGENT_CLAIMED_TOMBSTONE_TTL_SECONDS });
    expect(KEYLESS_AGENT_CLAIMED_TOMBSTONE_TTL_SECONDS).to.equal(30 * 24 * 60 * 60);
    expect(await readKeylessAgentClaimedTombstone(cacheService, 'hash-1')).to.deep.equal(tombstone);
    expect(await readKeylessAgentClaimedTombstone(cacheService, 'hash-2')).to.equal(null);
  });

  it('returns null for a corrupt tombstone', async () => {
    const { cacheService, store } = makeCache();
    store.set('keyless_agent_claimed_key:{hash-1}', 'not-json');

    expect(await readKeylessAgentClaimedTombstone(cacheService, 'hash-1')).to.equal(null);
  });

  it('writes and reads back the creation source with the given TTL', async () => {
    const { cacheService, cache } = makeCache();

    await writeKeylessAgentSource(cacheService, 'env-1', 'cursor', 3600);

    expect(cache.set.firstCall.args).to.deep.equal(['keyless_agent_source:{env-1}', 'cursor', { ttl: 3600 }]);
    expect(await readKeylessAgentSource(cacheService, 'env-1')).to.equal('cursor');
    expect(await readKeylessAgentSource(cacheService, 'env-2')).to.equal(null);
  });

  it('skips writes and reads null when the cache is disabled', async () => {
    const { cacheService, cache } = makeCache({ enabled: false });

    await writeKeylessAgentClaimedTombstone(cacheService, 'hash-1', tombstone);
    await writeKeylessAgentSource(cacheService, 'env-1', 'cursor', 3600);

    expect(cache.set.called).to.equal(false);
    expect(await readKeylessAgentClaimedTombstone(cacheService, 'hash-1')).to.equal(null);
    expect(await readKeylessAgentSource(cacheService, 'env-1')).to.equal(null);
    expect(cache.get.called).to.equal(false);
  });

  it('swallows cache errors', async () => {
    const { cacheService } = makeCache({ failing: true });

    await writeKeylessAgentClaimedTombstone(cacheService, 'hash-1', tombstone);
    await writeKeylessAgentSource(cacheService, 'env-1', 'cursor', 3600);

    expect(await readKeylessAgentClaimedTombstone(cacheService, 'hash-1')).to.equal(null);
    expect(await readKeylessAgentSource(cacheService, 'env-1')).to.equal(null);
  });
});
