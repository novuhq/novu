import { expect } from 'chai';
import axios, { AxiosResponse } from 'axios';

import { UserSession } from '@novu/testing';
import { TenantRepository } from '@novu/dal';

describe('Get Tenant - /tenants/:identifier (GET)', function () {
  let session: UserSession;
  const tenantRepository = new TenantRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should get a newly created tenant', async function () {
    await tenantRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      identifier: 'identifier_123',
      name: 'name_123',
      data: { test1: 'test value1', test2: 'test value2' },
    });

    const getTenantResult = await getTenant({ session, identifier: 'identifier_123' });

    expect(getTenantResult.data.identifier).to.equal('identifier_123');
    expect(getTenantResult.data.name).to.equal('name_123');
    expect(getTenantResult.data.data).to.deep.equal({ test1: 'test value1', test2: 'test value2' });
  });

  it('should throw exception if tenant does not existing', async function () {
    const incorrectId = 'identifier_123';
    try {
      await getTenant({ session, identifier: incorrectId });

      throw new Error('');
    } catch (e) {
      expect(e?.response?.data?.message || e?.message).to.contains(
        `Tenant with identifier: ${incorrectId} does not exist under environment ${session.environment._id}`
      );
    }
  });
});

async function getTenant({ session, identifier }: { session; identifier: string }): Promise<AxiosResponse> {
  const axiosInstance = axios.create();

  return (
    await axiosInstance.get(`${session.serverUrl}/v1/tenants/${identifier}`, {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    })
  ).data;
}
