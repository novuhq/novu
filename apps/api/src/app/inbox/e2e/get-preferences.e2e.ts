import { SeverityLevelEnum, StepTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Get all preferences - /inbox/preferences (GET) #novu-v2', () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should return no global preferences if workflow preferences are not present', async () => {
    const response = await session.testAgent
      .get('/v1/inbox/preferences')
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    const globalPreference = response.body.data[0];

    expect(globalPreference.channels.email).to.equal(undefined);
    expect(globalPreference.channels.in_app).to.equal(undefined);
    expect(globalPreference.level).to.equal('global');
    expect(response.body.data.length).to.equal(1);
  });

  it('should get both global preferences for active channels and workflow preferences if workflow is present', async () => {
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

  it('should throw error when made unauthorized call', async () => {
    const response = await session.testAgent.get(`/v1/inbox/preferences`).set('Authorization', `Bearer InvalidToken`);

    expect(response.status).to.equal(401);
  });

  it('should allow filtering preferences by tags', async () => {
    const newsletterTag = 'newsletter';
    const securityTag = 'security';
    const marketingTag = 'marketing';
    await session.createTemplate({
      noFeedId: true,
      tags: [newsletterTag],
    });
    await session.createTemplate({
      noFeedId: true,
      tags: [securityTag],
    });
    await session.createTemplate({
      noFeedId: true,
      tags: [marketingTag],
    });
    await session.createTemplate({
      noFeedId: true,
      tags: [],
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

  it('should fetch only non-critical/readOnly=false workflows', async () => {
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

  describe('Severity filtering', () => {
    it('should return preferences filtered by single severity level', async () => {
      // Create templates with different severities
      await session.createTemplate({
        noFeedId: true,
        severity: SeverityLevelEnum.HIGH,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'High severity notification',
          },
        ],
      });

      await session.createTemplate({
        noFeedId: true,
        severity: SeverityLevelEnum.MEDIUM,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'Medium severity notification',
          },
        ],
      });

      await session.createTemplate({
        noFeedId: true,
        severity: SeverityLevelEnum.LOW,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'Low severity notification',
          },
        ],
      });

      const response = await session.testAgent
        .get(`/v1/inbox/preferences?severity[]=${SeverityLevelEnum.HIGH}`)
        .set('Authorization', `Bearer ${session.subscriberToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.data).to.be.an('array');

      // Should include global preference and only high severity workflow
      const workflowPreferences = response.body.data.filter((pref: any) => pref.level === 'template');
      expect(workflowPreferences).to.have.length(1);
      expect(workflowPreferences[0].workflow.severity).to.equal(SeverityLevelEnum.HIGH);
    });

    it('should return preferences filtered by multiple severity levels', async () => {
      // Create templates with different severities
      await session.createTemplate({
        noFeedId: true,
        severity: SeverityLevelEnum.HIGH,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'High severity notification',
          },
        ],
      });

      await session.createTemplate({
        noFeedId: true,
        severity: SeverityLevelEnum.MEDIUM,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'Medium severity notification',
          },
        ],
      });

      await session.createTemplate({
        noFeedId: true,
        severity: SeverityLevelEnum.LOW,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'Low severity notification',
          },
        ],
      });

      const response = await session.testAgent
        .get(`/v1/inbox/preferences?severity[]=${SeverityLevelEnum.HIGH}&severity[]=${SeverityLevelEnum.LOW}`)
        .set('Authorization', `Bearer ${session.subscriberToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.data).to.be.an('array');

      // Should include global preference and high + low severity workflows
      const workflowPreferences = response.body.data.filter((pref: any) => pref.level === 'template');
      expect(workflowPreferences).to.have.length(2);

      const severities = workflowPreferences.map((pref: any) => pref.workflow.severity);
      expect(severities).to.include(SeverityLevelEnum.HIGH);
      expect(severities).to.include(SeverityLevelEnum.LOW);
      expect(severities).to.not.include(SeverityLevelEnum.MEDIUM);
    });

    it('should return preferences filtered by none severity', async () => {
      // Create template without explicit severity (defaults to none)
      await session.createTemplate({
        noFeedId: true,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'Notification without explicit severity',
          },
        ],
      });

      await session.createTemplate({
        noFeedId: true,
        severity: SeverityLevelEnum.HIGH,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'High severity notification',
          },
        ],
      });

      const response = await session.testAgent
        .get(`/v1/inbox/preferences?severity[]=${SeverityLevelEnum.NONE}`)
        .set('Authorization', `Bearer ${session.subscriberToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.data).to.be.an('array');

      // Should include global preference and only the template without explicit severity
      const workflowPreferences = response.body.data.filter((pref: any) => pref.level === 'template');
      expect(workflowPreferences).to.have.length(1);
      expect(workflowPreferences[0].workflow.severity).to.equal(SeverityLevelEnum.NONE);
    });

    it('should return all preferences when no severity filter is applied', async () => {
      // Create templates with different severities
      await session.createTemplate({
        noFeedId: true,
        severity: SeverityLevelEnum.HIGH,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'High severity notification',
          },
        ],
      });

      await session.createTemplate({
        noFeedId: true,
        severity: SeverityLevelEnum.MEDIUM,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'Medium severity notification',
          },
        ],
      });

      const response = await session.testAgent
        .get('/v1/inbox/preferences')
        .set('Authorization', `Bearer ${session.subscriberToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.data).to.be.an('array');

      // Should include global preference and all workflow preferences
      const workflowPreferences = response.body.data.filter((pref: any) => pref.level === 'template');
      expect(workflowPreferences).to.have.length(2); // high and medium severity templates

      const severities = workflowPreferences.map((pref: any) => pref.workflow.severity);
      expect(severities).to.include(SeverityLevelEnum.HIGH);
      expect(severities).to.include(SeverityLevelEnum.MEDIUM);
    });

    it('should combine severity filter with tags filter', async () => {
      const tags = ['urgent', 'important'];

      // Create high severity template with tags
      await session.createTemplate({
        noFeedId: true,
        severity: SeverityLevelEnum.HIGH,
        tags,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'High severity urgent notification',
          },
        ],
      });

      // Create high severity template without tags
      await session.createTemplate({
        noFeedId: true,
        severity: SeverityLevelEnum.HIGH,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'High severity notification without tags',
          },
        ],
      });

      // Create medium severity template with tags
      await session.createTemplate({
        noFeedId: true,
        severity: SeverityLevelEnum.MEDIUM,
        tags,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'Medium severity urgent notification',
          },
        ],
      });

      const response = await session.testAgent
        .get(`/v1/inbox/preferences?severity[]=${SeverityLevelEnum.HIGH}&tags[]=${tags[0]}&tags[]=${tags[1]}`)
        .set('Authorization', `Bearer ${session.subscriberToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.data).to.be.an('array');

      // Should include global preference and only high severity template with tags
      const workflowPreferences = response.body.data.filter((pref: any) => pref.level === 'template');
      expect(workflowPreferences).to.have.length(1);
      expect(workflowPreferences[0].workflow.severity).to.equal(SeverityLevelEnum.HIGH);
      expect(workflowPreferences[0].workflow.tags).to.deep.equal(tags);
    });

    it('should return empty workflow preferences for non-existent severity', async () => {
      // Create only high severity template
      await session.createTemplate({
        noFeedId: true,
        severity: SeverityLevelEnum.HIGH,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'High severity notification',
          },
        ],
      });

      const response = await session.testAgent
        .get(`/v1/inbox/preferences?severity[]=${SeverityLevelEnum.LOW}`)
        .set('Authorization', `Bearer ${session.subscriberToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.data).to.be.an('array');

      // Should include only global preference, no workflow preferences
      const globalPreferences = response.body.data.filter((pref: any) => pref.level === 'global');
      const workflowPreferences = response.body.data.filter((pref: any) => pref.level === 'template');

      expect(globalPreferences).to.have.length(1);
      expect(workflowPreferences).to.have.length(0);
    });
  });
});
