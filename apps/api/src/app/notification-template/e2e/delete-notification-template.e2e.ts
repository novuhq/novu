import { expect } from 'chai';
import { UserSession, NotificationTemplateService } from '@novu/testing';
import { INotificationTemplate } from '@novu/shared';
import { NotificationTemplateRepository } from '@novu/dal';

describe('Delete notification template by id - /notification-templates/:templateId (DELETE)', async () => {
  let session: UserSession;
  const notificationTemplateRepository = new NotificationTemplateRepository();

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

    await session.testAgent.delete(`/v1/notification-templates/${template._id}`).send();

    const isDeleted = !(await notificationTemplateRepository.findOne({ _id: template._id }));

    expect(isDeleted).to.equal(true);

    const deletedIntegration = (await notificationTemplateRepository.findDeleted({ _id: template._id }))[0];

    expect(deletedIntegration.deleted).to.equal(true);
  });

  it('should not display on listing notification templates', async function () {
    const notificationTemplateService = new NotificationTemplateService(
      session.user._id,
      session.organization._id,
      session.environment._id
    );

    const template1 = await notificationTemplateService.createTemplate();
    await notificationTemplateService.createTemplate();
    await notificationTemplateService.createTemplate();

    const { body: templates } = await session.testAgent.get(`/v1/notification-templates`);
    expect(templates.data.length).to.equal(3);

    await session.testAgent.delete(`/v1/notification-templates/${template1._id}`).send();

    const { body: templatesAfterDelete } = await session.testAgent.get(`/v1/notification-templates`);
    expect(templatesAfterDelete.data.length).to.equal(2);
  });

  it('should fail for non-existing notification template', async function () {
    const dummyId = '5f6651112efc19f33b34fc39';
    const response = await session.testAgent.delete(`/v1/notification-templates/${dummyId}`).send();

    expect(response.body.message).to.contains('Could not find notification template with id');
  });
});
