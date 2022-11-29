import { expect } from 'chai';
import { NotificationTemplateEntity } from '@novu/dal';
import { UserSession, NotificationTemplateService } from '@novu/testing';

describe('Get Notification templates - /notification-templates (GET)', async () => {
  let session: UserSession;
  const templates: NotificationTemplateEntity[] = [];
  let notificationTemplateService: NotificationTemplateService;

  before(async () => {
    session = new UserSession();
    await session.initialize();

    notificationTemplateService = new NotificationTemplateService(
      session.user._id,
      session.organization._id,
      session.environment._id
    );

    templates.push(await notificationTemplateService.createTemplate());
    templates.push(await notificationTemplateService.createTemplate());
    templates.push(await notificationTemplateService.createTemplate());
  });

  it('should return all templates for organization', async () => {
    const { body } = await session.testAgent.get(`/v1/notification-templates`);

    expect(body.data.length).to.equal(3);

    const found = body.data.find((i) => templates[0]._id === i._id);

    expect(found).to.be.ok;
    expect(found.name).to.equal(templates[0].name);
    expect(found.notificationGroup.name).to.equal('General');
  });

  it('should return all templates as per pagination', async () => {
    templates.push(await notificationTemplateService.createTemplate());
    templates.push(await notificationTemplateService.createTemplate());
    templates.push(await notificationTemplateService.createTemplate());

    const { body: page0Limit2Results } = await session.testAgent.get(`/v1/notification-templates?page=0&limit=2`);

    expect(page0Limit2Results.data.length).to.equal(2);
    expect(page0Limit2Results.totalCount).to.equal(6);
    expect(page0Limit2Results.page).to.equal(0);
    expect(page0Limit2Results.pageSize).to.equal(2);
    expect(page0Limit2Results.data[0]._id).to.equal(templates[5]._id);

    const { body: page1Limit3Results } = await session.testAgent.get(`/v1/notification-templates?page=1&limit=3`);

    expect(page1Limit3Results.data.length).to.equal(3);
    expect(page1Limit3Results.totalCount).to.equal(6);
    expect(page1Limit3Results.page).to.equal(1);
    expect(page1Limit3Results.pageSize).to.equal(3);
    expect(page1Limit3Results.data[2]._id).to.equal(templates[0]._id);
  });
});
