import { expect } from 'chai';
import axios, { AxiosResponse } from 'axios';

import { UserSession } from '@novu/testing';
import { createTenant } from './create-tenant.e2e';

describe('Get Tenant - /:tenantId (GET)', function () {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should get a newly created tenant', async function () {
    const res = await createTenant({
      session,
      identifier: 'identifier_123',
      name: 'name_123',
      data: { test1: 'test value1', test2: 'test value2' },
    });

    const getTenantResult = await getTenant({ session, id: res.data._id });

    expect(getTenantResult.data.identifier).to.equal('identifier_123');
    expect(getTenantResult.data.name).to.equal('name_123');
    expect(getTenantResult.data.data).to.deep.equal({ test1: 'test value1', test2: 'test value2' });
  });

  it('should throw exception if tenant does not existing', async function () {
    const incorrectId = session.environment._id;
    try {
      await getTenant({ session, id: incorrectId });

      throw new Error('');
    } catch (e) {
      expect(e.response.data.message).to.contains(
        `Tenant with id: ${incorrectId} does not exist under environment ${session.environment._id}`
      );
    }
  });
});

async function getTenant({ session, id }: { session; id: string }): Promise<AxiosResponse> {
  const axiosInstance = axios.create();

  return await axiosInstance.get(`${session.serverUrl}/v1/tenants/${id}`, {
    headers: {
      authorization: `ApiKey ${session.apiKey}`,
    },
  });
}
