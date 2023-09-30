import { expect } from 'chai';
import axios, { AxiosResponse } from 'axios';

import { UserSession } from '@novu/testing';
import { TenantRepository } from '@novu/dal';

describe('Create Tenant - /tenants (POST)', function () {
  let session: UserSession;
  const tenantRepository = new TenantRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should create a new tenant', async function () {
    const response = await createTenant({
      session,
      identifier: 'identifier_123',
      name: 'name_123',
      data: { test1: 'test value1', test2: 'test value2' },
    });

    expect(response.status).to.equal(201);
    expect(response.data).to.be.ok;

    const createdTenant = await tenantRepository.findOne({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      identifier: 'identifier_123',
    });

    expect(createdTenant?.name).to.equal('name_123');
    expect(createdTenant?.identifier).to.equal('identifier_123');
    expect(createdTenant?.data).to.deep.equal({ test1: 'test value1', test2: 'test value2' });
  });

  it('should throw error if a tenant is already exist in the environment', async function () {
    await createTenant({
      session,
      identifier: 'identifier_123',
      name: 'name_123',
    });

    try {
      await createTenant({
        session,
        identifier: 'identifier_123',
        name: 'name_123',
      });

      throw new Error('');
    } catch (e) {
      expect(e.response.status).to.equal(409);
      expect(e.response.data.message).to.contains(
        `Tenant with identifier: identifier_123 already exists under environment ${session.environment._id}`
      );
    }
  });

  it('should throw error if a missing tenant identifier', async function () {
    try {
      await createTenant({
        session,
      });

      throw new Error('');
    } catch (e) {
      expect(e.response.data.message).to.be.an('array').that.includes('identifier should not be empty');
      expect(e.response.data.message).to.be.an('array').that.includes('identifier must be a string');
    }
  });
});

export async function createTenant({
  session,
  identifier,
  name,
  data,
}: {
  session;
  identifier?: string;
  name?: string;
  data?: any;
}): Promise<AxiosResponse> {
  const axiosInstance = axios.create();

  return await axiosInstance.post(
    `${session.serverUrl}/v1/tenants`,
    {
      identifier: identifier,
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
