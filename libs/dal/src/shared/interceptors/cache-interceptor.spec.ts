import { expect } from 'chai';
import { beforeEach } from 'mocha';
import { CacheService } from '../services/cache-service.spec';
import { ICacheService } from '../services';
import { Cached, InvalidateCache } from './';

describe('cached interceptor', function () {
  let repo: Repo;
  beforeEach(function () {
    repo = new Repo();
  });

  it('should get resource from repo', async function () {
    const repoResponse = await repo.find({ _environmentId: '456', _subscriberId: '123' });

    expect(repoResponse.data).to.be.equal('resource from the remote store');
    expect(repo.callCount).to.be.equal(1);
  });

  it('should get resource from cache and not repository', async function () {
    await repo.find({ _subscriberId: '123', _environmentId: '456' });
    await repo.find({ _subscriberId: '123', _environmentId: '456' });

    expect(repo.callCount).to.be.equal(1);
  });

  it('should get resource from repository when _subscriberId missing', async function () {
    await repo.find({ _environmentId: '456' });
    await repo.find({ _environmentId: '456' });

    expect(repo.callCount).to.be.equal(2);
  });

  it('should get resource from repository when _environmentId missing', async function () {
    await repo.find({ _subscriberId: '456' });
    await repo.find({ _subscriberId: '456' });

    expect(repo.callCount).to.be.equal(2);
  });

  it('should invalidate the resource', async function () {
    await repo.find({ _subscriberId: '123', _environmentId: '456' });
    await repo.update({ _subscriberId: '123', _environmentId: '456' }, { data: 'new data' });
    const repoResponse = await repo.find({ _subscriberId: '123', _environmentId: '456' });

    expect(repoResponse.data).to.be.equal('new data');
    expect(repo.callCount).to.be.equal(3);
  });

  it('should extract null from cache store', async function () {
    const messageRepo = new MessageRepo();

    const createCachedNull = await messageRepo.find({ _subscriberId: '123', _environmentId: '456' });
    const responseFromCache = await messageRepo.find({ _subscriberId: '123', _environmentId: '456' });

    expect(messageRepo.callCount).to.be.equal(1);
    expect(responseFromCache).to.be.equal(null);
  });

  it('Message repository - should create new entity and invalidate the old null response with create method', async function () {
    const messageRepo = new MessageRepo();

    // create cached null -> result  {123:456 : null} because its data not stored in the storage
    await messageRepo.find({ _subscriberId: '123', _environmentId: '456' });

    // should create new collection in the cache {123:456 : object}
    await messageRepo.create({
      _subscriberId: '123',
      _environmentId: '456',
      data: 'random data',
    });

    const extractedDataBySubscriberId = await messageRepo.find({ _subscriberId: '123', _environmentId: '456' });

    expect(messageRepo.callCount).to.be.equal(3);
    expect(extractedDataBySubscriberId.data).to.be.equal('random data');
  });

  it('Message repository - should invalidate with update method', async function () {
    const messageRepo = new MessageRepo();

    // should create new collection in the cache {123:456 : object}
    await messageRepo.create({
      _subscriberId: '123',
      _environmentId: '456',
      data: 'random data',
    });

    // cache created data
    await messageRepo.find({ _subscriberId: '123', _environmentId: '456' });

    // should update newly create object + invalidate
    await messageRepo.update(
      {
        _subscriberId: '123',
        _environmentId: '456',
      },
      {
        data: 'updated data',
      }
    );

    const extractedDataBySubscriberId = await messageRepo.find({ _subscriberId: '123', _environmentId: '456' });

    expect(messageRepo.callCount).to.be.equal(4);
    expect(extractedDataBySubscriberId.data).to.be.equal('updated data');
  });
});

class MessageRepo {
  public cacheService: ICacheService;
  public count = 0;
  private store = {};
  constructor() {
    this.cacheService = CacheService.createClient();
  }
  get callCount() {
    return this.count;
  }
  @Cached('Message')
  async find(query: any, select: any = '', options: { limit?: number; sort?: any; skip?: number } = {}): Promise<any> {
    this.count++;

    const findKey = `${query._subscriberId}:${query._environmentId}`;

    return this.store[findKey] ?? null;
  }

  @InvalidateCache('Message')
  async create(data: any): Promise<any> {
    this.count++;

    const createKey = `${data._subscriberId}:${data._environmentId}`;
    const newEntity = Object.assign({}, data, { _id: '112358132134' });
    this.store[createKey] = newEntity;

    return newEntity ?? null;
  }

  @InvalidateCache('Message')
  async update(query: any, updateBody: any): Promise<any> {
    this.count++;
    const createKey = `${query._subscriberId}:${query._environmentId}`;
    this.store[createKey] = Object.assign({}, query, updateBody);

    return {
      matched: 1,
      modified: 1,
    };
  }
}

class Repo {
  public cacheService: ICacheService;
  public count = 0;
  private store = { data: 'resource from the remote store' };
  constructor() {
    this.cacheService = CacheService.createClient();
  }
  get callCount() {
    return this.count;
  }
  @Cached('feed')
  async find(query: any, select: any = '', options: { limit?: number; sort?: any; skip?: number } = {}): Promise<any> {
    this.count++;

    return this.store;
  }

  @InvalidateCache('feed')
  async update(query: any, updateBody: any): Promise<any> {
    this.store = updateBody;
    this.count++;

    return {
      matched: 1,
      modified: 1,
    };
  }
}
