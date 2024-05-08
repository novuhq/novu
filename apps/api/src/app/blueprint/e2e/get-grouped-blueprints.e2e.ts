import { expect } from 'chai';
import * as sinon from 'sinon';

import { UserSession } from '@novu/testing';
import { NotificationTemplateRepository, EnvironmentRepository, EnvironmentEntity } from '@novu/dal';
import {
  EmailBlockTypeEnum,
  FieldLogicalOperatorEnum,
  FieldOperatorEnum,
  FilterPartTypeEnum,
  INotificationTemplate,
  INotificationTemplateStep,
  StepTypeEnum,
} from '@novu/shared';
import {
  buildGroupedBlueprintsKey,
  CacheInMemoryProviderService,
  CacheService,
  InvalidateCacheService,
} from '@novu/application-generic';

import { GroupedBlueprintResponse } from '../dto/grouped-blueprint.response.dto';
import { CreateWorkflowRequestDto } from '../../workflows/dto';
import { GetGroupedBlueprints, POPULAR_TEMPLATES_ID_LIST } from '../usecases/get-grouped-blueprints';
import * as blueprintStaticModule from '../usecases/get-grouped-blueprints/consts';

describe('Get grouped notification template blueprints - /blueprints/group-by-category (GET)', async () => {
  let session: UserSession;
  const notificationTemplateRepository: NotificationTemplateRepository = new NotificationTemplateRepository();
  const environmentRepository: EnvironmentRepository = new EnvironmentRepository();

  let invalidateCache: InvalidateCacheService;
  let getGroupedBlueprints: GetGroupedBlueprints;
  let indexModuleStub: sinon.SinonStub;

  before(async () => {
    const cacheInMemoryProviderService = new CacheInMemoryProviderService();
    const cacheService = new CacheService(cacheInMemoryProviderService);
    await cacheService.initialize();
    invalidateCache = new InvalidateCacheService(cacheService);

    session = new UserSession();
    await session.initialize();

    getGroupedBlueprints = new GetGroupedBlueprints(new NotificationTemplateRepository());
    indexModuleStub = sinon.stub(blueprintStaticModule, 'POPULAR_TEMPLATES_ID_LIST');
  });

  afterEach(() => {
    indexModuleStub.restore();
  });

  it('should get the grouped blueprints', async function () {
    const prodEnv = await getProductionEnvironment();
    if (!prodEnv) throw new Error('production environment was not found');

    await createTemplateFromBlueprint({ session, notificationTemplateRepository, prodEnv });

    const data = await session.testAgent.get(`/v1/blueprints/group-by-category`).send();

    expect(data.statusCode).to.equal(200);

    const groupedBlueprints = (data.body.data as GroupedBlueprintResponse).general;

    expect(groupedBlueprints[0]?.name).to.equal('General');

    for (const group of groupedBlueprints) {
      for (const blueprint of group.blueprints) {
        expect(blueprint.isBlueprint).to.equal(true);
        expect(blueprint.name).to.equal('test email template');
        expect(blueprint.description).to.equal('This is a test description');
        expect(blueprint.active).to.equal(false);
        expect(blueprint.critical).to.equal(false);
        expect(blueprint.steps).to.be.exist;
        const step: INotificationTemplateStep = blueprint.steps[0] as INotificationTemplateStep;
        expect(step.active).to.equal(true);
        expect(step.template).to.exist;
        expect(step.template?.name).to.be.equal('Message Name');
        expect(step.template?.subject).to.be.equal('Test email subject');
      }
    }
  });

  it('should get the updated grouped blueprints (after invalidation)', async function () {
    const prodEnv = await getProductionEnvironment();
    if (!prodEnv) throw new Error('production environment was not found');

    await createTemplateFromBlueprint({
      session,
      notificationTemplateRepository,
      prodEnv,
    });

    const data = await session.testAgent.get(`/v1/blueprints/group-by-category`).send();

    expect(data.statusCode).to.equal(200);

    const groupedBlueprints = (data.body.data as GroupedBlueprintResponse).general;

    expect(groupedBlueprints.length).to.equal(1);
    expect(groupedBlueprints[0].name).to.equal('General');

    const categoryName = 'Life Style';
    await updateBlueprintCategory({ categoryName });

    let updatedGroupedBluePrints = await session.testAgent.get(`/v1/blueprints/group-by-category`).send();

    updatedGroupedBluePrints = (updatedGroupedBluePrints.body.data as GroupedBlueprintResponse).general;

    expect(updatedGroupedBluePrints.length).to.equal(2);
    expect(updatedGroupedBluePrints[0].name).to.equal('General');
    expect(updatedGroupedBluePrints[1].name).to.equal(categoryName);
  });

  it('should update the static POPULAR_TEMPLATES_GROUPED with fresh data', async () => {
    const prodEnv = await getProductionEnvironment();
    if (!prodEnv) throw new Error('production environment was not found');

    await createTemplateFromBlueprint({ session, notificationTemplateRepository, prodEnv });

    const data = await session.testAgent.get(`/v1/blueprints/group-by-category`).send();

    const groupedPopularBlueprints = data.body.data as GroupedBlueprintResponse;

    const blueprintFromDb = groupedPopularBlueprints.general[0].blueprints[0];

    // switch id from db store - to mock blueprint id
    const storeBlueprintTemplateId = blueprintFromDb._id?.toString();
    const mockedValue = POPULAR_TEMPLATES_ID_LIST;
    mockedValue[0] = storeBlueprintTemplateId || '';

    indexModuleStub.value(mockedValue);

    await invalidateCache.invalidateByKey({
      key: buildGroupedBlueprintsKey(prodEnv._id),
    });

    const updatedBlueprintFromDb = (await session.testAgent.get(`/v1/blueprints/group-by-category`).send()).body.data
      .popular.blueprints[0] as INotificationTemplate;

    expect(updatedBlueprintFromDb).to.deep.equal(blueprintFromDb);
  });

  async function updateBlueprintCategory({ categoryName }: { categoryName: string }) {
    const { body: notificationGroupsResult } = await session.testAgent
      .post(`/v1/notification-groups`)
      .send({ name: categoryName });

    await session.testAgent
      .post(`/v1/workflows`)
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
  prodEnv: EnvironmentEntity;
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
