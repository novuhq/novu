import { expect } from 'chai';
import {
  buildFeedKey,
  buildMessageCountKey,
  buildNotificationTemplateKey,
  IBuildNotificationTemplateByIdentifier,
} from './queries';
import { GetNotificationsFeedCommand } from '../../../../widgets/usecases/get-notifications-feed/get-notifications-feed.command';
import { CacheKeyPrefixEnum, CacheKeyTypeEnum } from './shared';

describe('Key builder for queries', () => {
  describe('buildFeedKey', () => {
    it('should return the correct cache key for GetNotificationsFeedCommand', () => {
      const command = {
        environmentId: 'env123',
        subscriberId: 'sub456',
        someOtherParam: 'value',
      };
      const expectedKey = `${CacheKeyTypeEnum.QUERY}:${CacheKeyPrefixEnum.FEED}:e=${command.environmentId}:s=${
        command.subscriberId
      }:#query#=${JSON.stringify(command)}`;
      expect(buildFeedKey().cache(command as unknown as GetNotificationsFeedCommand)).equal(expectedKey);
    });

    it('should return the correct invalidation key', () => {
      const subscriberId = 'sub789';
      const environmentId = 'env456';
      const expectedKey = `${CacheKeyTypeEnum.QUERY}:${CacheKeyPrefixEnum.FEED}:e=${environmentId}:s=${subscriberId}`;
      expect(buildFeedKey().invalidate({ subscriberId, _environmentId: environmentId })).equal(expectedKey);
    });
  });

  describe('buildMessageCountKey', () => {
    it('should return the correct cache key for GetNotificationsFeedCommand', () => {
      const command = {
        environmentId: 'env123',
        subscriberId: 'sub456',
        someOtherParam: 'value',
      };

      const expectedKey = `${CacheKeyTypeEnum.QUERY}:${CacheKeyPrefixEnum.MESSAGE_COUNT}:e=${command.environmentId}:s=${
        command.subscriberId
      }:#query#=${JSON.stringify(command)}`;
      expect(buildMessageCountKey().cache(command as unknown as GetNotificationsFeedCommand)).equal(expectedKey);
    });

    it('should return the correct invalidation key for GetFeedCountCommand', () => {
      const subscriberId = 'sub789';
      const environmentId = 'env456';
      const expectedKey = `${CacheKeyTypeEnum.QUERY}:${CacheKeyPrefixEnum.MESSAGE_COUNT}:e=${environmentId}:s=${subscriberId}`;
      expect(buildMessageCountKey().invalidate({ subscriberId, _environmentId: environmentId })).equal(expectedKey);
    });
  });

  describe('buildNotificationTemplateKey', () => {
    it('should return the correct cache key', () => {
      const command: IBuildNotificationTemplateByIdentifier = {
        _environmentId: 'env789',
        identifiers: { triggerIdentifier: 'trigger456' },
      };
      const expectedKey = `${CacheKeyTypeEnum.QUERY}:${CacheKeyPrefixEnum.NOTIFICATION_TEMPLATE}:e=${
        command._environmentId
      }:#query#=${JSON.stringify(command)}`;

      expect(buildNotificationTemplateKey().cache(command)).equal(expectedKey);
    });

    it('should return the correct invalidate key', () => {
      const command: IBuildNotificationTemplateByIdentifier = {
        _environmentId: 'env789',
        identifiers: { triggerIdentifier: 'trigger456' },
      };
      const expectedKey = `${CacheKeyTypeEnum.QUERY}:${CacheKeyPrefixEnum.NOTIFICATION_TEMPLATE}:e=${command._environmentId}`;

      expect(buildNotificationTemplateKey().invalidate(command)).equal(expectedKey);
    });
  });
});
