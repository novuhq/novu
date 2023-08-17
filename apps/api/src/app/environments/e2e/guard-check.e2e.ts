import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { NotificationTemplateRepository } from '@novu/dal';

import { CreateWorkflowRequestDto } from '../../workflows/dto/create-workflow.request.dto';

describe('Environment - Check Root Environment Guard', async () => {
  let session: UserSession;
  const notificationTemplateRepository: NotificationTemplateRepository = new NotificationTemplateRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should not allow create when not in development environment', async () => {
    const testTemplate: Partial<CreateWorkflowRequestDto> = {
      name: 'test template',
      description: 'This is a test description',
      notificationGroupId: session.notificationGroups[0]._id,
      steps: [],
    };

    const { body: envsBody } = await session.testAgent.get('/v1/environments');
    const envs = envsBody.data;

    const devEnvironment = envs.find((i) => i.name === 'Development');
    await session.switchEnvironment(devEnvironment._id);
    const { body: devBody } = await session.testAgent.post(`/v1/workflows`).send(testTemplate);
    expect(devBody.data).to.be.ok;

    const prodEnvironment = envs.find((i) => !!i._parentId);
    await session.switchEnvironment(prodEnvironment._id);
    const { body: prodBody } = await session.testAgent.post(`/v1/workflows`).send(testTemplate);
    expect(prodBody.message).to.contain('This action is only allowed in Development');
    expect(prodBody.statusCode).to.eq(401);

    const allCreatedNotifications = await notificationTemplateRepository.find({
      _organizationId: session.organization._id,
    });

    expect(allCreatedNotifications.length).to.eq(1);
  });
});
