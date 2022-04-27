import { expect } from 'chai';
import { UserSession, NotificationTemplateService } from '@novu/testing';
import { INotificationTemplate } from '@novu/shared';

describe('Delete notification template by id - /notification-templates/:templateId (DELETE)', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should delete the notification template', async function () {
    const notificationTemplateService = new NotificationTemplateService(
      session.user._id,
      session.organization._id,
      session.environment._id
    );
    const template = await notificationTemplateService.createTemplate();

    expect(template.isDeleted).to.equal(false);

    const { body } = await session.testAgent.delete(`/v1/notification-templates/${template._id}`).send();
    const foundTemplate: INotificationTemplate = body.data;

    expect(foundTemplate._id).to.equal(template._id);
    expect(foundTemplate.isDeleted).to.equal(true);
  });

  it('should not display on listing notification templates', async function () {
    const notificationTemplateService = new NotificationTemplateService(
      session.user._id,
      session.organization._id,
      session.environment._id
    );

    const template1 = await notificationTemplateService.createTemplate();
    const template2 = await notificationTemplateService.createTemplate();
    const template3 = await notificationTemplateService.createTemplate();

    const { body: templates } = await session.testAgent.get(`/v1/notification-templates`);
    expect(templates.data.length).to.equal(3);

    const { body } = await session.testAgent.delete(`/v1/notification-templates/${template1._id}`).send();
    const foundTemplate: INotificationTemplate = body.data;

    expect(foundTemplate._id).to.equal(template1._id);
    expect(foundTemplate.isDeleted).to.equal(true);

    const { body: templatesAfterDelete } = await session.testAgent.get(`/v1/notification-templates`);
    expect(templatesAfterDelete.data.length).to.equal(2);
  });
});
