import { CacheKeyPrefixEnum } from '../key-builders';
import {
  buildCachedQuery,
  buildCredentialsKeyPart,
  buildKey,
  buildQueryKeyPart,
  CacheInterceptorTypeEnum,
  getCredentialsKeys,
  getCredentialWithContext,
  getEnvironment,
  getIdentifier,
  getInvalidateQuery,
  getQueryParams,
  validateCredentials,
} from './shared-cache';

describe('shared cache', () => {
  describe('validateCredentials', () => {
    it('should validate the credentials for Message entity', () => {
      const keyPrefix = CacheKeyPrefixEnum.FEED;
      let credentials: string;
      let res: boolean;

      credentials = ':123:456';
      res = validateCredentials(keyPrefix, credentials);
      expect(res).toEqual(true);

      credentials = '';
      res = validateCredentials(keyPrefix, credentials);
      expect(res).toEqual(false);

      credentials = ':456';
      res = validateCredentials(keyPrefix, credentials);
      expect(res).toEqual(false);

      credentials = ':123:456:789';
      res = validateCredentials(keyPrefix, credentials);
      expect(res).toEqual(false);
    });
    it('should validate the credentials for not Message entity', () => {
      const keyPrefix = CacheKeyPrefixEnum.USER;
      let credentials: string;
      let res: boolean;

      credentials = ':123';
      res = validateCredentials(keyPrefix, credentials);
      expect(res).toEqual(true);

      credentials = ':123:456';
      res = validateCredentials(keyPrefix, credentials);
      expect(res).toEqual(false);

      credentials = ':123:456:789';
      res = validateCredentials(keyPrefix, credentials);
      expect(res).toEqual(false);
    });
  });

  describe('getIdentifier', () => {
    it('should retrieve identifier _subscriber from Message query', async () => {
      const keyPrefix = CacheKeyPrefixEnum.FEED;
      let query: Record<string, unknown>;
      let res: { key: string; value: string };

      query = { _id: '123', _subscriberId: '456' };
      res = getIdentifier(keyPrefix, query);
      expect(res.value).toEqual('456');

      query = { _id: '123', subscriberId: '456' };
      res = getIdentifier(keyPrefix, query);
      expect(res.value).toEqual('456');

      query = { id: '123', _subscriberId: '456' };
      res = getIdentifier(keyPrefix, query);
      expect(res.value).toEqual('456');

      query = { id: '123', subscriberId: '456' };
      res = getIdentifier(keyPrefix, query);
      expect(res.value).toEqual('456');

      query = { dummyKey: '123' };
      res = getIdentifier(keyPrefix, query);
      expect(res.value).toEqual(undefined);
    });

    it('should retrieve identifier _id from not Message query', async () => {
      const keyPrefix = 'Subscriber';
      let query: Record<string, unknown>;
      let res: { key: string; value: string };

      query = { _id: '123', _subscriberId: '456' };
      res = getIdentifier(keyPrefix, query);
      expect(res.value).toEqual('123');

      query = { _id: '123', subscriberId: '456' };
      res = getIdentifier(keyPrefix, query);
      expect(res.value).toEqual('123');

      query = { id: '123', _subscriberId: '456' };
      res = getIdentifier(keyPrefix, query);
      expect(res.value).toEqual('123');

      query = { id: '123', subscriberId: '456' };
      res = getIdentifier(keyPrefix, query);
      expect(res.value).toEqual('123');

      query = { dummyKey: '123' };
      res = getIdentifier(keyPrefix, query);
      expect(res.value).toEqual(undefined);
    });
  });

  describe('buildCredentialsKeyPart', () => {
    it('should build key part for Message entity', async () => {
      const keyPrefix = CacheKeyPrefixEnum.FEED;
      let query: Record<string, unknown>;
      let res: string;

      query = { id: '123', subscriberId: '456', _environmentId: '789' };
      res = buildCredentialsKeyPart(keyPrefix, query);
      expect(res).toEqual(':s=456:e=789');

      query = { id: '123', subscriberId: '456' };
      res = buildCredentialsKeyPart(keyPrefix, query);
      expect(res).toEqual(':s=456');
    });

    it('should build key part for not Message entity', async () => {
      const keyPrefix = 'Subscriber';

      const query = { id: '123', subscriberId: '456', _environmentId: '789' };
      const res = buildCredentialsKeyPart(keyPrefix, query);
      expect(res).toEqual(':i=123:e=789');
    });
  });

  describe('getEnvironment', () => {
    it('should return environment from query', async () => {
      let res: { key: string; value: string };
      let query: Record<string, unknown>;

      query = { id: '123', subscriberId: '456', _environmentId: '789' };
      res = getEnvironment(query);
      expect(res.key).toEqual('_environmentId');
      expect(res.value).toEqual('789');

      query = { id: '123', subscriberId: '456', environmentId: '789' };
      res = getEnvironment(query);
      expect(res.key).toEqual('environmentId');
      expect(res.value).toEqual('789');

      query = {
        id: '123',
        subscriberId: '456',
        environmentId: '789',
        _environmentId: '777',
      };
      res = getEnvironment(query);
      expect(res.key).toEqual('_environmentId');
      expect(res.value).toEqual('777');

      query = { id: '123', subscriberId: '456' };
      res = getEnvironment(query);
      expect(res?.key).toEqual(undefined);
      expect(res?.value).toEqual(undefined);
    });
  });

  describe('getCredentialWithContext', () => {
    it('should return credential with context', async () => {
      let key: string;
      let value: string;
      let res: string;

      key = 'id';
      value = '123';
      res = getCredentialWithContext(key, value);
      expect(res).toEqual('i=123');

      key = '_id';
      value = '123';
      res = getCredentialWithContext(key, value);
      expect(res).toEqual('i=123');

      key = 'subscriberId';
      value = '123';
      res = getCredentialWithContext(key, value);
      expect(res).toEqual('s=123');

      key = '_subscriberId';
      value = '123';
      res = getCredentialWithContext(key, value);
      expect(res).toEqual('s=123');

      key = 'environmentId';
      value = '123';
      res = getCredentialWithContext(key, value);
      expect(res).toEqual('e=123');

      key = '_environmentId';
      value = '123';
      res = getCredentialWithContext(key, value);
      expect(res).toEqual('e=123');
    });
  });

  describe('buildKey', () => {
    it('should build cache key with only id for environment query by api', () => {
      const interceptorType = CacheInterceptorTypeEnum.CACHED;
      const prefixKey = CacheKeyPrefixEnum.ENVIRONMENT_BY_API_KEY;
      const keyConfig = { _id: '123' };
      const res = buildKey(prefixKey, keyConfig, interceptorType);

      expect(res).toEqual('environment_by_api_key:i=123');
    });

    it('should build cache key from prefix with config', async () => {
      const interceptorType = CacheInterceptorTypeEnum.CACHED;
      let prefixKey: CacheKeyPrefixEnum;
      let keyConfig: Record<string, unknown>;
      let res: string;

      prefixKey = CacheKeyPrefixEnum.FEED;
      keyConfig = {
        _id: '123',
        subscriberId: '333',
        _environmentId: '456',
        limit: 10,
      };
      res = buildKey(prefixKey, keyConfig, interceptorType);
      expect(res).toEqual('feed:limit=10:s=333:e=456');

      prefixKey = CacheKeyPrefixEnum.SUBSCRIBER;
      keyConfig = {
        _id: '123',
        subscriberId: '333',
        _environmentId: '456',
        limit: 10,
      };
      res = buildKey(prefixKey, keyConfig, interceptorType);
      expect(res).toEqual('subscriber:limit=10:i=123:e=456');

      keyConfig = { _environmentId: '456', limit: 10 };
      res = buildKey(prefixKey, keyConfig, interceptorType);
      expect(res).toEqual('');
    });

    it('should build invalidate key from prefix with config', async () => {
      const interceptorType = CacheInterceptorTypeEnum.INVALIDATE;
      let prefixKey: CacheKeyPrefixEnum;
      let keyConfig: Record<string, unknown>;
      let res: string;

      prefixKey = CacheKeyPrefixEnum.FEED;
      keyConfig = {
        _id: '123',
        subscriberId: '333',
        _environmentId: '456',
        limit: 10,
      };
      res = buildKey(prefixKey, keyConfig, interceptorType);
      expect(res).toEqual('feed*:s=333:e=456');

      prefixKey = CacheKeyPrefixEnum.SUBSCRIBER;
      keyConfig = {
        _id: '123',
        subscriberId: '333',
        _environmentId: '456',
        limit: 10,
      };
      res = buildKey(prefixKey, keyConfig, interceptorType);
      expect(res).toEqual('subscriber*:i=123:e=456');

      keyConfig = { _id: '123', subscriberId: '333', limit: 10 };
      res = buildKey(prefixKey, keyConfig, interceptorType);
      expect(res).toEqual('');
    });
  });

  describe('getQueryParams', () => {
    it('should get query param from object', async () => {
      const query = {
        _id: '123',
        subscriberId: '333',
        _environmentId: '456',
        limit: 10,
        seen: true,
      };
      const res = getQueryParams(query);
      expect(res).toEqual(':limit=10:seen=true');
    });

    it('should filter credentials from query param from object', async () => {
      const query = {
        _id: '123',
        subscriberId: '333',
        _environmentId: '456',
        limit: 10,
        seen: true,
      };
      const res = getQueryParams(query);
      expect(res).not.toContain('id');
      expect(res).not.toContain('environmentId');
      expect(res).not.toContain('subscriberId');
      expect(res).toContain('limit');
      expect(res).toContain('seen');
    });

    it('should exclude undefined params from query object', async () => {
      const query = {
        _id: '123',
        subscriberId: '333',
        _environmentId: '456',
        limit: null,
        seen: undefined,
      };
      const res = getQueryParams(query);
      expect(res).not.toContain('id');
      expect(res).not.toContain('environmentId');
      expect(res).not.toContain('subscriberId');
      expect(res).not.toContain('limit');
      expect(res).not.toContain('seen');
    });

    it('should stringify nested object in query object', async () => {
      const query = {
        _id: '123',
        subscriberId: '333',
        _environmentId: '456',
        limit: 10,
        options: { limit: 10, filter: true },
      };
      const res = getQueryParams(query);
      expect(res).toContain('options');
      expect(res).toEqual(':limit=10:options={"limit":10,"filter":true}');
    });

    it('should return {key=value} format separated with delimiter :', async () => {
      const query = {
        _id: '123',
        subscriberId: '333',
        _environmentId: '456',
        limit: 10,
        options: { limit: 10, filter: true },
      };
      const res = getQueryParams(query);
      expect(res).toContain(':limit=10');
      expect(res).toContain(':options={"limit":10,"filter":true}');
    });

    it('should return key with find prefix', async () => {
      const query = {
        _id: '123',
        subscriberId: '333',
        _environmentId: '456',
        limit: 10,
      };
      const res = getQueryParams(query);
      expect(res).toEqual(':limit=10');
    });

    it('should return key with findOne prefix', async () => {
      const query = {
        _id: '123',
        subscriberId: '333',
        _environmentId: '456',
        limit: 10,
      };
      const findOneRes = getQueryParams(query);
      expect(findOneRes).toEqual(':limit=10');

      const findByIdRes = getQueryParams(query);
      expect(findByIdRes).toEqual(':limit=10');
    });

    it('should return key without method name prefix', async () => {
      const query = {
        _id: '123',
        subscriberId: '333',
        _environmentId: '456',
        limit: 10,
      };
      const findOneRes = getQueryParams(query);
      expect(findOneRes).toEqual(':limit=10');

      const findByIdRes = getQueryParams(query);
      expect(findByIdRes).toEqual(':limit=10');
    });
  });

  describe('getCredentialsKeys', () => {
    it('should return credentials with and without underline', async () => {
      const credentials = getCredentialsKeys();
      let tmp: string;

      tmp = credentials.filter((cred) => cred === 'id')[0];
      expect(tmp).toEqual('id');

      tmp = credentials.filter((cred) => cred === '_id')[0];
      expect(tmp).toEqual('_id');

      tmp = credentials.filter((cred) => cred === 'subscriberId')[0];
      expect(tmp).toEqual('subscriberId');

      tmp = credentials.filter((cred) => cred === '_subscriberId')[0];
      expect(tmp).toEqual('_subscriberId');

      tmp = credentials.filter((cred) => cred === 'environmentId')[0];
      expect(tmp).toEqual('environmentId');

      tmp = credentials.filter((cred) => cred === '_environmentId')[0];
      expect(tmp).toEqual('_environmentId');

      tmp = credentials.filter((cred) => cred === 'organizationId')[0];
      expect(tmp).toEqual('organizationId');

      tmp = credentials.filter((cred) => cred === '_organizationId')[0];
      expect(tmp).toEqual('_organizationId');
    });
  });

  describe('buildCachedQuery', () => {
    it('should return query object from object list', async () => {
      const queryArgs = [
        {
          query: {
            _id: '123',
            subscriberId: '333',
            _environmentId: '456',
            limit: '10',
          },
        },
        { options: { limit: '10', filter: true } },
      ];

      const credentials = buildCachedQuery(queryArgs) as {
        query: {
          _id: string;
          subscriberId: string;
          _environmentId: string;
          limit: string;
        };
        options: { limit: string; filter: string };
      };

      expect(credentials.query._id).toEqual('123');
      expect(credentials.query.subscriberId).toEqual('333');
      expect(credentials.query._environmentId).toEqual('456');
      expect(credentials.query.limit).toEqual('10');
      expect(credentials.options.limit).toEqual('10');
      expect(credentials.options.filter).toEqual(true);
    });

    it('should return query object from string list', async () => {
      const queryArgs = ['123', '456'];

      const credentials = buildCachedQuery(queryArgs) as Record<string, string>;

      expect(credentials.id).toEqual('123');
      expect(credentials.environmentId).toEqual('456');
    });
  });

  describe('getInvalidateQuery', () => {
    it('should create object after create method with its response (createResponse)', async () => {
      const createResponse = {
        _id: 'createResponse_123',
        subscriberId: 'createResponse_333',
        _environmentId: 'createResponse_456',
        data: 'createResponse_random response',
      };

      const queryArgs = [
        { _id: '123', subscriberId: '333' },
        { limit: '10', filter: true },
      ];

      const credentials = getInvalidateQuery('Create', createResponse, queryArgs);

      expect(credentials._id).toEqual('createResponse_123');
      expect(credentials.subscriberId).toEqual('createResponse_333');
    });

    it('should create object after update method with args object (queryArgs) first element', async () => {
      const createResponse = {
        _id: '123',
        subscriberId: '333',
        _environmentId: '456',
        data: 'random response',
      };

      const queryArgs = [
        {
          _id: 'queryArgs_123',
          subscriberId: 'queryArgs_333',
        },
        { options: { limit: '10', filter: true } },
      ];

      const credentials = getInvalidateQuery('update', createResponse, queryArgs);

      expect(credentials._id).toEqual('queryArgs_123');
      expect(credentials.subscriberId).toEqual('queryArgs_333');
    });
  });

  describe('buildQueryKeyPart', () => {
    it('should build query key part for cached interceptor', async () => {
      const query = {
        _id: '123',
        subscriberId: '333',
        _environmentId: '456',
        limit: 10,
        seen: true,
      };
      const res = buildQueryKeyPart(CacheKeyPrefixEnum.MESSAGE_COUNT, CacheInterceptorTypeEnum.CACHED, query);

      expect(res).toEqual(':limit=10:seen=true');
    });

    it('should build query key part for invalidate interceptor', async () => {
      const query = {
        _id: '123',
        subscriberId: '333',
        _environmentId: '456',
        limit: 10,
        seen: true,
      };
      const res = buildQueryKeyPart(CacheKeyPrefixEnum.MESSAGE_COUNT, CacheInterceptorTypeEnum.INVALIDATE, query);

      expect(res).toEqual('*');
    });
  });
});
