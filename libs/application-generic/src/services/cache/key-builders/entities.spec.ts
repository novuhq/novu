import { buildUnscopedKey } from './builder.base';
import { buildSubscriberKey, buildUserKey } from './entities';
import { CacheKeyPrefixEnum, CacheKeyTypeEnum, IdentifierPrefixEnum, OrgScopePrefixEnum } from './identifiers';

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

  describe('buildKeyById', () => {
    it('should build a key with the given parameters', () => {
      const type = CacheKeyTypeEnum.ENTITY;
      const keyEntity = CacheKeyPrefixEnum.SUBSCRIBER;
      const identifierPrefix = IdentifierPrefixEnum.SUBSCRIBER_ID;
      const identifier = '123';
      const expectedKey = `{${type}:${keyEntity}:${identifierPrefix}=${identifier}}`;
      const actualKey = buildUnscopedKey({
        type,
        keyEntity,
        identifierPrefix,
        identifier,
      });
      expect(actualKey).toEqual(expectedKey);
    });
  });
});
