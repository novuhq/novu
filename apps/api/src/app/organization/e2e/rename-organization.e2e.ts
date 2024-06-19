import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Rename Organization - /organizations (PATCH)', function () {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should rename the organization', async function () {
    const payload = {
      name: 'Liberty Powers',
    };

    await session.testAgent.patch('/v1/organizations').send(payload);

    const { body } = await session.testAgent.get('/v1/organizations/me').expect(200);
    const organization = body.data;

    expect(organization?.name).to.equal(payload.name);
  });
});
