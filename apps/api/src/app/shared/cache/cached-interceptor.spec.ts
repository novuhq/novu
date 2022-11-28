import { expect } from 'chai';
import { ICacheService, Cached, InvalidateCache } from '@novu/dal';
import { CacheService } from './cache-service.spec';
import { beforeEach } from 'mocha';

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
});

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

    return this.store;
  }
}
