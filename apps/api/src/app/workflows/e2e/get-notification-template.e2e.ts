import { expect } from 'chai';
import { NotificationTemplateService, UserSession } from '@novu/testing';
import { INotificationTemplate, INotificationTemplateStep } from '@novu/shared';

describe('Get workflow by id - /workflows/:workflowId (GET)', async () => {
  let session: UserSession;

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should return the workflow by its id', async function () {
    const notificationTemplateService = new NotificationTemplateService(
      session.user._id,
      session.organization._id,
      session.environment._id
    );
    const template = await notificationTemplateService.createTemplate();
    const { body } = await session.testAgent.get(`/v1/workflows/${template._id}`);

    const foundTemplate: INotificationTemplate = body.data;

    expect(foundTemplate._id).to.equal(template._id);
    expect(foundTemplate.name).to.equal(template.name);
    expect(foundTemplate.steps.length).to.equal(template.steps.length);
    const step = foundTemplate.steps[0] as INotificationTemplateStep;
    expect(step.template).to.be.ok;
    expect(step.template?.content).to.equal(template.steps[0].template?.content);
    expect(step._templateId).to.be.ok;
    expect(foundTemplate.triggers.length).to.equal(template.triggers.length);
  });
});
