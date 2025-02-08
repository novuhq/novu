import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { randomBytes } from 'crypto';
import {
  createWorkflowClient,
  CreateWorkflowDto,
  DEFAULT_WORKFLOW_PREFERENCES,
  isStepUpdateBody,
  JSONSchemaDefinition,
  JSONSchemaDto,
  ListWorkflowResponse,
  PatchStepDataDto,
  PreferencesRequestDto,
  ShortIsPrefixEnum,
  slugify,
  StepContentIssueEnum,
  StepCreateDto,
  StepTypeEnum,
  StepUpdateDto,
  UpdateStepBody,
  UpdateWorkflowDto,
  UpsertStepBody,
  UpsertWorkflowBody,
  WorkflowCommonsFields,
  WorkflowCreationSourceEnum,
  WorkflowListResponseDto,
  WorkflowOriginEnum,
  WorkflowResponseDto,
  WorkflowStatusEnum,
} from '@novu/shared';
import { PreferencesRepository } from '@novu/dal';
import { after } from 'mocha';
import { sleep } from '@nestjs/terminus/dist/utils';
import { encodeBase62 } from '../shared/helpers';
import { stepTypeToControlSchema } from './shared';

const v2Prefix = '/v2';
const PARTIAL_UPDATED_NAME = 'Updated';
const TEST_WORKFLOW_UPDATED_NAME = `${PARTIAL_UPDATED_NAME} Workflow Name`;
const TEST_WORKFLOW_NAME = 'Test Workflow Name';

const TEST_TAGS = ['test'];
let session: UserSession;

function getHeaders(overrideEnv?: string): HeadersInit {
  return {
    Authorization: session.token,
    'Novu-Environment-Id': overrideEnv || session.environment._id,
  };
}

