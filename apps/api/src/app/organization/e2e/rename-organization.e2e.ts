import { OrganizationRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Rename Organization - /organizations (PATCH)', function () {
  let session: UserSession;
  const organizationRepository = new OrganizationRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should rename the organization', async function () {
    const payload = {
      name: 'Liberty Powers',
    };

    await session.testAgent.patch('/v1/organizations').send(payload);

    const organization = await organizationRepository.findById(session.organization._id);

    expect(organization?.name).to.equal(payload.name);
  });
});
