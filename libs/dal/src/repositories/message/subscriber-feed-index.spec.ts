import { expect } from 'chai';
import { booleanKeysBeforeCreatedAt, pinMissingBooleanKeys, subscriberFeedBooleanKeys } from './subscriber-feed-index';

describe('subscriber feed index bounds', () => {
  it('reads boolean keys between channel and createdAt from the schema index', () => {
    expect(subscriberFeedBooleanKeys()).to.deep.equal(['seen', 'read', 'archived']);
  });

  it('includes a boolean added ahead of createdAt and skips fields that are not booleans', () => {
    const keys = booleanKeysBeforeCreatedAt(
      [
        '_subscriberId',
        '_environmentId',
        'channel',
        'seen',
        'read',
        'archived',
        'starred',
        'deleted',
        'createdAt',
        '_id',
      ],
      (field) => field !== 'deleted'
    );

    expect(keys).to.deep.equal(['seen', 'read', 'archived', 'starred']);
  });

  it('sets a match-all bound only for fields the query left unset', () => {
    const filter: Record<string, unknown> = { read: false, seen: { $in: [true] } };

    pinMissingBooleanKeys(filter, ['seen', 'read', 'archived', 'starred']);

    expect(filter.seen).to.deep.equal({ $in: [true] });
    expect(filter.read).to.equal(false);
    expect(filter.archived).to.deep.equal({ $in: [true, false, null] });
    expect(filter.starred).to.deep.equal({ $in: [true, false, null] });
    expect(filter).to.not.have.property('deleted');
  });
});
