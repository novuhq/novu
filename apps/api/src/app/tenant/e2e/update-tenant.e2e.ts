import { expect } from 'chai';
import axios, { AxiosResponse } from 'axios';

import { UserSession } from '@novu/testing';
import { TenantRepository } from '@novu/dal';

describe('Update Tenant - /tenants/:tenantId (PUT)', function () {
  let session: UserSession;
  const tenantRepository = new TenantRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should update tenant', async function () {
    await tenantRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      identifier: 'identifier_123',
      name: 'name_123',
      data: { test1: 'test value1', test2: 'test value2' },
    });

    const response = await updateTenant({
      session,
      identifier: 'identifier_123',
      newIdentifier: 'newIdentifier',
      name: 'new_name',
      data: { test1: 'new value', test2: 'new value2' },
    });

    expect(response?.status).to.equal(200);

    const updatedTenant = await tenantRepository.findOne({
      _environmentId: session.environment._id,
      identifier: 'newIdentifier',
    });

    expect(updatedTenant?.name).to.equal('new_name');
    expect(updatedTenant?.identifier).to.equal('newIdentifier');
    expect(updatedTenant?.data).to.deep.equal({ test1: 'new value', test2: 'new value2' });
  });

  it('should not update identifier with null/undefined', async function () {
    await tenantRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      identifier: 'identifier_123',
      name: 'name_123',
      data: { test1: 'test value1', test2: 'test value2' },
    });

    await updateTenant({
      session,
      identifier: 'identifier_123',
      newIdentifier: null,
    });

    const tenantNotUpdatedWithNull = await tenantRepository.findOne({
      _environmentId: session.environment._id,
      identifier: 'identifier_123',
    });

    expect(tenantNotUpdatedWithNull?.identifier).to.equal('identifier_123');

    await updateTenant({
      session,
      identifier: 'identifier_123',
      newIdentifier: undefined,
    });

    const tenantNotUpdatedWithUndefined = await tenantRepository.findOne({
      _environmentId: session.environment._id,
      identifier: 'identifier_123',
    });

    expect(tenantNotUpdatedWithUndefined?.identifier).to.equal('identifier_123');
  });

  it('should not be able to update to already existing identifier (in the same environment)', async function () {
    await tenantRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      identifier: 'identifier_123',
    });

    await tenantRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      identifier: 'identifier_456',
    });

    try {
      await updateTenant({
        session,
        identifier: 'identifier_123',
        newIdentifier: 'identifier_456',
      });

      expectedException();
    } catch (e) {
      expect(e.response.status).to.equal(409);
      expect(e?.response?.data?.message || e?.message).to.contains(
        `Tenant with identifier: identifier_456 already exists under environment ${session.environment._id}`
      );
    }
  });

  it('should throw exception id tenant was not found under environment', async function () {
    await tenantRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      identifier: 'identifier_123',
    });

    try {
      await updateTenant({
        session,
        identifier: 'identifier_1234',
      });

      expectedException();
    } catch (e) {
      expect(e.response.status).to.equal(404);
      expect(e?.response?.data?.message || e?.message).to.contains(
        `Tenant with identifier: identifier_1234 does not exist under environment ${session.environment._id}`
      );
    }
  });
});

const expectedException = () => {
  throw new Error('missing exception in the try/catch block');
};

export async function updateTenant({
  session,
  identifier,
  newIdentifier,
  name,
  data,
}: {
  session;
  identifier?: string;
  newIdentifier?: string | null | undefined;
  name?: string;
  data?: any;
}): Promise<AxiosResponse> {
  const axiosInstance = axios.create();

  return await axiosInstance.patch(
    `${session.serverUrl}/v1/tenants/${identifier}`,
    {
      identifier: newIdentifier,
      name: name,
      data: data,
    },
    {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    }
  );
}
