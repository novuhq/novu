import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { StepTypeEnum } from '@novu/shared';

describe('Get all preferences - /inbox/preferences (GET)', function () {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should return no global preferences if workflow preferences are not present', async function () {
    const response = await session.testAgent
      .get('/v1/inbox/preferences')
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    const globalPreference = response.body.data[0];

    expect(globalPreference.channels.email).to.equal(undefined);
    expect(globalPreference.channels.in_app).to.equal(undefined);
    expect(globalPreference.level).to.equal('global');
    expect(response.body.data.length).to.equal(1);
  });

  it('should get both global preferences for active channels and workflow preferences if workflow is present', async function () {
    await session.createTemplate({
      noFeedId: true,
      steps: [
        {
          type: StepTypeEnum.EMAIL,
          content: 'Test notification content',
        },
      ],
    });

    const response = await session.testAgent
      .get('/v1/inbox/preferences')
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    const globalPreference = response.body.data[0];

    expect(globalPreference.channels.email).to.equal(true);
    expect(globalPreference.channels.in_app).to.equal(undefined);
    expect(globalPreference.level).to.equal('global');

    const workflowPreference = response.body.data[1];

    expect(workflowPreference.channels.email).to.equal(true);
    expect(workflowPreference.channels.in_app).to.equal(undefined);
    expect(workflowPreference.level).to.equal('template');
  });

  it('should throw error when made unauthorized call', async function () {
    const response = await session.testAgent.get(`/v1/inbox/preferences`).set('Authorization', `Bearer InvalidToken`);

    expect(response.status).to.equal(401);
  });

  it('should allow filtering preferences by tags', async function () {
    const newsletterTag = 'newsletter';
    const securityTag = 'security';
    await session.createTemplate({
      noFeedId: true,
      tags: [newsletterTag],
    });
    await session.createTemplate({
      noFeedId: true,
      tags: [securityTag],
    });

    const response = await session.testAgent
      .get(`/v1/inbox/preferences?tags[]=${newsletterTag}&tags[]=${securityTag}`)
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    expect(response.body.data.length).to.equal(3);

    const globalPreference = response.body.data[0];
    expect(globalPreference.channels.email).to.equal(true);
    expect(globalPreference.channels.in_app).to.equal(true);
    expect(globalPreference.level).to.equal('global');

    const workflowPreferences = response.body.data.slice(1);
    workflowPreferences.forEach((workflowPreference) => {
      expect(workflowPreference.workflow.tags[0]).to.be.oneOf([newsletterTag, securityTag]);
    });
  });

  it('should fetch only non-critical/readOnly=false workflows', async function () {
    await session.createTemplate({
      noFeedId: true,
      critical: true,
    });

    await session.createTemplate({
      noFeedId: true,
      critical: false,
    });

    const response = await session.testAgent
      .get('/v1/inbox/preferences')
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    expect(response.body.data.length).to.equal(2);

    const globalPreference = response.body.data[0];

    expect(globalPreference.channels.email).to.equal(true);
    expect(globalPreference.channels.in_app).to.equal(true);
    expect(globalPreference.level).to.equal('global');

    const workflowPreference = response.body.data[1];

    expect(workflowPreference.channels.email).to.equal(true);
    expect(workflowPreference.channels.in_app).to.equal(true);
    expect(workflowPreference.level).to.equal('template');
    expect(workflowPreference.workflow.critical).to.equal(false);
  });
});
