import { expect } from 'chai';
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

describe('shared cache', function () {
  describe('validateCredentials', function () {
    it('should validate the credentials for Message entity', function () {
      const keyPrefix = 'Message';
      let credentials: string;
      let res: boolean;

      credentials = ':123:456';
      res = validateCredentials(keyPrefix, credentials);
      expect(res).to.be.equal(true);

      credentials = '';
      res = validateCredentials(keyPrefix, credentials);
      expect(res).to.be.equal(false);

      credentials = ':456';
      res = validateCredentials(keyPrefix, credentials);
      expect(res).to.be.equal(false);

      credentials = ':123:456:789';
      res = validateCredentials(keyPrefix, credentials);
      expect(res).to.be.equal(false);
    });
    it('should validate the credentials for not Message entity', function () {
      const keyPrefix = 'User';
      let credentials: string;
      let res: boolean;

      credentials = ':123';
      res = validateCredentials(keyPrefix, credentials);
      expect(res).to.be.equal(true);

      credentials = ':123:456';
      res = validateCredentials(keyPrefix, credentials);
      expect(res).to.be.equal(false);

      credentials = ':123:456:789';
      res = validateCredentials(keyPrefix, credentials);
      expect(res).to.be.equal(false);
    });
  });

  describe('getIdentifier', function () {
    it('should retrieve identifier _subscriber from Message query', async function () {
      const keyPrefix = 'Message';
      let query: Record<string, unknown>;
      let res: [string, string];

      query = { _id: '123', _subscriberId: '456' };
      res = getIdentifier(keyPrefix, query);
      expect(res[1]).to.be.equal('456');

      query = { _id: '123', subscriberId: '456' };
      res = getIdentifier(keyPrefix, query);
      expect(res[1]).to.be.equal('456');

      query = { id: '123', _subscriberId: '456' };
      res = getIdentifier(keyPrefix, query);
      expect(res[1]).to.be.equal('456');

      query = { id: '123', subscriberId: '456' };
      res = getIdentifier(keyPrefix, query);
      expect(res[1]).to.be.equal('456');

      query = { dummyKey: '123' };
      res = getIdentifier(keyPrefix, query);
      expect(res[1]).to.be.equal(undefined);
    });

    it('should retrieve identifier _id from not Message query', async function () {
      const keyPrefix = 'Subscriber';
      let query: Record<string, unknown>;
      let res: [string, string];

      query = { _id: '123', _subscriberId: '456' };
      res = getIdentifier(keyPrefix, query);
      expect(res[1]).to.be.equal('123');

      query = { _id: '123', subscriberId: '456' };
      res = getIdentifier(keyPrefix, query);
      expect(res[1]).to.be.equal('123');

      query = { id: '123', _subscriberId: '456' };
      res = getIdentifier(keyPrefix, query);
      expect(res[1]).to.be.equal('123');

      query = { id: '123', subscriberId: '456' };
      res = getIdentifier(keyPrefix, query);
      expect(res[1]).to.be.equal('123');

      query = { dummyKey: '123' };
      res = getIdentifier(keyPrefix, query);
      expect(res[1]).to.be.equal(undefined);
    });
  });

  describe('buildCredentialsKeyPart', function () {
    it('should build key part for Message entity', async function () {
      const keyPrefix = 'Message';
      let query: Record<string, unknown>;
      let res: string;

      query = { id: '123', subscriberId: '456', _environmentId: '789' };
      res = buildCredentialsKeyPart(keyPrefix, query);
      expect(res).to.be.equal(':s=456:e=789');

      query = { id: '123', subscriberId: '456' };
      res = buildCredentialsKeyPart(keyPrefix, query);
      expect(res).to.be.equal(':s=456');
    });

    it('should build key part for not Message entity', async function () {
      const keyPrefix = 'Subscriber';

      const query = { id: '123', subscriberId: '456', _environmentId: '789' };
      const res = buildCredentialsKeyPart(keyPrefix, query);
      expect(res).to.be.equal(':i=123:e=789');
    });
  });

  describe('getEnvironment', function () {
    it('should return environment from query', async function () {
      let res: [string, string];
      let query: Record<string, unknown>;

      query = { id: '123', subscriberId: '456', _environmentId: '789' };
      res = getEnvironment(query);
      expect(res[0]).to.be.equal('_environmentId');
      expect(res[1]).to.be.equal('789');

      query = { id: '123', subscriberId: '456', environmentId: '789' };
      res = getEnvironment(query);
      expect(res[0]).to.be.equal('environmentId');
      expect(res[1]).to.be.equal('789');

      query = { id: '123', subscriberId: '456', environmentId: '789', _environmentId: '777' };
      res = getEnvironment(query);
      expect(res[0]).to.be.equal('_environmentId');
      expect(res[1]).to.be.equal('777');

      query = { id: '123', subscriberId: '456' };
      res = getEnvironment(query);
      expect(res[0]).to.be.equal(undefined);
      expect(res[1]).to.be.equal(undefined);
    });
  });

  describe('getCredentialWithContext', function () {
    it('should return credential with context', async function () {
      let key: string;
      let value: string;
      let res: string;

      key = 'id';
      value = '123';
      res = getCredentialWithContext(key, value);
      expect(res).to.be.equal('i=123');

      key = '_id';
      value = '123';
      res = getCredentialWithContext(key, value);
      expect(res).to.be.equal('i=123');

      key = 'subscriberId';
      value = '123';
      res = getCredentialWithContext(key, value);
      expect(res).to.be.equal('s=123');

      key = '_subscriberId';
      value = '123';
      res = getCredentialWithContext(key, value);
      expect(res).to.be.equal('s=123');

      key = 'environmentId';
      value = '123';
      res = getCredentialWithContext(key, value);
      expect(res).to.be.equal('e=123');

      key = '_environmentId';
      value = '123';
      res = getCredentialWithContext(key, value);
      expect(res).to.be.equal('e=123');
    });
  });

  describe('buildKey', function () {
    it('should build cache key from prefix with config', async function () {
      const interceptorType = CacheInterceptorTypeEnum.CACHED;
      let prefixKey: string;
      let keyConfig: Record<string, unknown>;
      let res: string;

      prefixKey = 'Message';
      keyConfig = { _id: '123', subscriberId: '333', _environmentId: '456', limit: 10 };
      res = buildKey(prefixKey, 'find', keyConfig, interceptorType);
      expect(res).to.be.equal('Message:find:limit=10:s=333:e=456');

      prefixKey = 'Subscriber';
      keyConfig = { _id: '123', subscriberId: '333', _environmentId: '456', limit: 10 };
      res = buildKey(prefixKey, 'find', keyConfig, interceptorType);
      expect(res).to.be.equal('Subscriber:find:limit=10:i=123:e=456');

      prefixKey = 'Subscriber';
      keyConfig = { _environmentId: '456', limit: 10 };
      res = buildKey(prefixKey, 'find', keyConfig, interceptorType);
      expect(res).to.be.equal('');
    });

    it('should build invalidate key from prefix with config', async function () {
      const interceptorType = CacheInterceptorTypeEnum.INVALIDATE;
      let prefixKey: string;
      let keyConfig: Record<string, unknown>;
      let res: string;

      prefixKey = 'Message';
      keyConfig = { _id: '123', subscriberId: '333', _environmentId: '456', limit: 10 };
      res = buildKey(prefixKey, 'update', keyConfig, interceptorType);
      expect(res).to.be.equal('Message*:s=333:e=456');

      prefixKey = 'Subscriber';
      keyConfig = { _id: '123', subscriberId: '333', _environmentId: '456', limit: 10 };
      res = buildKey(prefixKey, 'update', keyConfig, interceptorType);
      expect(res).to.be.equal('Subscriber*:i=123:e=456');

      prefixKey = 'Subscriber';
      keyConfig = { _id: '123', subscriberId: '333', limit: 10 };
      res = buildKey(prefixKey, 'update', keyConfig, interceptorType);
      expect(res).to.be.equal('');
    });
  });

  describe('getQueryParams', function () {
    it('should get query param from object', async function () {
      const query = { _id: '123', subscriberId: '333', _environmentId: '456', limit: 10, seen: true };
      const res = getQueryParams('create', query);
      expect(res).to.be.equal(':limit=10:seen=true');
    });

    it('should filter credentials from query param from object', async function () {
      const query = { _id: '123', subscriberId: '333', _environmentId: '456', limit: 10, seen: true };
      const res = getQueryParams('create', query);
      expect(res).to.not.contains('id');
      expect(res).to.not.contains('environmentId');
      expect(res).to.not.contains('subscriberId');
      expect(res).to.be.contains('limit');
      expect(res).to.be.contains('seen');
    });

    it('should exclude undefined params from query object', async function () {
      const query = { _id: '123', subscriberId: '333', _environmentId: '456', limit: null, seen: undefined };
      const res = getQueryParams('create', query);
      expect(res).to.not.contains('id');
      expect(res).to.not.contains('environmentId');
      expect(res).to.not.contains('subscriberId');
      expect(res).to.not.contains('limit');
      expect(res).to.not.contains('seen');
    });

    it('should stringify nested object in query object', async function () {
      const query = {
        _id: '123',
        subscriberId: '333',
        _environmentId: '456',
        limit: 10,
        options: { limit: 10, filter: true },
      };
      const res = getQueryParams('create', query);
      expect(res).to.contains('options');
      expect(res).to.be.equal(':limit=10:options={"limit":10,"filter":true}');
    });

    it('should return {key=value} format separated with delimiter :', async function () {
      const query = {
        _id: '123',
        subscriberId: '333',
        _environmentId: '456',
        limit: 10,
        options: { limit: 10, filter: true },
      };
      const res = getQueryParams('find', query);
      expect(res).to.contains(':limit=10');
      expect(res).to.contains(':options={"limit":10,"filter":true}');
    });

    it('should return key with find prefix', async function () {
      const query = {
        _id: '123',
        subscriberId: '333',
        _environmentId: '456',
        limit: 10,
      };
      const res = getQueryParams('find', query);
      expect(res).to.be.equal(':find:limit=10');
    });

    it('should return key with findOne prefix', async function () {
      const query = {
        _id: '123',
        subscriberId: '333',
        _environmentId: '456',
        limit: 10,
      };
      const findOneRes = getQueryParams('findOne', query);
      expect(findOneRes).to.be.equal(':findOne:limit=10');

      const findByIdRes = getQueryParams('findById', query);
      expect(findByIdRes).to.be.equal(':findOne:limit=10');
    });

    it('should return key without method name prefix', async function () {
      const query = {
        _id: '123',
        subscriberId: '333',
        _environmentId: '456',
        limit: 10,
      };
      const findOneRes = getQueryParams('create', query);
      expect(findOneRes).to.be.equal(':limit=10');

      const findByIdRes = getQueryParams('update', query);
      expect(findByIdRes).to.be.equal(':limit=10');
    });
  });

  describe('getCredentialsKeys', function () {
    it('should return credentials with and without underline', async function () {
      const credentials = getCredentialsKeys();
      let tmp: string;

      tmp = credentials.filter((cred) => cred === 'id')[0];
      expect(tmp).to.be.equal('id');

      tmp = credentials.filter((cred) => cred === '_id')[0];
      expect(tmp).to.be.equal('_id');

      tmp = credentials.filter((cred) => cred === 'subscriberId')[0];
      expect(tmp).to.be.equal('subscriberId');

      tmp = credentials.filter((cred) => cred === '_subscriberId')[0];
      expect(tmp).to.be.equal('_subscriberId');

      tmp = credentials.filter((cred) => cred === 'environmentId')[0];
      expect(tmp).to.be.equal('environmentId');

      tmp = credentials.filter((cred) => cred === '_environmentId')[0];
      expect(tmp).to.be.equal('_environmentId');

      tmp = credentials.filter((cred) => cred === 'organizationId')[0];
      expect(tmp).to.be.equal('organizationId');

      tmp = credentials.filter((cred) => cred === '_organizationId')[0];
      expect(tmp).to.be.equal('_organizationId');
    });
  });

  describe('buildCachedQuery', function () {
    it('should return query object from object list', async function () {
      const queryArgs = [
        { query: { _id: '123', subscriberId: '333', _environmentId: '456', limit: '10' } },
        { options: { limit: '10', filter: true } },
      ];

      const credentials = buildCachedQuery(queryArgs) as {
        query: { _id: string; subscriberId: string; _environmentId: string; limit: string };
        options: { limit: string; filter: string };
      };

      expect(credentials.query._id).to.be.equal('123');
      expect(credentials.query.subscriberId).to.be.equal('333');
      expect(credentials.query._environmentId).to.be.equal('456');
      expect(credentials.query.limit).to.be.equal('10');
      expect(credentials.options.limit).to.be.equal('10');
      expect(credentials.options.filter).to.be.equal(true);
    });

    it('should return query object from string list', async function () {
      const queryArgs = ['123', '456'];

      const credentials = buildCachedQuery(queryArgs) as Record<string, string>;

      expect(credentials.id).to.be.equal('123');
      expect(credentials.environmentId).to.be.equal('456');
    });
  });

  describe('getInvalidateQuery', function () {
    it('should create object after create method with its response (createResponse)', async function () {
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

      const credentials = getInvalidateQuery('create', createResponse, queryArgs);

      expect(credentials._id).to.be.equal('createResponse_123');
      expect(credentials.subscriberId).to.be.equal('createResponse_333');
    });

    it('should create object after update method with args object (queryArgs) first element', async function () {
      const createResponse = { _id: '123', subscriberId: '333', _environmentId: '456', data: 'random response' };

      const queryArgs = [
        {
          _id: 'queryArgs_123',
          subscriberId: 'queryArgs_333',
        },
        { options: { limit: '10', filter: true } },
      ];

      const credentials = getInvalidateQuery('update', createResponse, queryArgs);

      expect(credentials._id).to.be.equal('queryArgs_123');
      expect(credentials.subscriberId).to.be.equal('queryArgs_333');
    });
  });

  describe('buildQueryKeyPart', function () {
    it('should build query key part for cached interceptor', async function () {
      const query = { _id: '123', subscriberId: '333', _environmentId: '456', limit: 10, seen: true };
      const res = buildQueryKeyPart('find', CacheInterceptorTypeEnum.CACHED, query);

      expect(res).to.be.equal(':find:limit=10:seen=true');
    });

    it('should build query key part for invalidate interceptor', async function () {
      const query = { _id: '123', subscriberId: '333', _environmentId: '456', limit: 10, seen: true };
      const res = buildQueryKeyPart('update', CacheInterceptorTypeEnum.INVALIDATE, query);

      expect(res).to.be.equal('*');
    });
  });
});
