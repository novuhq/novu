import { expect } from 'chai';
import { NotificationTemplateEntity } from '@notifire/dal';
import { UserSession, NotificationTemplateService } from '@notifire/testing';

describe('Get Notification templates - /notification-templates (GET)', async () => {
  let session: UserSession;
  const templates: NotificationTemplateEntity[] = [];

  before(async () => {
    session = new UserSession();
    await session.initialize();

    const notificationTemplateService = new NotificationTemplateService(
      session.user._id,
      session.organization._id,
      session.application._id
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
});
