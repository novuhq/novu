import { expect } from 'chai';
import axios, { AxiosResponse } from 'axios';

import { UserSession } from '@novu/testing';
import { TenantRepository } from '@novu/dal';

describe('Get Tenants List- /tenants (GET)', function () {
  let session: UserSession;
  const tenantRepository = new TenantRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should get the newly created tenants', async function () {
    for (let i = 0; i < 5; i++) {
      await tenantRepository.create({
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        identifier: `identifier_${i}`,
        name: 'name_123',
        data: { test1: 'test value1', test2: 'test value2' },
      });

      await timeout(5);
    }

    const getTenantResult = await getTenants({ session });

    const { data } = getTenantResult;

    expect(data.page).to.equal(0);
    expect(data.pageSize).to.equal(10);
    expect(data.hasMore).to.equal(false);
    expect(data.data.length).to.equal(5);
    expect(data.data[0].identifier).to.equal('identifier_4');
    expect(data.data[4].identifier).to.equal('identifier_0');
  });

  it('should get second page of tenants', async function () {
    for (let i = 0; i < 9; i++) {
      await tenantRepository.create({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        identifier: `identifier_${i}`,
        name: 'name_123',
        data: { test1: 'test value1', test2: 'test value2' },
      });

      await timeout(10);
    }

    const getTenantResult = await getTenants({ session, page: 1, limit: 5 });

    const { data } = getTenantResult;

    expect(data.page).to.equal(1);
    expect(data.pageSize).to.equal(5);
    expect(data.hasMore).to.equal(false);
    expect(data.data.length).to.equal(4);
    expect(data.data[0].identifier).to.equal('identifier_3');
    expect(data.data[3].identifier).to.equal('identifier_0');
  });

  it('should get tenants by pagination', async function () {
    for (let i = 0; i < 14; i++) {
      await tenantRepository.create({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        identifier: `identifier_${i}`,
        name: 'name_123',
        data: { test1: 'test value1', test2: 'test value2' },
      });

      await timeout(5);
    }

    const page1 = (await getTenants({ session, page: 0, limit: 5 })).data;

    expect(page1.page).to.equal(0);
    expect(page1.pageSize).to.equal(5);
    expect(page1.hasMore).to.equal(true);
    expect(page1.data.length).to.equal(5);

    const page2 = (await getTenants({ session, page: 1, limit: 5 })).data;

    expect(page2.page).to.equal(1);
    expect(page2.pageSize).to.equal(5);
    expect(page2.hasMore).to.equal(true);
    expect(page2.data.length).to.equal(5);

    const page3 = (await getTenants({ session, page: 2, limit: 5 })).data;

    expect(page3.page).to.equal(2);
    expect(page3.pageSize).to.equal(5);
    expect(page3.hasMore).to.equal(false);
    expect(page3.data.length).to.equal(4);
  });
});

async function getTenants({
  session,
  page,
  limit,
}: {
  session;
  page?: number;
  limit?: number;
}): Promise<AxiosResponse> {
  const axiosInstance = axios.create();
  const pageQuery = page ? `page=${page}` : '';
  const limitQuery = limit ? `limit=${limit}` : '';
  const queryParams = [pageQuery, limitQuery].filter((queryStr) => queryStr).join('&');
  const query = queryParams ? `?${queryParams}` : '';

  return await axiosInstance.get(`${session.serverUrl}/v1/tenants${query}`, {
    headers: {
      authorization: `ApiKey ${session.apiKey}`,
    },
  });
}

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
