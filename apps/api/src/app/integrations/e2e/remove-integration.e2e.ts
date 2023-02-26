import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { IntegrationRepository } from '@novu/dal';

describe('Delete Integration - /integration/:integrationId (DELETE)', function () {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should remove existing integration', async function () {
    const payload = {
      providerId: 'sendgrid',
      channel: 'EMAIL',
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: true,
      check: false,
    };

    const integration = await session.testAgent.post('/v1/integrations').send(payload);
    const integrationId = integration.body.data._id;

    await session.testAgent.delete(`/v1/integrations/${integrationId}`).send();

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
