import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Get Active Integrations - /integrations/active (GET)', function () {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should get active integrations', async function () {
    const activeIntegrations = (await session.testAgent.get(`/v1/integrations/active`)).body.data;

    expect(activeIntegrations.length).to.equal(5);

    for (const integration of activeIntegrations) {
      expect(integration?.active).to.equal(true);
    }
  });
});