describe('Workflow Controller E2E API Testing #novu-v2', () => {
  let workflowsClient: ReturnType<typeof createWorkflowClient>;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    workflowsClient = createWorkflowClient(session.serverUrl, getHeaders());
  });
  after(async () => {
    await sleep(1000);
  });

  it('Smoke Testing', async () => {
    const workflowCreated = await createWorkflowAndValidate();
    await getWorkflowAndValidate(workflowCreated);
    const updateRequest = buildUpdateRequest(workflowCreated);
    await updateWorkflowAndValidate(workflowCreated._id, workflowCreated.updatedAt, updateRequest);
    await updateWorkflowAndValidate(workflowCreated._id, workflowCreated.updatedAt, {
      ...updateRequest,
      description: 'Updated Description',
    });
    await getAllAndValidate({ searchQuery: PARTIAL_UPDATED_NAME, expectedTotalResults: 1, expectedArraySize: 1 });
    await deleteWorkflowAndValidateDeletion(workflowCreated._id);
  });

  describe('Error Handling', () => {
    describe('Should show status ok when no problems', () => {
      it('should show status ok when no problems', async () => {
        const workflowCreated = await createWorkflowAndValidate();
        await getWorkflowAndValidate(workflowCreated);
      });
    });

    describe('Workflow Body Issues', () => {
      it('should respond with 400 when name is empty', async () => {
        const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto('nameSuffix', {
          name: '',
        });

        const res = await workflowsClient.createWorkflow(createWorkflowDto);
        expect(res.isSuccessResult()).to.be.false;
        expect(res.error?.responseText).to.include('name must be longer than or equal to 1 characters');
      });

      it('should respond with 400 when name is too long', async () => {
        const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto('nameSuffix', {
          name: Array.from({ length: 80 }).join('X'),
        });

        const res = await workflowsClient.createWorkflow(createWorkflowDto);
        expect(res.isSuccessResult()).to.be.false;
        expect(res.error?.responseText).to.include('name must be shorter than or equal to 64 characters');
      });

      it('should respond with 400 when description is too long', async () => {
        const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto('nameSuffix', {
          description: Array.from({ length: 260 }).join('X'),
        });

        const res = await workflowsClient.createWorkflow(createWorkflowDto);
        expect(res.isSuccessResult()).to.be.false;
        expect(res.error?.responseText).to.include('description must be shorter than or equal to 256 characters');
      });
      it('should respond with 400 when description is too long on an update call', async () => {
        const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto('nameSuffix');

        const res = await workflowsClient.createWorkflow(createWorkflowDto);
        expect(res.isSuccessResult()).to.be.true;
        if (res.isSuccessResult()) {
          const updateWorkflowDto = {
            ...buildUpdateRequest(res.value),
            description: Array.from({ length: 260 }).join('X'),
          };
          const updateResult = await workflowsClient.updateWorkflow(res.value?._id, updateWorkflowDto);
          expect(updateResult.isSuccessResult(), JSON.stringify(updateResult.value)).to.be.false;
          if (!updateResult.isSuccessResult()) {
            expect(updateResult.error?.responseText).to.include(
              'description must be shorter than or equal to 256 characters'
            );
          }
        }
      });

      it('should respond with 400 when a tag is too long', async () => {
        const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto('nameSuffix', {
          tags: ['tag1', Array.from({ length: 50 }).join('X')],
        });

        const res = await workflowsClient.createWorkflow(createWorkflowDto);
        expect(res.isSuccessResult()).to.be.false;
        expect(res.error?.responseText).to.include(
          'each value in tags must be longer than or equal to 1 and shorter than or equal to 32 characters'
        );
      });

      it('should respond with 400 when a tag is empty', async () => {
        const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto('nameSuffix', {
          tags: ['tag1', ''],
        });

        const res = await workflowsClient.createWorkflow(createWorkflowDto);
        expect(res.isSuccessResult()).to.be.false;
        expect(res.error?.responseText).to.include(
          'each value in tags must be longer than or equal to 1 and shorter than or equal to 32 characters'
        );
      });

      it('should respond with 400 when a duplicate tag is provided', async () => {
        const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto('nameSuffix', {
          tags: ['tag1', 'tag1'],
        });

        const res = await workflowsClient.createWorkflow(createWorkflowDto);
        expect(res.isSuccessResult()).to.be.false;
        expect(res.error?.responseText).to.include("All tags's elements must be unique");
      });

      it('should respond with 400 when more than 16 tags are provided', async () => {
        const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto('nameSuffix', {
          tags: Array.from({ length: 17 }).map((_, index) => `tag${index}`),
        });

        const res = await workflowsClient.createWorkflow(createWorkflowDto);
        expect(res.isSuccessResult()).to.be.false;
        expect(res.error?.responseText).to.include('tags must contain no more than 16 elements');
      });
    });

    describe('Workflow Step Body Issues', () => {
      it('should throw 400 on name missing', async () => {
        // @ts-ignore
        const overrideDto = { steps: [{ ...buildEmailStep(), name: undefined } as unknown as StepCreateDto] };
        const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto('nameSuffix');
        const dtoWithoutName = { ...createWorkflowDto, ...overrideDto };

        const res = await workflowsClient.createWorkflow(dtoWithoutName);
        if (res.isSuccessResult()) {
          throw new Error(`should fail${JSON.stringify(res.value)}`);
        }
        expect(res.error?.responseText, res.error?.responseText).to.contain('name');
      });
      it('should throw 400 on name empty', async () => {
        // @ts-ignore
        const overrideDto = { steps: [{ ...buildEmailStep(), name: '' } as unknown as StepCreateDto] };
        const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto('nameSuffix');
        const dtoWithoutName = { ...createWorkflowDto, ...overrideDto };

        const res = await workflowsClient.createWorkflow(dtoWithoutName);
        if (res.isSuccessResult()) {
          throw new Error(`should fail${JSON.stringify(res.value)}`);
        }
        expect(res.error?.responseText, res.error?.responseText).to.contain('name');
      });

      it('should remove issues when no longer', async () => {
        const inAppStep = { ...buildInAppStep(), controlValues: {}, name: 'some name' };
        const workflowCreated = await createWorkflowAndReturn({ steps: [inAppStep] });
        const firstStepIssues = workflowCreated.steps[0].issues;
        expect(firstStepIssues).to.be.ok;
        expect(firstStepIssues?.controls?.body).to.be.ok;
        expect(firstStepIssues?.controls?.body[0].issueType).to.be.eq(StepContentIssueEnum.MISSING_VALUE);
        const novuRestResult = await workflowsClient.updateWorkflow(workflowCreated._id, {
          ...workflowCreated,
          steps: [{ ...inAppStep, name: 'New Name', controlValues: { body: 'some body here' } }],
        });
        if (!novuRestResult.isSuccessResult()) {
          throw new Error(novuRestResult.error!.responseText);
        }
        const updatedWorkflow = novuRestResult.value;
        const firstStep = updatedWorkflow.steps[0];
        expect(firstStep.issues, JSON.stringify(firstStep)).to.be.empty;
        expect(firstStep.issues, JSON.stringify(firstStep.issues)).to.be.empty;
      });
    });

    describe('Workflow Step content Issues', () => {
      it('should show control value required when missing', async () => {
        const { issues, status } = await createWorkflowAndReturnStepIssues({ steps: [{ ...buildInAppStep() }] }, 0);
        expect(status, JSON.stringify(issues)).to.equal(WorkflowStatusEnum.ERROR);
        expect(issues).to.be.ok;
        if (issues.controls) {
          expect(issues.controls?.body).to.be.ok;
          if (issues.controls?.body) {
            expect(issues.controls?.body[0].issueType).to.be.equal(StepContentIssueEnum.MISSING_VALUE);
          }
        }
      });
      it('should show control value required when empty', async () => {
        const { issues, status } = await createWorkflowAndReturnStepIssues(
          { steps: [{ ...buildInAppStep(), controlValues: { body: '' } }] },
          0
        );
        expect(status, JSON.stringify(issues)).to.equal(WorkflowStatusEnum.ERROR);
        expect(issues).to.be.ok;
        if (issues.controls) {
          expect(issues.controls?.body).to.be.ok;
          if (issues.controls?.body) {
            expect(issues.controls?.body[0].issueType).to.be.equal(StepContentIssueEnum.MISSING_VALUE);
          }
        }
      });

      it('should show digest control value issues when illegal value provided', async () => {
        const steps = [{ ...buildDigestStep({ controlValues: { amount: '555', unit: 'days' } }) }];
        const workflowCreated = await createWorkflowAndReturn({ steps });
        const step = workflowCreated.steps[0];

        expect(step.issues?.controls?.amount[0].issueType).to.deep.equal(StepContentIssueEnum.TIER_LIMIT_EXCEEDED);
        expect(step.issues?.controls?.unit[0].issueType).to.deep.equal(StepContentIssueEnum.TIER_LIMIT_EXCEEDED);
      });
    });
  });

  describe('Create Workflow Permutations', () => {
    it('should allow creating two workflows for the same user with the same name', async () => {
      const nameSuffix = `Test Workflow${new Date().toISOString()}`;
      await createWorkflowAndValidate(nameSuffix);
      const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto(nameSuffix);
      const res = await workflowsClient.createWorkflow(createWorkflowDto);
      expect(res.isSuccessResult()).to.be.true;
      if (res.isSuccessResult()) {
        const workflowCreated: WorkflowResponseDto = res.value;
        expect(workflowCreated.workflowId).to.include(`${slugify(nameSuffix)}-`);
        await assertValuesInSteps(workflowCreated);
      }
    });

    it('should generate a payload schema if only control values are provided during workflow creation', async () => {
      const steps = [
        {
          ...buildEmailStep(),
          controlValues: {
            body: 'Welcome {{payload.name}}',
            subject: 'Hello {{payload.name}}',
          },
        },
      ];

      const nameSuffix = `Test Workflow${new Date().toISOString()}`;

      const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto(`${nameSuffix}`, { steps });
      const res = await workflowsClient.createWorkflow(createWorkflowDto);
      expect(res.isSuccessResult()).to.be.true;

      const workflow = res.value as WorkflowResponseDto;
      expect(workflow).to.be.ok;

      expect(workflow.steps[0].variables).to.be.ok;

      const stepData = await getStepData(workflow._id, workflow.steps[0]._id);
      expect(stepData.variables).to.be.ok;

      const { properties } = stepData.variables as JSONSchemaDto;
      expect(properties).to.be.ok;

      const payloadProperties = properties?.payload as JSONSchemaDto;
      expect(payloadProperties).to.be.ok;
      expect(payloadProperties.properties?.name).to.be.ok;
    });
  });

  describe('Update Workflow Permutations', () => {
    it('should update control values', async () => {
      const nameSuffix = `Test Workflow${new Date().toISOString()}`;
      const workflowCreated: WorkflowResponseDto = await createWorkflowAndValidate(nameSuffix);
      const inAppControlValue = `test-${generateUUID()}`;
      const emailControlValue = `test-${generateUUID()}`;
      const updateRequest: UpdateWorkflowDto = {
        origin: WorkflowOriginEnum.NOVU_CLOUD,
        name: workflowCreated.name,
        preferences: {
          user: null,
        },
        steps: [
          buildInAppStep({ controlValues: { test: inAppControlValue } }),
          buildEmailStep({ controlValues: { test: emailControlValue } }),
        ],
        workflowId: workflowCreated.workflowId,
      };
      const updatedWorkflow: WorkflowResponseDto = await updateWorkflowRest(
        workflowCreated._id,
        updateRequest as UpdateWorkflowDto
      );
      expect(updatedWorkflow.steps[0].controls.values.test).to.be.equal(inAppControlValue);
      expect(updatedWorkflow.steps[1].controls.values.test).to.be.equal(emailControlValue);
    });

    it('should keep the step id on updated ', async () => {
      const nameSuffix = `Test Workflow${new Date().toISOString()}`;
      const workflowCreated: WorkflowResponseDto = await createWorkflowAndValidate(nameSuffix);
      const updateDto = convertResponseToUpdateDto(workflowCreated);
      const updatedWorkflow = await updateWorkflowRest(workflowCreated._id, updateDto);
      const updatedStep = updatedWorkflow.steps[0];
      const originalStep = workflowCreated.steps[0];
      expect(updatedStep._id).to.be.ok;
      expect(updatedStep._id).to.be.equal(originalStep._id);
    });

    it('adding user preferences', async () => {
      const nameSuffix = `Test Workflow${new Date().toISOString()}`;
      const workflowCreated: WorkflowResponseDto = await createWorkflowAndValidate(nameSuffix);
      const updateDto = convertResponseToUpdateDto(workflowCreated);
      const updatedWorkflow = await updateWorkflowRest(workflowCreated._id, {
        ...updateDto,
        preferences: {
          user: { ...DEFAULT_WORKFLOW_PREFERENCES, all: { ...DEFAULT_WORKFLOW_PREFERENCES.all, enabled: false } },
        },
      });
      expect(updatedWorkflow.preferences.user, JSON.stringify(updatedWorkflow, null, 2)).to.be.ok;
      expect(updatedWorkflow.preferences?.user?.all.enabled, JSON.stringify(updatedWorkflow, null, 2)).to.be.false;

      const updatedWorkflow2 = await updateWorkflowRest(workflowCreated._id, {
        ...updateDto,
        preferences: {
          user: null,
        },
      });
      expect(updatedWorkflow2.preferences.user).to.be.null;
      expect(updatedWorkflow2.preferences.default).to.be.ok;
    });

    it('should update by slugify ids', async () => {
      const nameSuffix = `Test Workflow${new Date().toISOString()}`;
      const workflowCreated: WorkflowResponseDto = await createWorkflowAndValidate(nameSuffix);
      const updateDtoWithValues = await buildUpdateDto(workflowCreated);

      const internalId = workflowCreated._id;
      await updateWorkflowAndValidate(internalId, workflowCreated.updatedAt, updateDtoWithValues);

      const slugPrefixAndEncodedInternalId = `workflow-name-${ShortIsPrefixEnum.WORKFLOW}${encodeBase62(internalId)}`;
      await updateWorkflowAndValidate(slugPrefixAndEncodedInternalId, workflowCreated.updatedAt, updateDtoWithValues);

      const { workflowId } = workflowCreated;
      await updateWorkflowAndValidate(workflowId, workflowCreated.updatedAt, updateDtoWithValues);
    });
  });

  describe('List Workflow Permutations', () => {
    it('should not return workflows with if not matching query', async () => {
      await createWorkflowAndValidate('XYZ');
      await createWorkflowAndValidate('XYZ2');
      const workflowSummaries = await getAllAndValidate({
        searchQuery: 'ABC',
        expectedTotalResults: 0,
        expectedArraySize: 0,
      });
      expect(workflowSummaries).to.be.empty;
    });

    it('should not return workflows if offset is bigger than the amount of available workflows', async () => {
      const uuid = generateUUID();
      await create10Workflows(uuid);
      await getAllAndValidate({
        searchQuery: uuid,
        offset: 11,
        limit: 15,
        expectedTotalResults: 10,
        expectedArraySize: 0,
      });
    });

    it('should return all results within range', async () => {
      const uuid = generateUUID();

      await create10Workflows(uuid);
      await getAllAndValidate({
        searchQuery: uuid,
        offset: 0,
        limit: 15,
        expectedTotalResults: 10,
        expectedArraySize: 10,
      });
    });

    it('should return results without query', async () => {
      const uuid = generateUUID();
      await create10Workflows(uuid);
      await getAllAndValidate({
        searchQuery: uuid,
        offset: 0,
        limit: 15,
        expectedTotalResults: 10,
        expectedArraySize: 10,
      });
    });

    it('page workflows without overlap', async () => {
      const uuid = generateUUID();
      await create10Workflows(uuid);
      const listWorkflowResponse1 = await getAllAndValidate({
        searchQuery: uuid,
        offset: 0,
        limit: 5,
        expectedTotalResults: 10,
        expectedArraySize: 5,
      });
      const listWorkflowResponse2 = await getAllAndValidate({
        searchQuery: uuid,
        offset: 5,
        limit: 5,
        expectedTotalResults: 10,
        expectedArraySize: 5,
      });
      const idsDeduplicated = buildIdSet(listWorkflowResponse1, listWorkflowResponse2);
      expect(idsDeduplicated.size).to.be.equal(10);
    });

    async function createV1Workflow() {
      const novuRestResult = await workflowsClient.createWorkflowsV1({
        name: `test api template: ${generateUUID()}`,
        description: 'This is a test description',
        tags: ['test-tag-api'],
        notificationGroupId: session.notificationGroups[0]._id,
        steps: [],
      });
      if (!novuRestResult.isSuccessResult()) {
        throw new Error(`Failed to create V1 Workflow ${JSON.stringify(novuRestResult.error)}`);
      }

      return novuRestResult.value;
    }

    async function searchWorkflowsV1(workflowId?: string) {
      const novuRestResult = await workflowsClient.searchWorkflowsV1(workflowId);
      if (!novuRestResult.isSuccessResult()) {
        throw new Error('should not fail to get list ');
      }

      return novuRestResult.value;
    }

    async function getV2WorkflowIdAndExternalId(uuid: string) {
      await create10Workflows(uuid);
      const listWorkflowResponse: ListWorkflowResponse = await getListWorkflows(uuid, 0, 5);
      const workflowV2Id = listWorkflowResponse.workflows[0]._id;
      const { workflowId } = listWorkflowResponse.workflows[0];

      return { workflowV2Id, workflowId, name: listWorkflowResponse.workflows[0].name };
    }

    async function create3V1Workflows() {
      await createV1Workflow();
      await createV1Workflow();

      return await createV1Workflow();
    }

    it('old list endpoint should not retreive the new workflow', async () => {
      const uuid = generateUUID();
      const { workflowV2Id, name } = await getV2WorkflowIdAndExternalId(uuid);
      const workflowV1Created = await create3V1Workflows();
      let workflowsFromSearch = await searchWorkflowsV1(workflowV1Created?.name);
      expect(workflowsFromSearch[0]._id).to.deep.eq(workflowV1Created._id);

      workflowsFromSearch = await searchWorkflowsV1();
      const ids = workflowsFromSearch?.map((workflow) => workflow._id);
      const found = ids?.some((localId) => localId === workflowV2Id);
      expect(found, `FoundIds:${ids} SearchedID:${workflowV2Id}`).to.be.false;

      workflowsFromSearch = await searchWorkflowsV1(name);
      expect(workflowsFromSearch?.length).to.eq(0);
    });
  });

  describe('Promote Workflow Permutations', () => {
    it('should promote by creating a new workflow in production environment with the same properties', async () => {
      // Create a workflow in the development environment
      let devWorkflow = await createWorkflowAndValidate('-promote-workflow');
      await workflowsClient.patchWorkflowStepData(devWorkflow._id, devWorkflow.steps[0]._id, {
        controlValues: { vinyl: 'vinyl', color: 'red', band: 'beatles' },
      });
      devWorkflow = await getWorkflowRest(devWorkflow._id);

      // Switch to production environment and get its ID
      await session.switchToProdEnvironment();
      const prodEnvironmentId = session.environment._id;
      await session.switchToDevEnvironment();

      // Promote the workflow to production
      const prodWorkflow = await syncWorkflow(devWorkflow, prodEnvironmentId);

      // Verify that the promoted workflow has a new ID but the same workflowId
      expect(prodWorkflow._id).to.not.equal(devWorkflow._id);
      expect(prodWorkflow.workflowId).to.equal(devWorkflow.workflowId);

      // Check that all non-environment-specific properties are identical
      const propertiesToCompare = ['name', 'description', 'tags', 'preferences', 'status', 'type', 'origin'];
      propertiesToCompare.forEach((prop) => {
        expect(prodWorkflow[prop]).to.deep.equal(devWorkflow[prop], `Property ${prop} should match`);
      });

      // Verify that steps are correctly promoted
      expect(prodWorkflow.steps).to.have.lengthOf(devWorkflow.steps.length);
      for (const prodStep of prodWorkflow.steps) {
        const index = prodWorkflow.steps.indexOf(prodStep);
        const devStep = devWorkflow.steps[index];

        expect(prodStep.stepId).to.equal(devStep.stepId, 'Step ID should be the same');
        expect(prodStep.controls.values).to.deep.equal(devStep.controls.values, 'Step controlValues should match');
        expect(prodStep.name).to.equal(devStep.name, 'Step name should match');
        expect(prodStep.type).to.equal(devStep.type, 'Step type should match');
      }
    });

    it('should promote by updating an existing workflow in production environment', async () => {
      // Switch to production environment and get its ID
      await session.switchToProdEnvironment();
      const prodEnvironmentId = session.environment._id;
      await session.switchToDevEnvironment();

      // Create a workflow in the development environment
      const devWorkflow = await createWorkflowAndValidate('-promote-workflow');

      // Promote the workflow to production
      const resPromoteCreate = await session.testAgent.put(`${v2Prefix}/workflows/${devWorkflow._id}/sync`).send({
        targetEnvironmentId: prodEnvironmentId,
      });
      expect(resPromoteCreate.status).to.equal(200);
      const prodWorkflowCreated = resPromoteCreate.body.data;

      // Update the workflow in the development environment
      const updateDto: UpdateWorkflowDto = {
        ...convertResponseToUpdateDto(devWorkflow),
        name: 'Updated Name',
        description: 'Updated Description',
        // modify existing Email Step, add new InApp Steps, previously existing InApp Step is removed
        steps: [
          {
            ...buildEmailStep({ controlValues: { test: 'test' } }),
            _id: devWorkflow.steps[0]._id,
            name: 'Updated Email Step',
          },
          { ...buildInAppStep(), name: 'New InApp Step' },
        ],
      };
      await updateWorkflowAndValidate(devWorkflow._id, devWorkflow.updatedAt, updateDto);

      // Promote the updated workflow to production
      const resPromoteUpdate = await session.testAgent.put(`${v2Prefix}/workflows/${devWorkflow._id}/sync`).send({
        targetEnvironmentId: prodEnvironmentId,
      });

      expect(resPromoteUpdate.status).to.equal(200);
      const prodWorkflowUpdated = resPromoteUpdate.body.data;

      // Verify that IDs remain unchanged
      expect(prodWorkflowUpdated._id).to.equal(prodWorkflowCreated._id);
      expect(prodWorkflowUpdated.workflowId).to.equal(prodWorkflowCreated.workflowId);

      // Verify updated properties
      expect(prodWorkflowUpdated.name).to.equal('Updated Name');
      expect(prodWorkflowUpdated.description).to.equal('Updated Description');
      // Verify unchanged properties
      ['status', 'type', 'origin'].forEach((prop) => {
        expect(prodWorkflowUpdated[prop]).to.deep.equal(prodWorkflowCreated[prop], `Property ${prop} should match`);
      });

      // Verify updated steps
      expect(prodWorkflowUpdated.steps).to.have.lengthOf(2);
      expect(prodWorkflowUpdated.steps[0].name).to.equal('Updated Email Step');
      expect(prodWorkflowUpdated.steps[0]._id).to.equal(prodWorkflowCreated.steps[0]._id);
      expect(prodWorkflowUpdated.steps[0].stepId).to.equal(prodWorkflowCreated.steps[0].stepId);
      expect(prodWorkflowUpdated.steps[0].controls.values).to.deep.equal({ test: 'test' });

      // Verify new created step
      expect(prodWorkflowUpdated.steps[1].name).to.equal('New InApp Step');
      expect(prodWorkflowUpdated.steps[1]._id).to.not.equal(prodWorkflowCreated.steps[1]._id);
      expect(prodWorkflowUpdated.steps[1].stepId).to.equal('new-in-app-step');
    });

    it('should throw an error if trying to promote to the same environment', async () => {
      const devWorkflow = await createWorkflowAndValidate('-promote-workflow');

      const res = await session.testAgent.put(`${v2Prefix}/workflows/${devWorkflow._id}/sync`).send({
        targetEnvironmentId: session.environment._id,
      });

      expect(res.status).to.equal(400);
      expect(res.body.message).to.equal('Cannot sync workflow to the same environment');
    });

    it('should throw an error if the workflow to promote is not found', async () => {
      const res = await session.testAgent.put(`${v2Prefix}/workflows/123/sync`).send({ targetEnvironmentId: '123' });

      expect(res.status).to.equal(404);
      expect(res.body.message).to.equal('Workflow cannot be found');
      expect(res.body.ctx.workflowId).to.equal('123');
    });
  });

  describe('Get Workflow Permutations', () => {
    it('should get by slugify ids', async () => {
      const workflowCreated = await createWorkflowAndValidate('XYZ');

      const internalId = workflowCreated._id;
      const workflowRetrievedByInternalId = await getWorkflowRest(internalId);
      expect(workflowRetrievedByInternalId._id).to.equal(internalId);

      const base62InternalId = encodeBase62(internalId);
      const slugPrefixAndEncodedInternalId = `my-workflow-${ShortIsPrefixEnum.WORKFLOW}${base62InternalId}`;
      const workflowRetrievedBySlugPrefixAndEncodedInternalId = await getWorkflowRest(slugPrefixAndEncodedInternalId);
      expect(workflowRetrievedBySlugPrefixAndEncodedInternalId._id).to.equal(internalId);

      const workflowIdentifier = workflowCreated.workflowId;
      const workflowRetrievedByWorkflowIdentifier = await getWorkflowRest(workflowIdentifier);
      expect(workflowRetrievedByWorkflowIdentifier._id).to.equal(internalId);
    });

    it('should return 404 if workflow does not exist', async () => {
      const notExistingId = '123';
      const novuRestResult = await workflowsClient.getWorkflow(notExistingId);
      expect(novuRestResult.isSuccess).to.be.false;
      expect(novuRestResult.error).to.be.ok;
      expect(novuRestResult.error!.status).to.equal(404);
      expect(novuRestResult.error!.responseText).to.contain('Workflow');
      const parse = JSON.parse(novuRestResult.error!.responseText);
      expect(parse.ctx.workflowId).to.contain(notExistingId);
    });
  });

  describe('Get Step Data Permutations', () => {
    it('should get step by worflow slugify ids', async () => {
      const workflowCreated = await createWorkflowAndValidate('XYZ');
      const internalWorkflowId = workflowCreated._id;
      const stepId = workflowCreated.steps[0]._id;

      const stepRetrievedByWorkflowInternalId = await getStepData(internalWorkflowId, stepId);
      expect(stepRetrievedByWorkflowInternalId._id).to.equal(stepId);

      const base62WorkflowIdInternalId = encodeBase62(internalWorkflowId);
      const slugPrefixAndEncodedWorkflowInternalId = `my-workflow-${ShortIsPrefixEnum.WORKFLOW}${base62WorkflowIdInternalId}`;
      const stepRetrievedBySlugPrefixAndEncodedWorkflowInternalId = await getStepData(
        slugPrefixAndEncodedWorkflowInternalId,
        stepId
      );
      expect(stepRetrievedBySlugPrefixAndEncodedWorkflowInternalId._id).to.equal(stepId);

      const workflowIdentifier = workflowCreated.workflowId;
      const stepRetrievedByWorkflowIdentifier = await getStepData(workflowIdentifier, stepId);
      expect(stepRetrievedByWorkflowIdentifier._id).to.equal(stepId);
    });

    it('should get step by step slugify ids', async () => {
      const workflowCreated = await createWorkflowAndValidate('XYZ');
      const internalWorkflowId = workflowCreated._id;
      const stepId = workflowCreated.steps[0]._id;

      const stepRetrievedByStepInternalId = await getStepData(internalWorkflowId, stepId);
      expect(stepRetrievedByStepInternalId._id).to.equal(stepId);

      const base62StepIdInternalId = encodeBase62(stepId);
      const slugPrefixAndEncodedStepId = `my-step-${ShortIsPrefixEnum.STEP}${base62StepIdInternalId}`;
      const stepRetrievedBySlugPrefixAndEncodedStepId = await getStepData(
        internalWorkflowId,
        slugPrefixAndEncodedStepId
      );
      expect(stepRetrievedBySlugPrefixAndEncodedStepId._id).to.equal(stepId);

      const stepIdentifier = workflowCreated.steps[0].stepId;
      const stepRetrievedByStepIdentifier = await getStepData(internalWorkflowId, stepIdentifier);
      expect(stepRetrievedByStepIdentifier._id).to.equal(stepId);
    });
    describe('Variables', () => {
      it('should get step available variables', async () => {
        const steps = [
          {
            ...buildEmailStep(),
            controlValues: {
              body: 'Welcome to our newsletter {{subscriber.nonExistentValue}}{{payload.prefixBodyText2}}{{payload.prefixBodyText}}',
              subject: 'Welcome to our newsletter {{subjectText}} {{payload.prefixSubjectText}}',
            },
          },
          { ...buildInAppStep(), controlValues: { subject: 'Welcome to our newsletter {{inAppSubjectText}}' } },
        ];
        const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto('', { steps });
        const res = await workflowsClient.createWorkflow(createWorkflowDto);
        if (!res.isSuccessResult()) {
          throw new Error(res.error!.responseText);
        }
        const stepData = await getStepData(res.value._id, res.value.steps[0]._id);
        const { variables } = stepData;

        if (typeof variables === 'boolean') throw new Error('Variables is not an object');
        const { properties } = variables;
        expect(properties).to.be.ok;
        if (!properties) throw new Error('Payload schema is not valid');
        const payloadVariables = properties.payload;
        expect(payloadVariables).to.be.ok;
        if (!payloadVariables) throw new Error('Payload schema is not valid');
        expect(JSON.stringify(payloadVariables)).to.contain('payload.prefixBodyText2');
        expect(JSON.stringify(payloadVariables)).to.contain('{{payload.prefixSubjectText}}');
      });
      it('should serve previous step variables with payload schema', async () => {
        const steps = [
          buildDigestStep(),
          { ...buildInAppStep(), controlValues: { subject: 'Welcome to our newsletter {{payload.inAppSubjectText}}' } },
        ];
        const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto('', { steps });
        const res = await workflowsClient.createWorkflow(createWorkflowDto);
        if (!res.isSuccessResult()) {
          throw new Error(res.error!.responseText);
        }
        const novuRestResult = await workflowsClient.getWorkflowStepData(res.value._id, res.value.steps[1]._id);
        if (!novuRestResult.isSuccessResult()) {
          throw new Error(novuRestResult.error!.responseText);
        }
        const { variables } = novuRestResult.value;
        const variableList = getJsonSchemaPrimitiveProperties(variables as JSONSchemaDto);
        const hasStepVariables = variableList.some((variable) => variable.startsWith('steps.'));
        expect(hasStepVariables, JSON.stringify(variableList)).to.be.true;
      });
    });
  });
  describe('Get Test Data Permutations', () => {
    it('should get test data', async () => {
      const steps = [
        {
          ...buildEmailStep(),
          controlValues: {
            body: 'Welcome to our newsletter {{bodyText}}{{bodyText2}}{{payload.emailPrefixBodyText}}',
            subject: 'Welcome to our newsletter {{subjectText}} {{payload.prefixSubjectText}}',
          },
        },
        { ...buildInAppStep(), controlValues: { subject: 'Welcome to our newsletter {{payload.inAppSubjectText}}' } },
      ];
      const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto('', { steps });
      const res = await session.testAgent.post(`${v2Prefix}/workflows`).send(createWorkflowDto);
      expect(res.status).to.be.equal(201);
      const workflowCreated: WorkflowResponseDto = res.body.data;
      const workflowTestData = await getWorkflowTestData(workflowCreated._id);

      expect(workflowTestData).to.be.ok;
      const { payload } = workflowTestData;
      if (typeof payload === 'boolean') throw new Error('Variables is not an object');

      expect(payload.properties).to.have.property('emailPrefixBodyText');
      expect(payload.properties?.emailPrefixBodyText)
        .to.have.property('default')
        .that.equals('{{payload.emailPrefixBodyText}}');

      expect(payload.properties).to.have.property('prefixSubjectText');
      expect(payload.properties?.prefixSubjectText)
        .to.have.property('default')
        .that.equals('{{payload.prefixSubjectText}}');

      expect(payload.properties).to.have.property('inAppSubjectText');
      expect(payload.properties?.inAppSubjectText)
        .to.have.property('default')
        .that.equals('{{payload.inAppSubjectText}}');
      /*
       * Validate the 'to' schema
       * Note: Can't use deep comparison since emails differ between local and CI environments due to user sessions
       */
      const toSchema = workflowTestData.to;
      if (
        typeof toSchema === 'boolean' ||
        typeof toSchema.properties?.subscriberId === 'boolean' ||
        typeof toSchema.properties?.email === 'boolean'
      ) {
        expect((toSchema as any).type).to.be.a('boolean');
        expect(((toSchema as any).properties?.subscriberId as any).type).to.be.a('boolean');
        expect(((toSchema as any).properties?.email as any).type).to.be.a('boolean');
        throw new Error('To schema is not a boolean');
      }
      expect(toSchema.type).to.equal('object');
      expect(toSchema.properties?.subscriberId.type).to.equal('string');
      expect(toSchema.properties?.subscriberId.default).to.equal(session.user._id);
      expect(toSchema.properties?.email.type).to.equal('string');
      expect(toSchema.properties?.email.format).to.equal('email');
      expect(toSchema.properties?.email.default).to.be.a('string');
      expect(toSchema.properties?.email.default).to.not.equal('');
      expect(toSchema.required).to.deep.equal(['subscriberId', 'email']);
      expect(toSchema.additionalProperties).to.be.false;
    });
  });
  describe('Patch Workflow Step Data Permutations', () => {
    it('when patch one control values the second step stays untouched', async () => {
      const response = await createWorkflowRest(buildCreateWorkflowDto('', {}));
      const workflowDatabaseId = response._id;
      const stepId1 = response.steps[0]._id;
      const stepId2 = response.steps[1]._id;
      const controlValues1 = { body: 'body1', subject: 'subject1' };
      await patchStepRest(workflowDatabaseId, stepId1, { controlValues: controlValues1 });
      const newVar = await getStepData(workflowDatabaseId, stepId1);
      expect(newVar.controls.values).to.deep.equal(controlValues1);
      const stepData2 = await getStepData(workflowDatabaseId, stepId2);
      expect(stepData2.controls.values).to.not.deep.equal(controlValues1);
      const controlValues2 = { body: 'body2', subject: 'subject2' };
      await patchStepRest(workflowDatabaseId, stepId2, { controlValues: controlValues2 });
      const stepData2Updated = await getStepData(workflowDatabaseId, stepId2);
      expect(stepData2Updated.controls.values).to.deep.equal(controlValues2);
    });
  });

  async function patchWorkflowAndReturnResponse(workflowId: string, active: boolean) {
    const novuRestResult = await workflowsClient.patchWorkflow(workflowId, {
      active,
    });
    if (!novuRestResult.isSuccessResult()) {
      throw new Error(novuRestResult.error!.responseText);
    }
    const updatedWorkflow = novuRestResult.value;

    return updatedWorkflow;
  }

  describe('Patch Workflow Permutations', () => {
    it('Patch should work and allow us to turn workflow active on / off and have the status change accordingly', async () => {
      const workflowDto = await createWorkflowRest(buildCreateWorkflowDto('', { steps: [buildInAppStep()] }));
      await patchStepRest(workflowDto._id, workflowDto.steps[0]._id, {
        controlValues: { body: 'body1', subject: 'subject1' },
      });
      let updatedWorkflow = await patchWorkflowAndReturnResponse(workflowDto._id, false);
      expect(updatedWorkflow.status).to.equal(WorkflowStatusEnum.INACTIVE);
      updatedWorkflow = await patchWorkflowAndReturnResponse(workflowDto._id, true);
      expect(updatedWorkflow.status).to.equal(WorkflowStatusEnum.ACTIVE);
      await patchStepRest(workflowDto._id, workflowDto.steps[0]._id, { controlValues: {} });
      updatedWorkflow = await patchWorkflowAndReturnResponse(workflowDto._id, false);
      expect(updatedWorkflow.status).to.equal(WorkflowStatusEnum.INACTIVE);
      updatedWorkflow = await patchWorkflowAndReturnResponse(workflowDto._id, true);
      expect(updatedWorkflow.status).to.equal(WorkflowStatusEnum.ACTIVE);
    });
  });

  async function createWorkflowRest(newVar: CreateWorkflowDto): Promise<WorkflowResponseDto> {
    const novuRestResult = await workflowsClient.createWorkflow(newVar);
    if (!novuRestResult.isSuccessResult()) {
      throw new Error(novuRestResult.error!.responseText);
    }

    return novuRestResult.value;
  }

  async function patchStepRest(workflowDatabaseId: string, stepId1: string, patchStepDataDto: PatchStepDataDto) {
    const novuRestResult = await workflowsClient.patchWorkflowStepData(workflowDatabaseId, stepId1, patchStepDataDto);
    if (!novuRestResult.isSuccessResult()) {
      throw new Error(novuRestResult.error!.responseText);
    }

    return novuRestResult.value;
  }

  async function updateWorkflowRest(id: string, workflow: UpdateWorkflowDto): Promise<WorkflowResponseDto> {
    const novuRestResult = await workflowsClient.updateWorkflow(id, workflow);
    if (novuRestResult.isSuccessResult()) {
      return novuRestResult.value;
    }
    throw new Error(novuRestResult.error!.responseText);
  }

  function constructSlugForStepRequest(stepInRequest: StepUpdateDto) {
    return `${slugify(stepInRequest.name)}_${ShortIsPrefixEnum.STEP}${encodeBase62((stepInRequest as StepUpdateDto)._id)}`;
  }

  async function syncWorkflow(devWorkflow: WorkflowResponseDto, prodEnvironmentId: string) {
    const res = await workflowsClient.syncWorkflow(devWorkflow._id, {
      targetEnvironmentId: prodEnvironmentId,
    });
    if (res.isSuccessResult()) {
      return res.value;
    }
    throw new Error(res.error!.responseText);
  }

  async function getStepData(workflowId: string, stepId: string, envId?: string) {
    const novuRestResult = await createWorkflowClient(session.serverUrl, getHeaders(envId)).getWorkflowStepData(
      workflowId,
      stepId
    );
    if (!novuRestResult.isSuccessResult()) {
      throw new Error(novuRestResult.error!.responseText);
    }
    const { value } = novuRestResult;

    return value;
  }

  async function getWorkflowTestData(workflowId: string, envId?: string) {
    const novuRestResult = await createWorkflowClient(session.serverUrl, getHeaders(envId)).getWorkflowTestData(
      workflowId
    );
    if (!novuRestResult.isSuccessResult()) {
      throw new Error(novuRestResult.error!.responseText);
    }
    const { value } = novuRestResult;

    return value;
  }

  async function updateWorkflowAndValidate(
    workflowRequestId: string,
    expectedPastUpdatedAt: string,
    updateRequest: UpdateWorkflowDto
  ): Promise<void> {
    const updatedWorkflow: WorkflowResponseDto = await updateWorkflowRest(workflowRequestId, updateRequest);
    const slug = `${slugify(updateRequest.name)}_${ShortIsPrefixEnum.WORKFLOW}${encodeBase62(updatedWorkflow._id)}`;
    expect(updatedWorkflow.slug).to.equal(slug);
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < updateRequest.steps.length; i++) {
      const stepInRequest = updateRequest.steps[i];
      expect(stepInRequest.name).to.equal(updatedWorkflow.steps[i].name);
      expect(stepInRequest.type).to.equal(updatedWorkflow.steps[i].type);

      if (stepInRequest.controlValues) {
        expect(stepInRequest.controlValues).to.deep.equal(updatedWorkflow.steps[i].controls.values);
      }

      if ('_id' in stepInRequest) {
        expect(constructSlugForStepRequest(stepInRequest)).to.equal(updatedWorkflow.steps[i].slug);
      }
    }
    expect(convertToDate(updatedWorkflow.updatedAt)).to.be.greaterThan(convertToDate(expectedPastUpdatedAt));
  }
  async function assertValuesInSteps(workflowCreated: WorkflowResponseDto) {
    for (const step of workflowCreated.steps) {
      expect(step).to.be.ok;
      expect(step.controls).to.be.ok;
      if (step.controls) {
        expect(step.controls.values).to.be.ok;
        expect(step.controls.dataSchema).to.be.ok;
        expect(Object.keys(step.controls.dataSchema?.properties || {}).length).to.deep.equal(
          Object.keys(stepTypeToControlSchema[step.type].schema.properties).length
        );
        expect(step.controls.uiSchema).to.deep.equal(stepTypeToControlSchema[step.type].uiSchema);
      }
    }
  }
  async function create10Workflows(prefix: string) {
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < 10; i++) {
      await createWorkflowAndValidate(`${prefix}-ABC${i}`);
    }
  }

  async function createWorkflowAndValidate(nameSuffix: string = ''): Promise<WorkflowResponseDto> {
    const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto(nameSuffix);
    const res = await workflowsClient.createWorkflow(createWorkflowDto);
    if (!res.isSuccessResult()) {
      throw new Error(res.error!.responseText);
    }
    validateCreateWorkflowResponse(res.value, createWorkflowDto);

    return res.value;
  }

  function stringify(workflowResponseDto: any) {
    return JSON.stringify(workflowResponseDto, null, 2);
  }

  function assertWorkflowResponseBodyData(workflowResponseDto: WorkflowResponseDto) {
    expect(workflowResponseDto, stringify(workflowResponseDto)).to.be.ok;
    expect(workflowResponseDto._id, stringify(workflowResponseDto)).to.be.ok;
    expect(workflowResponseDto.updatedAt, stringify(workflowResponseDto)).to.be.ok;
    expect(workflowResponseDto.createdAt, stringify(workflowResponseDto)).to.be.ok;
    expect(workflowResponseDto.preferences, stringify(workflowResponseDto)).to.be.ok;
    expect(workflowResponseDto.status, stringify(workflowResponseDto)).to.be.ok;
    expect(workflowResponseDto.origin, stringify(workflowResponseDto)).to.be.eq(WorkflowOriginEnum.NOVU_CLOUD);
    expect(Object.keys(workflowResponseDto.issues || {}).length, stringify(workflowResponseDto)).to.be.equal(0);
  }

  function assertStepResponse(workflowResponseDto: WorkflowResponseDto, createWorkflowDto: CreateWorkflowDto) {
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < workflowResponseDto.steps.length; i++) {
      const stepInRequest = createWorkflowDto.steps[i];
      const step = workflowResponseDto.steps[i];
      expect(step._id, stringify(step)).to.be.ok;
      expect(step.slug, stringify(step)).to.be.ok;
      expect(step.name, stringify(step)).to.be.equal(stepInRequest.name);
      expect(step.type, stringify(step)).to.be.equal(stepInRequest.type);
      expect(Object.keys(step.issues?.body || {}).length, stringify(step)).to.be.eq(0);
    }
  }

  async function createWorkflowAndReturn(
    overrideDto: Partial<
      WorkflowCommonsFields & {
        workflowId: string;
        steps: StepCreateDto[];
        __source: WorkflowCreationSourceEnum;
        preferences?: PreferencesRequestDto;
      }
    >
  ) {
    const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto('nameSuffix');
    const dtoWithoutName = { ...createWorkflowDto, ...overrideDto };

    const res = await workflowsClient.createWorkflow(dtoWithoutName);
    if (!res.isSuccessResult()) {
      throw new Error(res.error!.responseText);
    }
    const workflowCreated: WorkflowResponseDto = res.value;

    return workflowCreated;
  }

  async function createWorkflowAndReturnStepIssues(overrideDto: Partial<CreateWorkflowDto>, stepIndex: number) {
    const workflowCreated = await createWorkflowAndReturn(overrideDto);
    const { steps } = workflowCreated;
    expect(steps, JSON.stringify(workflowCreated)).to.be.ok;
    const step = steps[stepIndex];
    const { issues } = step;
    expect(issues, JSON.stringify(step)).to.be.ok;
    if (issues) {
      return { issues, status: workflowCreated.status };
    }
    throw new Error('Issues not found');
  }
  function validateCreateWorkflowResponse(
    workflowResponseDto: WorkflowResponseDto,
    createWorkflowDto: CreateWorkflowDto
  ) {
    assertWorkflowResponseBodyData(workflowResponseDto);
    assertStepResponse(workflowResponseDto, createWorkflowDto);
  }
  function getJsonSchemaPrimitiveProperties(
    schema: JSONSchemaDto | JSONSchemaDefinition[] | boolean,
    prefix: string = ''
  ): string[] {
    if (!isJSONSchemaDto(schema)) {
      return [];
    }
    let properties: string[] = [];
    // Check if the schema has properties
    if (schema.properties) {
      // eslint-disable-next-line guard-for-in
      for (const key in schema.properties) {
        const propertySchema = schema.properties[key];
        if (!isJSONSchemaDto(propertySchema)) {
          continue;
        }
        const propertyPath = prefix ? `${prefix}.${key}` : key;

        // Check if the property type is primitive
        if (isPrimitiveType(propertySchema)) {
          properties.push(propertyPath);
        } else {
          // If not primitive, recurse into the object
          properties = properties.concat(getJsonSchemaPrimitiveProperties(propertySchema, propertyPath));
        }
      }
    }

    // Check if the schema has items (for arrays)
    if (schema.items && isJSONSchemaDto(schema.items)) {
      // Assuming items is an object schema, we can treat it like a property
      if (isPrimitiveType(schema.items)) {
        properties.push(prefix); // If items are primitive, add the array itself
      } else {
        properties = properties.concat(getJsonSchemaPrimitiveProperties(schema.items, prefix));
      }
    }

    return properties;
  }
  function isJSONSchemaDto(obj: any): obj is JSONSchemaDto {
    // Check if the object has a 'type' property and is of type 'string'
    return typeof obj === 'object' && obj !== null && typeof obj.type === 'string';
  }
  function isPrimitiveType(schema: JSONSchemaDto): boolean {
    const primitiveTypes = ['string', 'number', 'boolean', 'null'];

    return primitiveTypes.includes((schema.type && (schema.type as string)) || '');
  }
  async function addValueToExistingStep(steps: UpsertStepBody[], workflowDatabaseId: string): Promise<UpdateStepBody> {
    const stepToUpdate = steps[0];

    if (isStepUpdateBody(stepToUpdate)) {
      stepToUpdate.name = `Updated Step Name- ${generateUUID()}`;
      await workflowsClient.patchWorkflowStepData(workflowDatabaseId, stepToUpdate._id, {
        controlValues: { test: `test-${generateUUID()}` },
      });

      return stepToUpdate;
    }

    throw new Error('Step to update is not a StepUpdateDto');
  }
  async function buildUpdateDto(workflowCreated: WorkflowResponseDto): Promise<UpsertWorkflowBody> {
    const updateDto = convertResponseToUpdateDto(workflowCreated);
    const updatedStep = await addValueToExistingStep(updateDto.steps, workflowCreated._id);
    const newStep = buildInAppStep();

    return {
      ...updateDto,
      name: `${TEST_WORKFLOW_UPDATED_NAME}-${generateUUID()}`,
      steps: [updatedStep, newStep],
    };
  }

  describe('Workflow Step Issues', () => {
    it('should show issues for illegal variables in control values', async () => {
      const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto('test-issues', {
        steps: [
          {
            name: 'Email Test Step',
            type: StepTypeEnum.EMAIL,
            controlValues: { body: 'Welcome {{}}' },
          },
        ],
      });

      const res = await workflowsClient.createWorkflow(createWorkflowDto);
      expect(res.isSuccessResult()).to.be.true;
      if (res.isSuccessResult()) {
        const workflow = res.value;

        const stepData = await getStepData(workflow._id, workflow.steps[0]._id);
        expect(stepData.issues, 'Step data should have issues').to.exist;
        expect(stepData.issues?.controls?.body, 'Step data should have body issues').to.exist;
        expect(stepData.issues?.controls?.body?.[0]?.variableName).to.equal('{{}}');
        expect(stepData.issues?.controls?.body?.[0]?.issueType).to.equal('ILLEGAL_VARIABLE_IN_CONTROL_VALUE');
      }
    });

    // todo add validation for invalid URLs
    it.skip('should show issues for invalid URLs', async () => {
      const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto('test-issues', {
        steps: [
          {
            name: 'In-App Test Step',
            type: StepTypeEnum.IN_APP,
            controlValues: {
              redirect: { url: 'not-good-url-please-replace' },
              primaryAction: { redirect: { url: 'not-good-url-please-replace' } },
              secondaryAction: { redirect: { url: 'not-good-url-please-replace' } },
            },
          },
        ],
      });

      const res = await workflowsClient.createWorkflow(createWorkflowDto);
      expect(res.isSuccessResult()).to.be.true;
      if (res.isSuccessResult()) {
        const workflow = res.value;

        const stepData = await getStepData(workflow._id, workflow.steps[0]._id);
        expect(stepData.issues, 'Step data should have issues').to.exist;
        expect(stepData.issues?.controls?.['redirect.url']?.[0]?.issueType).to.equal('INVALID_URL');
        expect(stepData.issues?.controls?.['primaryAction.redirect.url']?.[0]?.issueType).to.equal('INVALID_URL');
        expect(stepData.issues?.controls?.['secondaryAction.redirect.url']?.[0]?.issueType).to.equal('INVALID_URL');
      }
    });

    it('should show issues for missing required control values', async () => {
      const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto('test-issues', {
        steps: [
          {
            name: 'In-App Test Step',
            type: StepTypeEnum.IN_APP,
          },
        ],
      });

      const res = await workflowsClient.createWorkflow(createWorkflowDto);
      expect(res.isSuccessResult()).to.be.true;
      if (res.isSuccessResult()) {
        const workflow = res.value;
        const stepData = await getStepData(workflow._id, workflow.steps[0]._id);
        expect(stepData.issues, 'Step data should have issues').to.exist;
        expect(stepData.issues?.controls, 'Step data should have control issues').to.exist;
        expect(stepData.issues?.controls?.body?.[0]?.issueType).to.equal('MISSING_VALUE');
      }
    });
  });
});

