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

  it('should get a newly created tenants', async function () {
    for (let i = 0; i < 5; i++) {
      await tenantRepository.create({
        _environmentId: session.environment._id,
        identifier: `identifier_${i}`,
        name: 'name_123',
        data: { test1: 'test value1', test2: 'test value2' },
      });
    }

    const getTenantResult = await getTenants({ session });

    const { data } = getTenantResult;

    expect(data.page).to.equal(0);
    expect(data.pageSize).to.equal(10);
    expect(data.totalCount).to.equal(5);
    expect(data.data.length).to.equal(5);
    expect(data.data[0].identifier).to.equal('identifier_0');
    expect(data.data[4].identifier).to.equal('identifier_4');
  });

  it('should get second page of tenants', async function () {
    for (let i = 0; i < 9; i++) {
      await tenantRepository.create({
        _environmentId: session.environment._id,
        identifier: `identifier_${i}`,
        name: 'name_123',
        data: { test1: 'test value1', test2: 'test value2' },
      });
    }

    const getTenantResult = await getTenants({ session, page: 1, limit: 5 });

    const { data } = getTenantResult;

    expect(data.page).to.equal(1);
    expect(data.pageSize).to.equal(5);
    expect(data.totalCount).to.equal(9);
    expect(data.data.length).to.equal(4);
    expect(data.data[0].identifier).to.equal('identifier_5');
    expect(data.data[3].identifier).to.equal('identifier_8');
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
