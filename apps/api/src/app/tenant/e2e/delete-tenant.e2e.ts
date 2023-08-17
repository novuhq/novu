import { expect } from 'chai';
import axios, { AxiosResponse } from 'axios';

import { UserSession } from '@novu/testing';
import { TenantRepository } from '@novu/dal';

describe('Delete Tenant - /tenants/:identifier (DELETE)', function () {
  let session: UserSession;
  const tenantRepository = new TenantRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should delete newly created tenant', async function () {
    await tenantRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      identifier: 'identifier_123',
      name: 'name_123',
      data: { test1: 'test value1', test2: 'test value2' },
    });

    const existingTenant = await tenantRepository.findOne({
      _environmentId: session.environment._id,
      identifier: 'identifier_123',
    });

    expect(existingTenant).to.be.ok;

    await deleteTenant({
      session,
      identifier: 'identifier_123',
    });

    const deletedTenant = await tenantRepository.findOne({
      _environmentId: session.environment._id,
      identifier: 'identifier_123',
    });

    expect(deletedTenant).to.equal(null);
  });

  it('should throw exception while trying to delete not existing tenant', async function () {
    const identifier = '4f3c4146-e471-4fe8-b23d-e3411689db00';

    try {
      await deleteTenant({
        session,
        identifier: identifier,
      });

      throw new Error('');
    } catch (e) {
      expect(e?.response?.data?.message || e?.message).to.contains(
        `Tenant with identifier: ${identifier} does not exist under environment ${session.environment._id}`
      );
    }
  });
});

export async function deleteTenant({ session, identifier }: { session; identifier?: string }): Promise<AxiosResponse> {
  const axiosInstance = axios.create();

  return await axiosInstance.delete(`${session.serverUrl}/v1/tenants/${identifier}`, {
    headers: {
      authorization: `ApiKey ${session.apiKey}`,
    },
  });
}
