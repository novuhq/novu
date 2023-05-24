import { expect } from 'chai';

import { UserSession } from '@novu/testing';
import { NotificationTemplateRepository, EnvironmentRepository } from '@novu/dal';
import { GroupedBlueprintResponse } from '../dto/grouped-blueprint.response.dto';
import { CreateNotificationTemplateRequestDto } from '../../notification-template/dto';
import { EmailBlockTypeEnum, FilterPartTypeEnum, StepTypeEnum } from '@novu/shared';

describe('Get grouped notification template blueprints - /blueprints/group-by-category (GET)', async () => {
  let session: UserSession;
  const notificationTemplateRepository: NotificationTemplateRepository = new NotificationTemplateRepository();
  const environmentRepository: EnvironmentRepository = new EnvironmentRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should get the grouped blueprints', async function () {
    const prodEnv = await getProductionEnvironment();

    await createTemplateFromBlueprint({ session, notificationTemplateRepository, prodEnv });

    const data = await session.testAgent.get(`/v1/blueprints/group-by-category`).send();

    expect(data.statusCode).to.equal(200);

    const groupedBlueprints = data.body.data as GroupedBlueprintResponse[];

    expect(groupedBlueprints[0].name).to.equal('General');

    for (const grouped of groupedBlueprints) {
      for (const blueprint of grouped.blueprints) {
        expect(blueprint.isBlueprint).to.equal(true);
        expect(blueprint.name).to.equal('test email template');
        expect(blueprint.description).to.equal('This is a test description');
        expect(blueprint.active).to.equal(false);
        expect(blueprint.critical).to.equal(false);
        expect(blueprint.steps).to.be.exist;
        expect(blueprint.steps[0].active).to.equal(true);
        expect(blueprint.steps[0].template).to.exist;
        expect(blueprint.steps[0].template?.name).to.be.equal('Message Name');
        expect(blueprint.steps[0].template?.subject).to.be.equal('Test email subject');
      }
    }
  });

  it('should get the updated grouped blueprints (after invalidation)', async function () {
    const prodEnv = await getProductionEnvironment();

    await createTemplateFromBlueprint({
      session,
      notificationTemplateRepository,
      prodEnv,
    });

    const data = await session.testAgent.get(`/v1/blueprints/group-by-category`).send();

    expect(data.statusCode).to.equal(200);

    const groupedBlueprints = data.body.data as GroupedBlueprintResponse[];

    expect(groupedBlueprints.length).to.equal(1);
    expect(groupedBlueprints[0].name).to.equal('General');

    const categoryName = 'Life Style';
    await updateBlueprintCategory({ categoryName });

    let updatedGroupedBluePrints = await session.testAgent.get(`/v1/blueprints/group-by-category`).send();

    updatedGroupedBluePrints = updatedGroupedBluePrints.body.data as GroupedBlueprintResponse[];

    expect(updatedGroupedBluePrints.length).to.equal(2);
    expect(updatedGroupedBluePrints[0].name).to.equal('General');
    expect(updatedGroupedBluePrints[1].name).to.equal(categoryName);
  });

  async function updateBlueprintCategory({ categoryName }: { categoryName: string }) {
    const { body: notificationGroupsResult } = await session.testAgent
      .post(`/v1/notification-groups`)
      .send({ name: categoryName });

    await session.testAgent
      .post(`/v1/notification-templates`)
      .send({ notificationGroupId: notificationGroupsResult.data._id, name: 'test email template', steps: [] });

    await session.applyChanges({
      enabled: false,
    });
  }

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
  const testTemplateRequestDto: Partial<CreateNotificationTemplateRequestDto> = {
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

  const testTemplate = (await session.testAgent.post(`/v1/notification-templates`).send(testTemplateRequestDto)).body
    .data;

  process.env.BLUEPRINT_CREATOR = session.organization._id;

  const testEnvBlueprintTemplate = (
    await session.testAgent.post(`/v1/notification-templates`).send(testTemplateRequestDto)
  ).body.data;

  expect(testEnvBlueprintTemplate).to.be.ok;

  await session.applyChanges({
    enabled: false,
  });

  if (!prodEnv) throw new Error('production environment was not found');

  const blueprintId = (
    await notificationTemplateRepository.findOne({
      _environmentId: prodEnv._id,
      _parentId: testEnvBlueprintTemplate._id,
    })
  )?._id;

  if (!blueprintId) throw new Error('blueprintId was not found');

  const blueprint = (await session.testAgent.get(`/v1/blueprints/${blueprintId}`).send()).body.data;

  blueprint.notificationGroupId = blueprint._notificationGroupId;
  blueprint.blueprintId = blueprint._id;

  const createdTemplate = (await session.testAgent.post(`/v1/notification-templates`).send({ ...blueprint })).body.data;

  return {
    testTemplateRequestDto,
    testTemplate,
    blueprintId,
    createdTemplate,
  };
}
