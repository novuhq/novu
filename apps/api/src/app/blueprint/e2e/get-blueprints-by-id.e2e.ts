import { expect } from 'chai';

import { UserSession } from '@novu/testing';
import { NotificationTemplateRepository, EnvironmentRepository } from '@novu/dal';
import {
  EmailBlockTypeEnum,
  FieldLogicalOperatorEnum,
  FieldOperatorEnum,
  FilterPartTypeEnum,
  INotificationTemplateStep,
  StepTypeEnum,
} from '@novu/shared';

import { GroupedBlueprintResponse } from '../dto/grouped-blueprint.response.dto';
import { CreateWorkflowRequestDto } from '../../workflows/dto';

describe('Get blueprints by id - /blueprints/:templateId (GET)', async () => {
  let session: UserSession;
  const notificationTemplateRepository: NotificationTemplateRepository = new NotificationTemplateRepository();
  const environmentRepository: EnvironmentRepository = new EnvironmentRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  afterEach(() => {});

  it('should get the blueprint by id', async function () {
    const prodEnv = await getProductionEnvironment();

    await createTemplateFromBlueprint({ session, notificationTemplateRepository, prodEnv });

    const allBlueprints = await session.testAgent.get(`/v1/blueprints/group-by-category`).send();

    const blueprint = (allBlueprints.body.data as GroupedBlueprintResponse).general[0].blueprints[0];

    const blueprintById = (await session.testAgent.get(`/v1/blueprints/${blueprint._id}`).send()).body.data;

    //validate that fetched blueprint by id is the same as from the initial allBlueprints fetch
    expect(blueprintById.isBlueprint).to.equal(true);
    expect(blueprint.name).to.equal(blueprintById.name);
    expect(blueprint.description).to.equal(blueprintById.description);
    expect(blueprint.active).to.equal(blueprintById.active);
    expect(blueprint.critical).to.equal(blueprintById.critical);
    expect(blueprintById.steps).to.be.exist;
    expect((blueprint.steps[0] as INotificationTemplateStep).active).to.equal(blueprintById.steps[0].active);
    expect(blueprintById.steps[0].template).to.exist;
    expect((blueprint.steps[0] as INotificationTemplateStep).template?.name).to.be.equal(
      blueprintById.steps[0].template?.name
    );
    expect((blueprint.steps[0] as INotificationTemplateStep).template?.subject).to.be.equal(
      blueprintById.steps[0].template?.subject
    );
  });

  it('should get the blueprint by trigger identifier', async function () {
    const prodEnv = await getProductionEnvironment();

    await createTemplateFromBlueprint({ session, notificationTemplateRepository, prodEnv });

    const allBlueprints = await session.testAgent.get(`/v1/blueprints/group-by-category`).send();

    const blueprint = (allBlueprints.body.data as GroupedBlueprintResponse).general[0].blueprints[0];

    const blueprintById = (await session.testAgent.get(`/v1/blueprints/${blueprint.triggers[0].identifier}`).send())
      .body.data;

    const test = await session.testAgent.get(`/v1/blueprints/${blueprint.triggers[0].identifier}`).send();

    //validate that fetched blueprint by trigger identifier is the same as from the initial allBlueprints fetch
    expect(blueprintById.isBlueprint).to.equal(true);
    expect(blueprint.name).to.equal(blueprintById.name);
    expect(blueprint.description).to.equal(blueprintById.description);
    expect(blueprint.active).to.equal(blueprintById.active);
    expect(blueprint.critical).to.equal(blueprintById.critical);
    expect(blueprintById.steps).to.be.exist;
    expect((blueprint.steps[0] as INotificationTemplateStep).active).to.equal(blueprintById.steps[0].active);
    expect(blueprintById.steps[0].template).to.exist;
    expect((blueprint.steps[0] as INotificationTemplateStep).template?.name).to.be.equal(
      blueprintById.steps[0].template?.name
    );
    expect((blueprint.steps[0] as INotificationTemplateStep).template?.subject).to.be.equal(
      blueprintById.steps[0].template?.subject
    );
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
  const testTemplateRequestDto: Partial<CreateWorkflowRequestDto> = {
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
            value: FieldLogicalOperatorEnum.AND,
            children: [
              {
                on: FilterPartTypeEnum.SUBSCRIBER,
                field: 'firstName',
                value: 'test value',
                operator: FieldOperatorEnum.EQUAL,
              },
            ],
          },
        ],
      },
    ],
  };

  const testTemplate = (await session.testAgent.post(`/v1/workflows`).send(testTemplateRequestDto)).body.data;

  process.env.BLUEPRINT_CREATOR = session.organization._id;

  const testEnvBlueprintTemplate = (await session.testAgent.post(`/v1/workflows`).send(testTemplateRequestDto)).body
    .data;

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

  const createdTemplate = (await session.testAgent.post(`/v1/workflows`).send({ ...blueprint })).body.data;

  return {
    testTemplateRequestDto,
    testTemplate,
    blueprintId,
    createdTemplate,
  };
}
