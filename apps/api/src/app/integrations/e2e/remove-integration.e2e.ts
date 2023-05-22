import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { HttpStatus } from '@nestjs/common';

describe('Delete Integration - /integration/:integrationId (DELETE)', function () {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize({
      noIntegrations: true,
    });
  });

  it('should remove existing integration', async function () {
    const payload = {
      providerId: 'sendgrid',
      channel: ChannelTypeEnum.EMAIL,
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: true,
      check: false,
    };

    const integration = await session.testAgent.post('/v1/integrations').send(payload);
    expect(integration.status).to.equal(HttpStatus.CREATED);
    const integrationId = integration.body.data._id;

    const res = await session.testAgent.delete(`/v1/integrations/${integrationId}`).send();
    expect(res.status).to.equal(HttpStatus.OK);

    const isDeleted = !(await integrationRepository.findOne({
      _environmentId: session.environment._id,
      _id: integrationId,
    }));

    expect(isDeleted).to.equal(true);

    const deletedIntegration = (
      await integrationRepository.findDeleted({ _environmentId: session.environment._id, _id: integrationId })
    )[0];

    expect(deletedIntegration.deleted).to.equal(true);
  });

  it('fail remove none existing integration', async function () {
    const dummyId = '012345678912';
    const response = await session.testAgent.delete(`/v1/integrations/${dummyId}`).send();

    expect(response.body.message).to.contains('Could not find integration with id');
  });
});