function buildEmailStep(overrides: Partial<StepCreateDto> = {}): StepCreateDto {
  return {
    name: 'Email Test Step',
    type: StepTypeEnum.EMAIL,
    ...overrides,
  };
}
function buildDigestStep(overrides: Partial<StepCreateDto> = {}): StepCreateDto {
  return {
    name: 'Digest Test Step',
    type: StepTypeEnum.DIGEST,
    ...overrides,
  };
}

function buildInAppStep(overrides: Partial<StepCreateDto> = {}): StepCreateDto {
  return {
    name: 'In-App Test Step',
    type: StepTypeEnum.IN_APP,
    ...overrides,
  };
}

export function buildCreateWorkflowDto(
  nameSuffix: string,
  overrides: Partial<CreateWorkflowDto> = {}
): CreateWorkflowDto {
  return {
    __source: WorkflowCreationSourceEnum.EDITOR,
    name: TEST_WORKFLOW_NAME + nameSuffix,
    workflowId: `${slugify(TEST_WORKFLOW_NAME + nameSuffix)}`,
    description: 'This is a test workflow',
    active: true,
    tags: TEST_TAGS,
    steps: [buildEmailStep(), buildInAppStep()],
    ...overrides,
  };
}

function convertToDate(dateString: string) {
  const timestamp = Date.parse(dateString);

  return new Date(timestamp);
}

