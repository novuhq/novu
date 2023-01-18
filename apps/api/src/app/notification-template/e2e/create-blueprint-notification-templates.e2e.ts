import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { EmailBlockTypeEnum, StepTypeEnum, INotificationTemplate, FilterPartTypeEnum } from '@novu/shared';
import { NotificationTemplateRepository, EnvironmentRepository } from '@novu/dal';

import { CreateNotificationTemplateRequestDto } from '../dto';

describe('Create Notification template from blueprint - /notification-templates/:templateId/blueprint (POST)', async () => {
  let session: UserSession;
  const notificationTemplateRepository: NotificationTemplateRepository = new NotificationTemplateRepository();
  const environmentRepository: EnvironmentRepository = new EnvironmentRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should create template from blueprint', async function () {
    const testTemplate: Partial<CreateNotificationTemplateRequestDto> = {
      name: 'test email template',
      description: 'This is a test description',
      tags: ['test-tag'],
      notificationGroupId: session.notificationGroups[0]._id,
      steps: [
        {
          template: {
            name: 'Message Name',
            subject: 'Test email subject',
            preheader: 'Test email preheader',
            content: [{ type: EmailBlockTypeEnum.TEXT, content: 'This is a sample text block' }],
            type: StepTypeEnum.EMAIL,
          },
          filters: [
            {
              isNegated: false,
              type: 'GROUP',
              value: 'AND',
              children: [
                {
                  on: FilterPartTypeEnum.SUBSCRIBER,
                  field: 'firstName',
                  value: 'test value',
                  operator: 'EQUAL',
                },
              ],
            },
          ],
        },
      ],
    };

    const { body: normalTemplate } = await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);

    process.env.BLUEPRINT_CREATOR = session.organization._id;

    const { body } = await session.testAgent.post(`/v1/notification-templates`).send(testTemplate);

    expect(body.data).to.be.ok;
    const template: INotificationTemplate = body.data;

    await session.applyChanges({
      enabled: false,
    });

    const prodEnv = await getProductionEnvironment();

    const prodVersionNotification = await notificationTemplateRepository.findOne({
      _environmentId: prodEnv._id,
      _parentId: template._id,
    });

    const { body: data } = await session.testAgent
      .post(`/v1/notification-templates/${prodVersionNotification._id}/blueprint`)
      .send();

    expect(data.data.blueprintId).to.equal(prodVersionNotification._id);
    expect(testTemplate.name).to.equal(data.data.name);

    let response = await session.testAgent
      .get(`/v1/notification-templates/${prodVersionNotification._id}/blueprint`)
      .send();

    const fetchedTemplate = response.body.data;

    expect(fetchedTemplate.isBlueprint).to.equal(true);
    expect(testTemplate.name).to.equal(fetchedTemplate.name);
    expect(data.data.blueprintId).to.equal(fetchedTemplate.id);

    response = await session.testAgent.get(`/v1/notification-templates/${normalTemplate.data._id}/blueprint`).send();

    expect(response.body.statusCode).to.equal(404);
  });

  async function getProductionEnvironment() {
    return await environmentRepository.findOne({
      _parentId: session.environment._id,
    });
  }
});
