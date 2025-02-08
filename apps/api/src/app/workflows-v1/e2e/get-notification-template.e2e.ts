import { expect } from 'chai';
import { NotificationTemplateService, UserSession } from '@novu/testing';
import { ChannelCTATypeEnum, INotificationTemplate, INotificationTemplateStep, StepTypeEnum } from '@novu/shared';
import { PreferencesRepository } from '@novu/dal';
import { CreateWorkflowRequestDto } from '../dto';

describe('Get workflow by id - /workflows/:workflowId (GET) #novu-v1', async () => {
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

  it('should return the workflow preference settings when the V2 Preferences do not exist', async () => {
    const testTemplate = {
      name: 'test template',
      description: 'This is a test description',
      notificationGroupId: session.notificationGroups[0]._id,
      steps: [
        {
          template: {
            name: 'Message Name',
            content: 'Test Template',
            type: StepTypeEnum.IN_APP,
            cta: {
              type: ChannelCTATypeEnum.REDIRECT,
              data: {
                url: 'https://example.org/profile',
              },
            },
          },
        },
      ],
      preferenceSettings: {
        in_app: true,
        sms: true,
        push: true,
        chat: true,
        email: false,
      },
      tags: [],
    } satisfies CreateWorkflowRequestDto;
    const { body: postWorkflowResponse } = await session.testAgent.post(`/v1/workflows`).send(testTemplate);

    const preferenceRepository = new PreferencesRepository();

    await preferenceRepository.delete({
      _environmentId: session.environment._id,
      _templateId: postWorkflowResponse.data._id,
    });

    const { body: getWorkflowResponse } = await session.testAgent.get(`/v1/workflows/${postWorkflowResponse.data._id}`);

    expect(getWorkflowResponse.data).to.be.ok;

    const template: INotificationTemplate = getWorkflowResponse.data;

    expect(template.preferenceSettings).to.deep.equal(testTemplate.preferenceSettings);
  });
});