function parseAndReturnJson(res: ApiResponse, url: string) {
  let parse: any;
  try {
    parse = JSON.parse(res.text);
  } catch (e) {
    expect.fail(
      '',
      '',
      `'Expected response to be JSON' text: ${res.text}, url: ${url}, method: ${res.req.method}, status: ${res.status}`
    );
  }
  expect(parse).to.be.ok;

  return parse.data;
}

async function safeRest<T>(
  url: string,
  method: () => Promise<ApiResponse>,
  expectedStatus: number = 200
): Promise<unknown> {
  const res: ApiResponse = await method();
  expect(res.status).to.eq(
    expectedStatus,
    `[${res.req.method}]  Failed for URL: ${url} 
    with text: 
    ${res.text}
     full response:
      ${JSON.stringify(res, null, 2)}`
  ); // Check if the status code is 200

  if (res.status !== 200) {
    return res.text;
  }

  return parseAndReturnJson(res, url);
}

async function getWorkflowRest(workflowId: string): Promise<WorkflowResponseDto> {
  return await safeGet(`${v2Prefix}/workflows/${workflowId}`);
}

async function validateWorkflowDeleted(workflowId: string): Promise<void> {
  await session.testAgent.get(`${v2Prefix}/workflows/${workflowId}`).expect(404);
  await validatePreferencesDeleted(workflowId);
}

