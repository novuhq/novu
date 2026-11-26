import { CommunityOrganizationRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Copilot settings - /organizations/settings/copilot #novu-v2', () => {
  let session: UserSession;
  let organizationRepository: CommunityOrganizationRepository;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    organizationRepository = new CommunityOrganizationRepository();
  });

  it('turns every switch on for an organization that never set them', async () => {
    const { body } = await session.testAgent.get('/v1/organizations/settings/copilot').expect(200);

    expect(body.data).to.deep.equal({ dashboardEnabled: true, slackEnabled: true, editsEnabled: true });
  });

  it('changes only the switches sent, and keeps them', async () => {
    const { body: turnedOff } = await session.testAgent
      .patch('/v1/organizations/settings/copilot')
      .send({ dashboardEnabled: false })
      .expect(200);
    expect(turnedOff.data).to.deep.equal({ dashboardEnabled: false, slackEnabled: true, editsEnabled: true });

    await session.testAgent.patch('/v1/organizations/settings/copilot').send({ editsEnabled: false }).expect(200);

    const organization = await organizationRepository.findById(session.organization._id);
    expect(organization?.copilotSettings).to.deep.equal({ dashboardEnabled: false, editsEnabled: false });

    const { body } = await session.testAgent.get('/v1/organizations/settings/copilot').expect(200);
    expect(body.data).to.deep.equal({ dashboardEnabled: false, slackEnabled: true, editsEnabled: false });
  });

  it('rejects a switch that is not a boolean', async () => {
    await session.testAgent.patch('/v1/organizations/settings/copilot').send({ slackEnabled: 'off' }).expect(422);

    const { body } = await session.testAgent.get('/v1/organizations/settings/copilot').expect(200);
    expect(body.data.slackEnabled).to.equal(true);
  });
});
