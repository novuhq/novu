import { expect } from 'chai';
import {
  buildEnvironmentByApiKey,
  buildIntegrationKey,
  buildKeyById,
  buildSubscriberKey,
  buildUserKey,
} from './entities';
import { CacheKeyTypeEnum, CacheKeyPrefixEnum } from './shared';

describe('Key builder for entities', () => {
  describe('buildSubscriberKey', () => {
    it('should build a subscriber key with the given subscriberId and environmentId', () => {
      const subscriberId = '123';
      const environmentId = 'test-env';
      const expectedKey = `${CacheKeyTypeEnum.ENTITY}:${CacheKeyPrefixEnum.SUBSCRIBER}:e=${environmentId}:s=${subscriberId}`;
      const actualKey = buildSubscriberKey({ subscriberId, _environmentId: environmentId });
      expect(actualKey).to.equal(expectedKey);
    });
  });

  describe('buildIntegrationKey', () => {
    it('should build an integration key with the given _id and _environmentId', () => {
      const _id = '123';
      const _environmentId = 'test-env';
      const expectedKey = `${CacheKeyTypeEnum.ENTITY}:${CacheKeyPrefixEnum.INTEGRATION}:e=${_environmentId}:i=${_id}`;
      const actualKey = buildIntegrationKey({ _id, _environmentId });
      expect(actualKey).to.equal(expectedKey);
    });
  });

  describe('buildUserKey', () => {
    it('should build a user key with the given _id', () => {
      const _id = '123';
      const expectedKey = `${CacheKeyTypeEnum.ENTITY}:${CacheKeyPrefixEnum.USER}:i=${_id}`;
      const actualKey = buildUserKey({ _id });
      expect(actualKey).to.equal(expectedKey);
    });
  });

  describe('buildEnvironmentByApiKey', () => {
    it('should build an environment by api key with the given _id', () => {
      const _id = '123';
      const expectedKey = `${CacheKeyTypeEnum.ENTITY}:${CacheKeyPrefixEnum.ENVIRONMENT_BY_API_KEY}:i=${_id}`;
      const actualKey = buildEnvironmentByApiKey({ _id });
      expect(actualKey).to.equal(expectedKey);
    });
  });

  describe('buildKeyById', () => {
    it('should build a key with the given parameters', () => {
      const type = CacheKeyTypeEnum.ENTITY;
      const keyEntity = CacheKeyPrefixEnum.SUBSCRIBER;
      const identifierPrefix = 's';
      const identifier = '123';
      const expectedKey = `${type}:${keyEntity}:${identifierPrefix}=${identifier}`;
      const actualKey = buildKeyById({ type, keyEntity, identifierPrefix, identifier });
      expect(actualKey).to.equal(expectedKey);
    });
  });
});