async function validatePreferencesDeleted(workflowId: string): Promise<void> {
  const preferencesRepository = new PreferencesRepository();
  const preferences = await preferencesRepository.find({
    _templateId: workflowId,
    _organizationId: session.organization._id,
  });
  expect(preferences.length).to.equal(0);
}

async function getWorkflowAndValidate(workflowCreated: WorkflowResponseDto) {
  const workflowRetrieved = await getWorkflowRest(workflowCreated._id);
  expect(workflowRetrieved).to.deep.equal(workflowCreated);
}

async function getListWorkflows(query: string, offset: number, limit: number): Promise<ListWorkflowResponse> {
  return await safeGet(`${v2Prefix}/workflows?query=${query}&offset=${offset}&limit=${limit}`);
}

// eslint-disable-next-line @typescript-eslint/naming-convention
interface AllAndValidate {
  msgPrefix?: string;
  searchQuery: string;
  offset?: number;
  limit?: number;
  expectedTotalResults: number;
  expectedArraySize: number;
}

function buildLogMsg(
  { msgPrefix = '', searchQuery = '', offset = 0, limit = 50, expectedTotalResults, expectedArraySize }: AllAndValidate,
  listWorkflowResponse: ListWorkflowResponse
): string {
  return `Log - msgPrefix: ${msgPrefix}, 
  searchQuery: ${searchQuery}, 
  offset: ${offset}, 
  limit: ${limit}, 
  expectedTotalResults: ${expectedTotalResults ?? 'Not specified'}, 
  expectedArraySize: ${expectedArraySize ?? 'Not specified'}
  response: 
  ${JSON.stringify(listWorkflowResponse || 'Not specified', null, 2)}`;
}

