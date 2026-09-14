import { expect } from 'chai';
import { stub } from 'sinon';

import {
  DIGEST_MASTER_GUARD_INDEX_NAME,
  isLegacyDigestMasterIndex,
  migrateJobDigestMasterIndex,
  NEW_DIGEST_MASTER_GUARD_INDEX_KEY,
} from './job-digest-master-index.migration';

describe('job-digest-master-index migration', () => {
  it('detects only the legacy subscriberId-keyed guard index', () => {
    expect(
      isLegacyDigestMasterIndex({
        name: DIGEST_MASTER_GUARD_INDEX_NAME,
        key: {
          subscriberId: 1,
          _environmentId: 1,
          'digest.digestValue': 1,
          'digest.digestKey': 1,
          _templateId: 1,
          status: 1,
          type: 1,
        },
      })
    ).to.equal(true);

    // Already-migrated definition must not be treated as legacy.
    expect(
      isLegacyDigestMasterIndex({
        name: DIGEST_MASTER_GUARD_INDEX_NAME,
        key: { ...NEW_DIGEST_MASTER_GUARD_INDEX_KEY },
      })
    ).to.equal(false);

    // Unrelated indexes must never match.
    expect(isLegacyDigestMasterIndex({ name: '_id_', key: { _id: 1 } })).to.equal(false);
    expect(
      isLegacyDigestMasterIndex({
        name: 'some_other_index',
        key: { subscriberId: 1, _environmentId: 1 },
      })
    ).to.equal(false);
  });

  it('drops the legacy index and recreates it with _subscriberId', async () => {
    const dropIndex = stub().resolves(undefined);
    const createIndex = stub().resolves(DIGEST_MASTER_GUARD_INDEX_NAME);
    const collection = {
      indexes: async () => [
        {
          name: DIGEST_MASTER_GUARD_INDEX_NAME,
          key: { subscriberId: 1, _environmentId: 1 },
        },
      ],
      dropIndex,
      createIndex,
    };

    const result = await migrateJobDigestMasterIndex(collection as any);

    expect(result).to.deep.equal({
      droppedLegacyIndex: true,
      createdIndexName: DIGEST_MASTER_GUARD_INDEX_NAME,
    });
    expect(dropIndex.calledOnceWith(DIGEST_MASTER_GUARD_INDEX_NAME)).to.equal(true);
    expect(createIndex.calledOnce).to.equal(true);
    const [key] = createIndex.firstCall.args;
    expect(key).to.have.property('_subscriberId', 1);
    expect(key).to.not.have.property('subscriberId');
  });

  it('skips the drop but still ensures the corrected index when already migrated', async () => {
    const dropIndex = stub().resolves(undefined);
    const createIndex = stub().resolves(DIGEST_MASTER_GUARD_INDEX_NAME);
    const collection = {
      indexes: async () => [
        {
          name: DIGEST_MASTER_GUARD_INDEX_NAME,
          key: { ...NEW_DIGEST_MASTER_GUARD_INDEX_KEY },
        },
      ],
      dropIndex,
      createIndex,
    };

    const result = await migrateJobDigestMasterIndex(collection as any);

    expect(result.droppedLegacyIndex).to.equal(false);
    expect(dropIndex.called).to.equal(false);
    expect(createIndex.calledOnce).to.equal(true);
  });

  it('tolerates a concurrently-dropped index (code 27)', async () => {
    const alreadyDropped = Object.assign(new Error('index not found'), { code: 27 });
    const dropIndex = stub().rejects(alreadyDropped);
    const createIndex = stub().resolves(DIGEST_MASTER_GUARD_INDEX_NAME);
    const collection = {
      indexes: async () => [
        {
          name: DIGEST_MASTER_GUARD_INDEX_NAME,
          key: { subscriberId: 1 },
        },
      ],
      dropIndex,
      createIndex,
    };

    const result = await migrateJobDigestMasterIndex(collection as any);

    expect(result.createdIndexName).to.equal(DIGEST_MASTER_GUARD_INDEX_NAME);
    expect(createIndex.calledOnce).to.equal(true);
  });
});
