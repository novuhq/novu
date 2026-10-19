import { expect } from 'chai';
import { stub } from 'sinon';

import {
  buildHumanInteractionCollapseUpdate,
  collapseHumanInteractionMirroredFields,
  selectLegacyHumanInteractionIndexNames,
} from './human-interaction-collapse-deliveries.migration';

describe('human-interaction-collapse-deliveries migration', () => {
  it('builds a single delivery from top-level fields and fills subscriberIds', () => {
    const update = buildHumanInteractionCollapseUpdate({
      _id: 'hi1',
      subscriberId: 'alice',
      integrationIdentifier: 'telegram-main',
      platform: 'telegram',
      platformMessageId: 'msg-1',
      platformThreadId: 'thread-1',
    });

    expect(update).to.deep.equal({
      $set: {
        subscriberIds: ['alice'],
        deliveries: [
          {
            subscriberId: 'alice',
            integrationIdentifier: 'telegram-main',
            platform: 'telegram',
            platformMessageId: 'msg-1',
            platformThreadId: 'thread-1',
          },
        ],
      },
      $unset: {
        subscriberId: 1,
        integrationIdentifier: 1,
        platform: 1,
        platformMessageId: 1,
        platformThreadId: 1,
      },
    });
  });

  it('keeps existing deliveries and still unsets mirrored fields', () => {
    const update = buildHumanInteractionCollapseUpdate({
      _id: 'hi2',
      subscriberId: 'alice',
      subscriberIds: ['alice', 'bob'],
      integrationIdentifier: 'telegram-main',
      platform: 'telegram',
      platformMessageId: 'msg-1',
      platformThreadId: 'thread-1',
      deliveries: [
        {
          subscriberId: 'alice',
          integrationIdentifier: 'telegram-main',
          platform: 'telegram',
          platformMessageId: 'msg-1',
          platformThreadId: 'thread-1',
        },
        {
          subscriberId: 'bob',
          integrationIdentifier: 'telegram-main',
          platform: 'telegram',
          platformMessageId: 'msg-2',
          platformThreadId: 'thread-2',
        },
      ],
    });

    expect(update?.$set).to.equal(undefined);
    expect(update?.$unset).to.deep.equal({
      subscriberId: 1,
      integrationIdentifier: 1,
      platform: 1,
      platformMessageId: 1,
      platformThreadId: 1,
    });
  });

  it('is a no-op for already collapsed rows', () => {
    expect(
      buildHumanInteractionCollapseUpdate({
        _id: 'hi3',
        subscriberIds: ['alice'],
        deliveries: [
          {
            subscriberId: 'alice',
            integrationIdentifier: 'telegram-main',
            platform: 'telegram',
            platformMessageId: 'msg-1',
            platformThreadId: 'thread-1',
          },
        ],
      })
    ).to.equal(null);
  });

  it('skips deliveries backfill when platform message ids are missing', () => {
    const update = buildHumanInteractionCollapseUpdate({
      _id: 'hi4',
      subscriberId: 'alice',
      integrationIdentifier: 'telegram-main',
      platform: 'telegram',
    });

    expect(update).to.deep.equal({
      $set: { subscriberIds: ['alice'] },
      $unset: {
        subscriberId: 1,
        integrationIdentifier: 1,
        platform: 1,
      },
    });
  });

  it('selects only the mirrored-field indexes', () => {
    expect(
      selectLegacyHumanInteractionIndexNames([
        { name: '_id_', key: { _id: 1 } },
        { name: 'identifier', key: { _environmentId: 1, identifier: 1 } },
        {
          name: 'subscriberId_pending',
          key: { _environmentId: 1, subscriberId: 1, status: 1, createdAt: -1 },
        },
        {
          name: 'subscriberIds_pending',
          key: { _environmentId: 1, subscriberIds: 1, status: 1, createdAt: -1 },
        },
        { name: 'platformMessageId', key: { _environmentId: 1, platformMessageId: 1 } },
        {
          name: 'deliveries_platformMessageId',
          key: { _environmentId: 1, 'deliveries.platformMessageId': 1 },
        },
      ])
    ).to.deep.equal(['subscriberId_pending', 'platformMessageId']);
  });

  it('bulk-writes backfills and drops mirrored indexes', async () => {
    const bulkWrite = stub().resolves({ modifiedCount: 1 });
    const dropIndex = stub().resolves(undefined);
    const collection = {
      find: () => ({
        batchSize: () => [
          {
            _id: 'hi1',
            subscriberId: 'alice',
            integrationIdentifier: 'telegram-main',
            platform: 'telegram',
            platformMessageId: 'msg-1',
            platformThreadId: 'thread-1',
          },
        ],
      }),
      bulkWrite,
      indexes: async () => [
        { name: 'subscriberId_pending', key: { _environmentId: 1, subscriberId: 1, status: 1, createdAt: -1 } },
        { name: 'deliveries_platformMessageId', key: { _environmentId: 1, 'deliveries.platformMessageId': 1 } },
      ],
      dropIndex,
    };

    const result = await collapseHumanInteractionMirroredFields(collection as any);

    expect(result).to.deep.equal({
      scanned: 1,
      modified: 1,
      droppedIndexes: ['subscriberId_pending'],
    });
    expect(bulkWrite.calledOnce).to.equal(true);
    expect(bulkWrite.firstCall.args[0]).to.have.length(1);
    expect(dropIndex.calledOnceWith('subscriberId_pending')).to.equal(true);
  });
});