async function getAllAndValidate({
  msgPrefix = '',
  searchQuery = '',
  offset = 0,
  limit = 50,
  expectedTotalResults,
  expectedArraySize,
}: AllAndValidate): Promise<WorkflowListResponseDto[]> {
  const listWorkflowResponse: ListWorkflowResponse = await getListWorkflows(searchQuery, offset, limit);
  const summery: string = buildLogMsg(
    {
      msgPrefix,
      searchQuery,
      offset,
      limit,
      expectedTotalResults,
      expectedArraySize,
    },
    listWorkflowResponse
  );
  expect(listWorkflowResponse.workflows).to.be.an('array', summery);
  expect(listWorkflowResponse.workflows).lengthOf(expectedArraySize, ` workflowSummaries length${summery}`);
  expect(listWorkflowResponse.totalCount).to.be.equal(expectedTotalResults, `total Results don't match${summery}`);

  return listWorkflowResponse.workflows;
}

async function deleteWorkflowRest(_id: string): Promise<void> {
  await safeDelete(`${v2Prefix}/workflows/${_id}`);
}

async function deleteWorkflowAndValidateDeletion(_id: string): Promise<void> {
  await deleteWorkflowRest(_id);
  await validateWorkflowDeleted(_id);
}

function extractIDs(workflowSummaries: WorkflowListResponseDto[]) {
  return workflowSummaries.map((workflow) => workflow._id);
}

