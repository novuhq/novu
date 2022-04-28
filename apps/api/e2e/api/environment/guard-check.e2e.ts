import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { NotificationTemplateRepository } from '@novu/dal';
import { CreateNotificationTemplateDto } from '../../../src/app/notification-template/dto/create-notification-template.dto';

describe('Environment - Check Root Environment Guard', async () => {
  let session: UserSession;
  const notificationTemplateRepository: NotificationTemplateRepository = new NotificationTemplateRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should not allow create when not in development environment', async () => {
    const testTemplate: Partial<CreateNotificationTemplateDto> = {
      name: 'test template',
      description: 'This is a test description',
      notificationGroupId: session.notificationGroups[0]._id,
      steps: [],
    };

    const { body: envsBody } = await session.testAgent.get('/v1/environments');

    const envs = envsBody.data;

    for (const env of envs) {
      await session.switchEnvironment(env._id);
      const { body } = await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);
      if (env._parentId) {
        expect(body.message).to.contain('This action is only allowed in Develo');
        expect(body.statusCode).to.eq(401);
      } else {
        expect(body.data).to.be.ok;
      }
    }

    const allCreatedNotifications = await notificationTemplateRepository.find({
      _organizationId: session.organization._id,
    });

    expect(allCreatedNotifications.length).to.eq(1);
  });
});
