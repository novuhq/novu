import { IntegrationEntity } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ChannelTypeEnum } from '@novu/shared';

describe('Get Integrations - /integrations (GET)', function () {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should get newly created integration', async function () {
    const integrations = (await session.testAgent.get(`/v1/integrations`)).body.data;

    expect(integrations.length).to.equal(2);

    const integration = integrations.find((x) => x.channel === 'email');

    expect(integration.providerId).to.equal('sendgrid');
    expect(integration.channel).to.equal(ChannelTypeEnum.EMAIL);
    expect(integration.credentials.apiKey).to.equal('123');
    expect(integration.credentials.secretKey).to.equal('abc');
    expect(integration.active).to.equal(true);
  });
});