function buildIdSet(
  listWorkflowResponse1: WorkflowListResponseDto[],
  listWorkflowResponse2: WorkflowListResponseDto[]
) {
  return new Set([...extractIDs(listWorkflowResponse1), ...extractIDs(listWorkflowResponse2)]);
}

function removeFields<T>(obj: T, ...keysToRemove: (keyof T)[]): T {
  const objCopy = JSON.parse(JSON.stringify(obj));
  keysToRemove.forEach((key) => {
    delete objCopy[key as keyof T];
  });

  return objCopy;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
interface ApiResponse {
  req: {
    method: string; // e.g., "GET"
    url: string; // e.g., "http://127.0.0.1:1337/v1/v2/workflows/66e929c6667852862a1e5145"
    headers: {
      authorization: string; // e.g., "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX5cJ9..."
      'novu-environment-id': string; // e.g., "66e929c6667852862a1e50e4"
    };
  };
  header: {
    'content-security-policy': string;
    'cross-origin-embedder-policy': string;
    'cross-origin-opener-policy': string;
    'cross-origin-resource-policy': string;
    'x-dns-prefetch-control': string;
    'x-frame-options': string;
    'strict-transport-security': string;
    'x-download-options': string;
    'x-content-type-options': string;
    'origin-agent-cluster': string;
    'x-permitted-cross-domain-policies': string;
    'referrer-policy': string;
    'x-xss-protection': string;
    'access-control-allow-origin': string;
    'content-type': string;
    'content-length': string;
    etag: string;
    vary: string;
    date: string;
    connection: string;
  };
  status: number; // e.g., 400
  text: string; // e.g., "{\"message\":\"Workflow not found with id: 66e929c6667852862a1e5145\",\"error\":\"Bad Request\",\"statusCode\":400}"
}

async function safeGet<T>(url: string): Promise<T> {
  return (await safeRest(url, () => session.testAgent.get(url) as unknown as Promise<ApiResponse>)) as T;
}

async function safeDelete<T>(url: string): Promise<void> {
  await safeRest(url, () => session.testAgent.delete(url) as unknown as Promise<ApiResponse>, 204);
}

function generateUUID(): string {
  // Generate a random 4-byte hex string
  const randomHex = () => randomBytes(2).toString('hex');

  // Construct the UUID using the random hex values
  return `${randomHex()}${randomHex()}-${randomHex()}-${randomHex()}-${randomHex()}-${randomHex()}${randomHex()}${randomHex()}`;
}

function convertResponseToUpdateDto(workflowCreated: WorkflowResponseDto): UpsertWorkflowBody {
  const workflowWithoutResponseFields = removeFields(workflowCreated, 'updatedAt', '_id', 'status');
  const steps: UpsertStepBody[] = workflowWithoutResponseFields.steps.map((step) => removeFields(step, 'stepId'));

  return { ...workflowWithoutResponseFields, steps };
}

function createStep(): StepCreateDto {
  return {
    name: 'someStep',
    type: StepTypeEnum.SMS,
  };
}

function buildUpdateRequest(workflowCreated: WorkflowResponseDto): UpdateWorkflowDto {
  const steps = [createStep()];
  const updateRequest = removeFields(workflowCreated, 'updatedAt', '_id', 'status') as UpdateWorkflowDto;

  return {
    ...updateRequest,
    name: TEST_WORKFLOW_UPDATED_NAME,
    steps,
  };
}
