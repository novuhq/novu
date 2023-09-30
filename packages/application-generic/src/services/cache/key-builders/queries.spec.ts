import { buildFeedKey, buildMessageCountKey } from './queries';
import { CacheKeyPrefixEnum, CacheKeyTypeEnum, QUERY_PREFIX } from './shared';

describe('Key builder for queries', () => {
  describe('buildFeedKey', () => {
    it('should return the correct cache key for GetNotificationsFeedCommand', () => {
      const command = {
        environmentId: 'env123',
        subscriberId: 'sub456',
        someOtherParam: 'value',
      };
      const expectedKey = `{${CacheKeyTypeEnum.QUERY}:${
        CacheKeyPrefixEnum.FEED
      }:e=${command.environmentId}:s=${
        command.subscriberId
      }}:${QUERY_PREFIX}=${JSON.stringify(command)}`;
      expect(buildFeedKey().cache(command)).toEqual(expectedKey);
    });

    it('should return the correct invalidation key', () => {
      const subscriberId = 'sub789';
      const environmentId = 'env456';
      const expectedKey = `{${CacheKeyTypeEnum.QUERY}:${CacheKeyPrefixEnum.FEED}:e=${environmentId}:s=${subscriberId}}`;
      expect(
        buildFeedKey().invalidate({
          subscriberId,
          _environmentId: environmentId,
        })
      ).toEqual(expectedKey);
    });
  });

  describe('buildMessageCountKey', () => {
    it('should return the correct cache key for GetNotificationsFeedCommand', () => {
      const command = {
        environmentId: 'env123',
        subscriberId: 'sub456',
        someOtherParam: 'value',
      };

      const expectedKey = `{${CacheKeyTypeEnum.QUERY}:${
        CacheKeyPrefixEnum.MESSAGE_COUNT
      }:e=${command.environmentId}:s=${
        command.subscriberId
      }}:${QUERY_PREFIX}=${JSON.stringify(command)}`;
      expect(buildMessageCountKey().cache(command)).toEqual(expectedKey);
    });

    it('should return the correct invalidation key for GetFeedCountCommand', () => {
      const subscriberId = 'sub789';
      const environmentId = 'env456';
      const expectedKey = `{${CacheKeyTypeEnum.QUERY}:${CacheKeyPrefixEnum.MESSAGE_COUNT}:e=${environmentId}:s=${subscriberId}}`;
      expect(
        buildMessageCountKey().invalidate({
          subscriberId,
          _environmentId: environmentId,
        })
      ).toEqual(expectedKey);
    });
  });
});
