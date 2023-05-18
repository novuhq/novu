import { expect } from 'chai';

import { UserSession } from '@novu/testing';
import { EmailBlockTypeEnum, StepTypeEnum, INotificationTemplate, FilterPartTypeEnum } from '@novu/shared';
import { NotificationTemplateRepository, EnvironmentRepository } from '@novu/dal';

import { CreateNotificationTemplateRequestDto } from '../../notification-template/dto';

describe('Create Notification template from blueprint - /blueprints/:templateId (POST)', async () => {
  let session: UserSession;
  const notificationTemplateRepository: NotificationTemplateRepository = new NotificationTemplateRepository();
  const environmentRepository: EnvironmentRepository = new EnvironmentRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should create template from blueprint', async function () {
    const prodEnv = await getProductionEnvironment();

    const { testTemplate, normalTemplate, prodVersionNotification, createdTemplate } =
      await createTemplateFromBlueprint({ session, notificationTemplateRepository, prodEnv });

    expect(createdTemplate.blueprintId).to.equal(prodVersionNotification._id);
    expect(testTemplate.name).to.equal(createdTemplate.name);

    let response = await session.testAgent.get(`/v1/blueprints/${prodVersionNotification._id}`).send();

    const fetchedTemplate = response.body.data;

    expect(fetchedTemplate.isBlueprint).to.equal(true);
    expect(testTemplate.name).to.equal(fetchedTemplate.name);
    expect(createdTemplate.blueprintId).to.equal(fetchedTemplate.id);

    response = await session.testAgent.get(`/v1/blueprints/${normalTemplate.data._id}`).send();

    expect(response.body.statusCode).to.equal(404);
  });

  async function getProductionEnvironment() {
    return await environmentRepository.findOne({
      _parentId: session.environment._id,
    });
  }
});

export async function createTemplateFromBlueprint({
  session,
  notificationTemplateRepository,
  prodEnv,
}: {
  session: UserSession;
  notificationTemplateRepository: NotificationTemplateRepository;
  prodEnv;
}) {
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

  if (!prodEnv) throw new Error('production environment was not found');

  const prodVersionNotification = await notificationTemplateRepository.findOne({
    _environmentId: prodEnv._id,
    _parentId: template._id,
  });

  if (!prodVersionNotification) throw new Error('production environment notification was not found');

  const { body: data } = await session.testAgent.post(`/v1/blueprints/${prodVersionNotification._id}`).send();

  return { testTemplate, normalTemplate, prodVersionNotification, createdTemplate: data.data };
}
