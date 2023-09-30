import {
  buildEnvironmentByApiKey,
  buildKeyById,
  buildNotificationTemplateIdentifierKey,
  buildNotificationTemplateKey,
  buildSubscriberKey,
  buildUserKey,
} from './entities';
import {
  CacheKeyTypeEnum,
  CacheKeyPrefixEnum,
  IdentifierPrefixEnum,
  OrgScopePrefixEnum,
} from './shared';

describe('Key builder for entities', () => {
  describe('buildSubscriberKey', () => {
    it('should build a subscriber key with the given subscriberId and environmentId', () => {
      const subscriberId = '123';
      const environmentId = 'test-env';
      const expectedKey = `{${CacheKeyTypeEnum.ENTITY}:${CacheKeyPrefixEnum.SUBSCRIBER}:e=${environmentId}:s=${subscriberId}}`;
      const actualKey = buildSubscriberKey({
        subscriberId,
        _environmentId: environmentId,
      });
      expect(actualKey).toEqual(expectedKey);
    });
  });

  describe('buildUserKey', () => {
    it('should build a user key with the given _id', () => {
      const _id = '123';
      const expectedKey = `{${CacheKeyTypeEnum.ENTITY}:${CacheKeyPrefixEnum.USER}:${IdentifierPrefixEnum.ID}=${_id}}`;
      const actualKey = buildUserKey({ _id });
      expect(actualKey).toEqual(expectedKey);
    });
  });

  describe('buildEnvironmentByApiKey', () => {
    it('should build an environment by api key with the given _id', () => {
      const _id = '123';
      const expectedKey = `{${CacheKeyTypeEnum.ENTITY}:${CacheKeyPrefixEnum.ENVIRONMENT_BY_API_KEY}:${IdentifierPrefixEnum.API_KEY}=${_id}}`;
      const actualKey = buildEnvironmentByApiKey({ apiKey: _id });
      expect(actualKey).toEqual(expectedKey);
    });
  });

  describe('buildKeyById', () => {
    it('should build a key with the given parameters', () => {
      const type = CacheKeyTypeEnum.ENTITY;
      const keyEntity = CacheKeyPrefixEnum.SUBSCRIBER;
      const identifierPrefix = IdentifierPrefixEnum.SUBSCRIBER_ID;
      const identifier = '123';
      const expectedKey = `{${type}:${keyEntity}:${identifierPrefix}=${identifier}}`;
      const actualKey = buildKeyById({
        type,
        keyEntity,
        identifierPrefix,
        identifier,
      });
      expect(actualKey).toEqual(expectedKey);
    });
  });

  describe('buildNotificationTemplateKey', () => {
    it('should build the correct key with ID', () => {
      const type = CacheKeyTypeEnum.ENTITY;
      const keyEntity = CacheKeyPrefixEnum.NOTIFICATION_TEMPLATE;
      const identifierPrefix = IdentifierPrefixEnum.ID;
      const identifier = '123';
      const environmentId = '456';
      const expectedKey = `{${type}:${keyEntity}:${OrgScopePrefixEnum.ENVIRONMENT_ID}=${environmentId}:${identifierPrefix}=${identifier}}`;
      const result = buildNotificationTemplateKey({
        _id: identifier,
        _environmentId: environmentId,
      });
      expect(result).toEqual(expectedKey);
    });
  });

  describe('buildNotificationTemplateIdentifierKey', () => {
    it('should build the correct key with ID', () => {
      const type = CacheKeyTypeEnum.ENTITY;
      const keyEntity = CacheKeyPrefixEnum.NOTIFICATION_TEMPLATE;
      const identifierPrefix = IdentifierPrefixEnum.TEMPLATE_IDENTIFIER;
      const identifier = '123';
      const environmentId = '456';
      const expectedKey = `{${type}:${keyEntity}:${OrgScopePrefixEnum.ENVIRONMENT_ID}=${environmentId}:${identifierPrefix}=${identifier}}`;
      const result = buildNotificationTemplateIdentifierKey({
        templateIdentifier: identifier,
        _environmentId: environmentId,
      });
      expect(result).toEqual(expectedKey);
    });
  });
});
