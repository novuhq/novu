// TODO: Move this file under e2e folder and merge it with the one that has the same name

import chai, { expect } from 'chai';
import chaiSubset from 'chai-subset';
import {
  ApiServiceLevelEnum,
  createWorkflowClient,
  CreateWorkflowDto,
  DEFAULT_WORKFLOW_PREFERENCES,
  FeatureNameEnum,
  getFeatureForTierAsNumber,
  JSONSchemaDefinition,
  JSONSchemaDto,
  ListWorkflowResponse,
  ShortIsPrefixEnum,
  slugify,
  StepContentIssueEnum,
  StepCreateDto,
  StepTypeEnum,
  UpdateWorkflowDto,
  WorkflowCreationSourceEnum,
  WorkflowListResponseDto,
  WorkflowOriginEnum,
  WorkflowResponseDto,
  WorkflowStatusEnum,
} from '@novu/shared';
import { PreferencesRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';

import { stepTypeToControlSchema } from './shared';
import { buildSlug } from '../shared/helpers/build-slug';

chai.use(chaiSubset);

// TODO: Introduce test factories for steps and workflows and move the following build functions there
function buildInAppStep(overrides: Partial<StepCreateDto> = {}): StepCreateDto {
  return {
    name: 'In-App Test Step',
    type: StepTypeEnum.IN_APP,
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

function buildEmailStep(overrides: Partial<StepCreateDto> = {}): StepCreateDto {
  return {
    name: 'Email Test Step',
    type: StepTypeEnum.EMAIL,
    ...overrides,
  };
}

export function buildWorkflow(overrides: Partial<CreateWorkflowDto> = {}): CreateWorkflowDto {
  const name = overrides.name || 'Test Workflow';

  return {
    __source: WorkflowCreationSourceEnum.EDITOR,
    name,
    workflowId: slugify(name),
    description: 'This is a test workflow',
    active: true,
    tags: ['tag1', 'tag2'],
    steps: [buildEmailStep(), buildInAppStep()],
    ...overrides,
  };
}

let session: UserSession;

function setHeaders(overrideEnv?: string): HeadersInit {
  return {
    Authorization: session.token,
    'Novu-Environment-Id': overrideEnv || session.environment._id,
  };
}

describe('Workflow Controller E2E API Testing #novu-v2', () => {
  let apiClient: ReturnType<typeof createWorkflowClient>;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    apiClient = createWorkflowClient(session.serverUrl, setHeaders());
  });

  describe('Create workflow', () => {
    it('should allow creating two workflows for the same user with the same name', async () => {
      const name = `Test Workflow${new Date().toISOString()}`;
      await createWorkflowAndValidate(name);
      const createWorkflowDto: CreateWorkflowDto = buildWorkflow({ name });
      const res = await apiClient.createWorkflow(createWorkflowDto);
      expect(res.isSuccessResult()).to.be.true;
      if (res.isSuccessResult()) {
        const workflowCreated: WorkflowResponseDto = res.value;
        expect(workflowCreated.workflowId).to.include(`${slugify(name)}-`);
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

      const createWorkflowDto: CreateWorkflowDto = buildWorkflow({ steps });
      const res = await apiClient.createWorkflow(createWorkflowDto);
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

    it('should not allow to create more than 20 workflows for a free organization', async () => {
      await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.FREE);
      getFeatureForTierAsNumber(FeatureNameEnum.PLATFORM_MAX_WORKFLOWS, ApiServiceLevelEnum.FREE, false);
      for (let i = 0; i < 20; i += 1) {
        const createWorkflowDto: CreateWorkflowDto = buildWorkflow({ name: new Date().toISOString() + i });
        const res = await apiClient.createWorkflow(createWorkflowDto);
      }

      const createWorkflowDto: CreateWorkflowDto = buildWorkflow({ name: new Date().toISOString() });
      const res = await apiClient.createWorkflow(createWorkflowDto);

      expect(res.isSuccessResult()).to.be.false;
      const { error } = res;
      expect(error?.status).eq(400);
    });
  });

  describe('Update workflow', () => {
    it('should update control values', async () => {
      const nameSuffix = `Test Workflow${new Date().toISOString()}`;
      const workflowCreated: WorkflowResponseDto = await createWorkflowAndValidate(nameSuffix);
      const inAppControlValue = 'In-App Test';
      const emailControlValue = 'Email Test';
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
      const updatedWorkflow: WorkflowResponseDto = await updateWorkflow(
        workflowCreated._id,
        updateRequest as UpdateWorkflowDto
      );
      // TODO: Control values must be typed and accept only valid control values
      expect(updatedWorkflow.steps[0].controls.values.test).to.be.equal(inAppControlValue);
      expect(updatedWorkflow.steps[1].controls.values.test).to.be.equal(emailControlValue);
    });

    it('should keep the step id on updated ', async () => {
      const nameSuffix = `Test Workflow${new Date().toISOString()}`;
      const workflowCreated: WorkflowResponseDto = await createWorkflowAndValidate(nameSuffix);
      const updatedWorkflow = await updateWorkflow(workflowCreated._id, workflowCreated);
      const updatedStep = updatedWorkflow.steps[0];
      const originalStep = workflowCreated.steps[0];
      expect(updatedStep._id).to.be.ok;
      expect(updatedStep._id).to.be.equal(originalStep._id);
    });

    it('should update user preferences', async () => {
      const nameSuffix = `Test Workflow${new Date().toISOString()}`;
      const workflowCreated: WorkflowResponseDto = await createWorkflowAndValidate(nameSuffix);
      const updatedWorkflow = await updateWorkflow(workflowCreated._id, {
        ...workflowCreated,
        preferences: {
          user: { ...DEFAULT_WORKFLOW_PREFERENCES, all: { ...DEFAULT_WORKFLOW_PREFERENCES.all, enabled: false } },
        },
      });
      expect(updatedWorkflow.preferences.user, JSON.stringify(updatedWorkflow, null, 2)).to.be.ok;
      expect(updatedWorkflow.preferences?.user?.all.enabled, JSON.stringify(updatedWorkflow, null, 2)).to.be.false;

      const updatedWorkflow2 = await updateWorkflow(workflowCreated._id, {
        ...workflowCreated,
        preferences: {
          user: null,
        },
      });
      expect(updatedWorkflow2.preferences.user).to.be.null;
      expect(updatedWorkflow2.preferences.default).to.be.ok;
    });

    it('should update by slugify ids', async () => {
      const workflowCreated = await createWorkflowAndValidate();
      const { _id, workflowId, slug, updatedAt } = workflowCreated;

      await updateWorkflowAndValidate(_id, updatedAt, { ...workflowCreated, name: 'Test Workflow 1' });
      await updateWorkflowAndValidate(workflowId, updatedAt, { ...workflowCreated, name: 'Test Workflow 2' });
      await updateWorkflowAndValidate(slug, updatedAt, { ...workflowCreated, name: 'Test Workflow 3' });
    });
  });

  describe('List workflows', () => {
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
      await create10Workflows('Test Workflow');
      await getAllAndValidate({
        searchQuery: 'Test Workflow',
        offset: 11,
        limit: 15,
        expectedTotalResults: 10,
        expectedArraySize: 0,
      });
    });

    it('should return all results within range', async () => {
      await create10Workflows('Test Workflow');
      await getAllAndValidate({
        searchQuery: 'Test Workflow',
        offset: 0,
        limit: 15,
        expectedTotalResults: 10,
        expectedArraySize: 10,
      });
    });

    it('should return results without query', async () => {
      await create10Workflows('Test Workflow');
      await getAllAndValidate({
        searchQuery: 'Test Workflow',
        offset: 0,
        limit: 15,
        expectedTotalResults: 10,
        expectedArraySize: 10,
      });
    });

    it('paginate workflows without overlap', async () => {
      await create10Workflows('Test Workflow');
      const listWorkflowResponse1 = await getAllAndValidate({
        searchQuery: 'Test Workflow',
        offset: 0,
        limit: 5,
        expectedTotalResults: 10,
        expectedArraySize: 5,
      });
      const listWorkflowResponse2 = await getAllAndValidate({
        searchQuery: 'Test Workflow',
        offset: 5,
        limit: 5,
        expectedTotalResults: 10,
        expectedArraySize: 5,
      });
      const idsDeduplicated = new Set([
        ...listWorkflowResponse1.map((workflow) => workflow._id),
        ...listWorkflowResponse2.map((workflow) => workflow._id),
      ]);
      expect(idsDeduplicated.size).to.be.equal(10);
    });

    async function createV0Workflow() {
      const novuRestResult = await apiClient.createWorkflowsV1({
        name: `Test V0 Workflow`,
        description: 'This is a test description',
        tags: ['test-tag-api'],
        notificationGroupId: session.notificationGroups[0]._id,
        steps: [],
      });
      if (!novuRestResult.isSuccessResult()) {
        throw new Error(`Failed to create V0 Workflow ${JSON.stringify(novuRestResult.error)}`);
      }

      return novuRestResult.value;
    }

    async function searchWorkflowsV0(workflowId?: string) {
      const novuRestResult = await apiClient.searchWorkflowsV1(workflowId);
      if (!novuRestResult.isSuccessResult()) {
        throw new Error('should not fail to get list ');
      }

      return novuRestResult.value;
    }

    async function getV2WorkflowIdAndExternalId(prefix: string) {
      await create10Workflows(prefix);
      const listWorkflowResponse: ListWorkflowResponse = await listWorkflows(prefix, 0, 5);
      const workflowV2Id = listWorkflowResponse.workflows[0]._id;
      const { workflowId } = listWorkflowResponse.workflows[0];

      return { workflowV2Id, workflowId, name: listWorkflowResponse.workflows[0].name };
    }

    it('old list endpoint should not retreive the new workflow', async () => {
      const { workflowV2Id, name } = await getV2WorkflowIdAndExternalId('Test Workflow');
      const [, , workflowV0Created] = await Promise.all([createV0Workflow(), createV0Workflow(), createV0Workflow()]);
      let workflowsFromSearch = await searchWorkflowsV0(workflowV0Created?.name);
      expect(workflowsFromSearch[0]._id).to.deep.eq(workflowV0Created._id);

      workflowsFromSearch = await searchWorkflowsV0();
      const ids = workflowsFromSearch?.map((workflow) => workflow._id);
      const found = ids?.some((localId) => localId === workflowV2Id);
      expect(found, `FoundIds:${ids} SearchedID:${workflowV2Id}`).to.be.false;

      workflowsFromSearch = await searchWorkflowsV0(name);
      expect(workflowsFromSearch?.length).to.eq(0);
    });
  });

  describe('Promote workflow', () => {
    it('should promote by creating a new workflow in production environment with the same properties', async () => {
      // Create a workflow in the development environment
      const createWorkflowDto = buildWorkflow({
        name: 'Promote Workflow',
        steps: [
          buildEmailStep({
            controlValues: { body: 'Example body', subject: 'Example subject' },
          }),
          buildInAppStep({
            controlValues: { body: 'Example body' },
          }),
        ],
      });
      const res = await apiClient.createWorkflow(createWorkflowDto);
      if (!res.isSuccessResult()) {
        throw new Error(res.error!.responseText);
      }
      let devWorkflow = res.value;

      // Update the workflow name to make sure the workflow identifier is the same after promotion
      devWorkflow = await updateWorkflow(devWorkflow._id, {
        ...devWorkflow,
        name: `${devWorkflow.name}-updated`,
      });
      devWorkflow = await getWorkflow(devWorkflow._id);

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
      const createWorkflowDto = buildWorkflow({
        name: 'Promote Workflow',
        steps: [
          buildEmailStep({
            controlValues: { body: 'Example body', subject: 'Example subject' },
          }),
          buildInAppStep({
            controlValues: { body: 'Example body' },
          }),
        ],
      });
      const res = await apiClient.createWorkflow(createWorkflowDto);
      if (!res.isSuccessResult()) {
        throw new Error(res.error!.responseText);
      }
      const devWorkflow = res.value;

      // Promote the workflow to production
      const resPromoteCreate = await session.testAgent.put(`/v2/workflows/${devWorkflow._id}/sync`).send({
        targetEnvironmentId: prodEnvironmentId,
      });
      expect(resPromoteCreate.status).to.equal(200);
      const prodWorkflowCreated = resPromoteCreate.body.data;

      // Update the workflow in the development environment
      const updateDto: UpdateWorkflowDto = {
        ...devWorkflow,
        name: 'Updated Name',
        description: 'Updated Description',
        // modify existing Email Step, add new InApp Steps, previously existing InApp Step is removed
        steps: [
          {
            ...buildEmailStep({ controlValues: { body: 'Example body', subject: 'Example subject' } }),
            _id: devWorkflow.steps[0]._id,
            name: 'Updated Email Step',
          },
          { ...buildInAppStep({ controlValues: { body: 'Example body' } }), name: 'New InApp Step' },
        ],
      };
      await updateWorkflowAndValidate(devWorkflow._id, devWorkflow.updatedAt, updateDto);

      // Promote the updated workflow to production
      const resPromoteUpdate = await session.testAgent.put(`/v2/workflows/${devWorkflow._id}/sync`).send({
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
      expect(prodWorkflowUpdated.steps[0].controls.values).to.deep.equal({
        body: 'Example body',
        subject: 'Example subject',
      });

      // Verify new created step
      expect(prodWorkflowUpdated.steps[1].name).to.equal('New InApp Step');
      expect(prodWorkflowUpdated.steps[1]._id).to.not.equal(prodWorkflowCreated.steps[1]._id);
      expect(prodWorkflowUpdated.steps[1].stepId).to.equal('new-in-app-step');
      expect(prodWorkflowUpdated.steps[1].controls.values).to.deep.equal({
        body: 'Example body',
      });
    });

    it('should throw an error if trying to promote to the same environment', async () => {
      const devWorkflow = await createWorkflowAndValidate('-promote-workflow');

      const res = await session.testAgent.put(`/v2/workflows/${devWorkflow._id}/sync`).send({
        targetEnvironmentId: session.environment._id,
      });

      expect(res.status).to.equal(400);
      expect(res.body.message).to.equal('Cannot sync workflow to the same environment');
    });

    it('should throw an error if the workflow to promote is not found', async () => {
      const res = await session.testAgent.put(`/v2/workflows/123/sync`).send({ targetEnvironmentId: '123' });

      expect(res.status).to.equal(404);
      expect(res.body.message).to.equal('Workflow cannot be found');
      expect(res.body.ctx.workflowId).to.equal('123');
    });
  });

  describe('Get workflow', () => {
    it('should get by slugify ids', async () => {
      const workflowCreated = await createWorkflowAndValidate('XYZ');

      const internalId = workflowCreated._id;
      const workflowRetrievedByInternalId = await getWorkflow(internalId);
      expect(workflowRetrievedByInternalId._id).to.equal(internalId);

      const slugPrefixAndEncodedInternalId = buildSlug(`my-workflow`, ShortIsPrefixEnum.WORKFLOW, internalId);
      const workflowRetrievedBySlugPrefixAndEncodedInternalId = await getWorkflow(slugPrefixAndEncodedInternalId);
      expect(workflowRetrievedBySlugPrefixAndEncodedInternalId._id).to.equal(internalId);

      const workflowIdentifier = workflowCreated.workflowId;
      const workflowRetrievedByWorkflowIdentifier = await getWorkflow(workflowIdentifier);
      expect(workflowRetrievedByWorkflowIdentifier._id).to.equal(internalId);
    });

    it('should return 404 if workflow does not exist', async () => {
      const notExistingId = '123';
      const novuRestResult = await apiClient.getWorkflow(notExistingId);
      expect(novuRestResult.isSuccess).to.be.false;
      expect(novuRestResult.error).to.be.ok;
      expect(novuRestResult.error!.status).to.equal(404);
      expect(novuRestResult.error!.responseText).to.contain('Workflow');
      const parse = JSON.parse(novuRestResult.error!.responseText);
      expect(parse.ctx.workflowId).to.contain(notExistingId);
    });
  });

  describe('Duplicate workflow', () => {
    it('should duplicate a workflow', async () => {
      const workflowCreated = await createWorkflowAndValidate('XYZ');
      const duplicatedWorkflow = await apiClient.duplicateWorkflow(workflowCreated._id, {
        name: 'Duplicated Workflow',
      });
      expect(duplicatedWorkflow.isSuccessResult()).to.be.true;

      expect(duplicatedWorkflow.value?._id).to.not.equal(workflowCreated._id);
      expect(duplicatedWorkflow.value?.active).to.be.false;
      expect(duplicatedWorkflow.value?.name).to.equal('Duplicated Workflow');
      expect(duplicatedWorkflow.value?.description).to.equal(workflowCreated.description);
      expect(duplicatedWorkflow.value?.tags).to.deep.equal(workflowCreated.tags);
      expect(duplicatedWorkflow.value?.steps.length).to.equal(workflowCreated.steps.length);
      duplicatedWorkflow.value?.steps.forEach((step, index) => {
        expect(step.name).to.equal(workflowCreated.steps[index].name);
        expect(step._id).to.not.equal(workflowCreated.steps[index]._id);
      });
      expect(duplicatedWorkflow.value?.preferences).to.deep.equal(workflowCreated.preferences);
    });

    it('should duplicate a workflow with overrides', async () => {
      const workflowCreated = await createWorkflowAndValidate('XYZ');
      const duplicatedWorkflow = await apiClient.duplicateWorkflow(workflowCreated._id, {
        name: 'Duplicated Workflow',
        tags: ['tag1', 'tag2'],
        description: 'New Description',
      });
      expect(duplicatedWorkflow.isSuccessResult()).to.be.true;
      expect(duplicatedWorkflow.value?._id).to.not.equal(workflowCreated._id);
      expect(duplicatedWorkflow.value?.active).to.be.false;
      expect(duplicatedWorkflow.value?.name).to.equal('Duplicated Workflow');
      expect(duplicatedWorkflow.value?.description).to.equal('New Description');
      expect(duplicatedWorkflow.value?.tags).to.deep.equal(['tag1', 'tag2']);
    });

    it('should throw an error if the workflow to duplicate is not found', async () => {
      const res = await apiClient.duplicateWorkflow('123', { name: 'Duplicated Workflow' });
      expect(res.isSuccessResult()).to.be.false;
      expect(res.error!.status).to.equal(404);
      expect(res.error!.responseText).to.contain('Workflow');
      const parse = JSON.parse(res.error!.responseText);
      expect(parse.ctx.workflowId).to.contain('123');
    });
  });

  describe('Get step data', () => {
    it('should get step by worflow slugify ids', async () => {
      const workflowCreated = await createWorkflowAndValidate('XYZ');
      const internalWorkflowId = workflowCreated._id;
      const stepId = workflowCreated.steps[0]._id;

      const stepRetrievedByWorkflowInternalId = await getStepData(internalWorkflowId, stepId);
      expect(stepRetrievedByWorkflowInternalId._id).to.equal(stepId);

      const slugPrefixAndEncodedWorkflowInternalId = buildSlug(
        `my-workflow`,
        ShortIsPrefixEnum.WORKFLOW,
        internalWorkflowId
      );
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

      const slugPrefixAndEncodedStepId = buildSlug(`my-step`, ShortIsPrefixEnum.STEP, stepId);
      const stepRetrievedBySlugPrefixAndEncodedStepId = await getStepData(
        internalWorkflowId,
        slugPrefixAndEncodedStepId
      );
      expect(stepRetrievedBySlugPrefixAndEncodedStepId._id).to.equal(stepId);

      const stepIdentifier = workflowCreated.steps[0].stepId;
      const stepRetrievedByStepIdentifier = await getStepData(internalWorkflowId, stepIdentifier);
      expect(stepRetrievedByStepIdentifier._id).to.equal(stepId);
    });

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
      const createWorkflowDto: CreateWorkflowDto = buildWorkflow({ steps });
      const res = await session.testAgent.post(`/v2/workflows`).send(createWorkflowDto);
      expect(res.status).to.be.equal(201);
      const workflowCreated: WorkflowResponseDto = res.body.data;
      const workflowTestData = await getWorkflowTestData(workflowCreated._id);

      expect(workflowTestData).to.be.ok;
      const { payload } = workflowTestData;
      if (typeof payload === 'boolean') throw new Error('Variables is not an object');

      expect(payload.properties).to.have.property('emailPrefixBodyText');
      expect(payload.properties?.emailPrefixBodyText).to.have.property('default').that.equals('emailPrefixBodyText');

      expect(payload.properties).to.have.property('prefixSubjectText');
      expect(payload.properties?.prefixSubjectText).to.have.property('default').that.equals('prefixSubjectText');

      expect(payload.properties).to.have.property('inAppSubjectText');
      expect(payload.properties?.inAppSubjectText).to.have.property('default').that.equals('inAppSubjectText');
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
        const createWorkflowDto: CreateWorkflowDto = buildWorkflow({ steps });
        const res = await apiClient.createWorkflow(createWorkflowDto);
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
        expect(JSON.stringify(payloadVariables)).to.contain('prefixBodyText2');
        expect(JSON.stringify(payloadVariables)).to.contain('prefixSubjectText');
      });
      it('should serve previous step variables with payload schema', async () => {
        const steps = [
          buildDigestStep(),
          { ...buildInAppStep(), controlValues: { subject: 'Welcome to our newsletter {{payload.inAppSubjectText}}' } },
        ];
        const createWorkflowDto: CreateWorkflowDto = buildWorkflow({ steps });
        const res = await apiClient.createWorkflow(createWorkflowDto);
        if (!res.isSuccessResult()) {
          throw new Error(res.error!.responseText);
        }
        const novuRestResult = await apiClient.getWorkflowStepData(res.value._id, res.value.steps[1]._id);
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

  describe('Patch workflow', () => {
    it('should work and allow us to turn workflow active on / off and have the status change accordingly', async () => {
      const workflowDto = await createWorkflow(buildWorkflow());
      let updatedWorkflow = await patchWorkflow(workflowDto._id, false);
      expect(updatedWorkflow.status).to.equal(WorkflowStatusEnum.INACTIVE);
      updatedWorkflow = await patchWorkflow(workflowDto._id, true);
      expect(updatedWorkflow.status).to.equal(WorkflowStatusEnum.ACTIVE);
    });
  });

  describe('Delete workflow', () => {
    it('should delete a workflow', async () => {
      const { _id, workflowId } = await createWorkflowAndValidate();
      await session.testAgent.del(`/v2/workflows/${workflowId}`).expect(204);
      await session.testAgent.get(`/v2/workflows/${workflowId}`).expect(404);

      const preferencesRepository = new PreferencesRepository();
      const preferences = await preferencesRepository.find({
        _templateId: _id,
        _organizationId: session.organization._id,
      });
      expect(preferences.length).to.equal(0);
    });
  });

  describe('Error handling', () => {
    it('should show status ok when no problems', async () => {
      const workflowCreated = await createWorkflowAndValidate();
      await getWorkflowAndValidate(workflowCreated);
    });

    describe('workflow validation issues', () => {
      it('should respond with 400 when name is empty', async () => {
        const createWorkflowDto: CreateWorkflowDto = buildWorkflow({ name: '' });

        const res = await apiClient.createWorkflow(createWorkflowDto);
        expect(res.isSuccessResult()).to.be.false;
        expect(res.error?.responseText).to.include('name must be longer than or equal to 1 characters');
      });

      it('should respond with 400 when name is too long', async () => {
        const createWorkflowDto: CreateWorkflowDto = buildWorkflow({
          name: Array.from({ length: 80 }).join('X'),
        });

        const res = await apiClient.createWorkflow(createWorkflowDto);
        expect(res.isSuccessResult()).to.be.false;
        expect(res.error?.responseText).to.include('name must be shorter than or equal to 64 characters');
      });

      it('should respond with 400 when description is too long', async () => {
        const createWorkflowDto: CreateWorkflowDto = buildWorkflow({
          description: Array.from({ length: 260 }).join('X'),
        });

        const res = await apiClient.createWorkflow(createWorkflowDto);
        expect(res.isSuccessResult()).to.be.false;
        expect(res.error?.responseText).to.include('description must be shorter than or equal to 256 characters');
      });

      it('should respond with 400 when description is too long on an update call', async () => {
        const createWorkflowDto = buildWorkflow();

        const res = await apiClient.createWorkflow(createWorkflowDto);
        expect(res.isSuccessResult()).to.be.true;

        if (res.isSuccessResult()) {
          const updateWorkflowDto = {
            ...res.value,
            description: Array.from({ length: 260 }).join('X'),
          };
          const updateResult = await apiClient.updateWorkflow(res.value?._id, updateWorkflowDto);
          expect(updateResult.isSuccessResult(), JSON.stringify(updateResult.value)).to.be.false;
          if (!updateResult.isSuccessResult()) {
            expect(updateResult.error?.responseText).to.include(
              'description must be shorter than or equal to 256 characters'
            );
          }
        }
      });

      it('should respond with 400 when a tag is too long', async () => {
        const createWorkflowDto: CreateWorkflowDto = buildWorkflow({
          tags: ['tag1', Array.from({ length: 50 }).join('X')],
        });

        const res = await apiClient.createWorkflow(createWorkflowDto);
        expect(res.isSuccessResult()).to.be.false;
        expect(res.error?.responseText).to.include(
          'each value in tags must be longer than or equal to 1 and shorter than or equal to 32 characters'
        );
      });

      it('should respond with 400 when a tag is empty', async () => {
        const createWorkflowDto: CreateWorkflowDto = buildWorkflow({
          tags: ['tag1', ''],
        });

        const res = await apiClient.createWorkflow(createWorkflowDto);
        expect(res.isSuccessResult()).to.be.false;
        expect(res.error?.responseText).to.include(
          'each value in tags must be longer than or equal to 1 and shorter than or equal to 32 characters'
        );
      });

      it('should respond with 400 when a duplicate tag is provided', async () => {
        const createWorkflowDto: CreateWorkflowDto = buildWorkflow({
          tags: ['tag1', 'tag1'],
        });

        const res = await apiClient.createWorkflow(createWorkflowDto);
        expect(res.isSuccessResult()).to.be.false;
        expect(res.error?.responseText).to.include("All tags's elements must be unique");
      });

      it('should respond with 400 when more than 16 tags are provided', async () => {
        const createWorkflowDto: CreateWorkflowDto = buildWorkflow({
          tags: Array.from({ length: 17 }).map((_, index) => `tag${index}`),
        });

        const res = await apiClient.createWorkflow(createWorkflowDto);
        expect(res.isSuccessResult()).to.be.false;
        expect(res.error?.responseText).to.include('tags must contain no more than 16 elements');
      });
    });

    describe('steps validation', () => {
      it('should throw 400 when name is empty', async () => {
        // @ts-ignore
        const overrideDto = { steps: [{ ...buildEmailStep(), name: '' } as unknown as StepCreateDto] };
        const createWorkflowDto: CreateWorkflowDto = buildWorkflow();
        const dtoWithoutName = { ...createWorkflowDto, ...overrideDto };

        const res = await apiClient.createWorkflow(dtoWithoutName);
        if (res.isSuccessResult()) {
          throw new Error(`should fail${JSON.stringify(res.value)}`);
        }
        expect(res.error?.responseText, res.error?.responseText).to.contain('name');
      });

      describe('step control issues', () => {
        it('should return issues for all steps immediately', async () => {
          const createWorkflowDto: CreateWorkflowDto = buildWorkflow({
            steps: [
              {
                name: 'In-App Test Step',
                type: StepTypeEnum.IN_APP,
                controlValues: {
                  // body is missing on purpose
                  redirect: { url: 'not-good-url-please-replace', target: '_blank' },
                  primaryAction: {
                    label: 'primary',
                    redirect: { url: 'not-good-url-please-replace', target: '_blank' },
                  },
                  secondaryAction: {
                    label: 'secondary',
                    redirect: { url: 'not-good-url-please-replace', target: '_blank' },
                  },
                },
              },
            ],
          });

          const { value: createdWorkflow } = await apiClient.createWorkflow(createWorkflowDto);

          const stepData = await getStepData(createdWorkflow!._id, createdWorkflow!.steps[0]._id);
          expect(stepData.issues!.controls!.body).to.eql([
            { message: 'Body is required', issueType: 'MISSING_VALUE', variableName: 'body' },
          ]);

          // TODO: This should return a different type such as 'INVALID_URL'
          expect(stepData.issues!.controls!['redirect.url'][0].issueType).to.equal('MISSING_VALUE');
          expect(stepData.issues!.controls!['primaryAction.redirect.url'][0].issueType).to.equal('MISSING_VALUE');
          expect(stepData.issues!.controls!['secondaryAction.redirect.url'][0].issueType).to.equal('MISSING_VALUE');
        });

        it('should always show digest control value issues when illegal value provided', async () => {
          const steps = [{ ...buildDigestStep({ controlValues: { amount: '555', unit: 'days' } }) }];
          const workflowCreated = await createWorkflow(buildWorkflow({ steps }));
          const step = workflowCreated.steps[0];

          expect(step.issues?.controls?.amount[0].issueType).to.deep.equal(StepContentIssueEnum.TIER_LIMIT_EXCEEDED);
          expect(step.issues?.controls?.unit[0].issueType).to.deep.equal(StepContentIssueEnum.TIER_LIMIT_EXCEEDED);
        });

        it('should always show issues for illegal variables in control values', async () => {
          const createWorkflowDto: CreateWorkflowDto = buildWorkflow({
            steps: [
              {
                name: 'Email Test Step',
                type: StepTypeEnum.EMAIL,
                controlValues: { body: 'Welcome {{}}' },
              },
            ],
          });

          const res = await apiClient.createWorkflow(createWorkflowDto);
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
      });
    });
  });

  /*
   * =======================================================================================================
   * TODO: All helper functions below should be replaced by the internal Novu SDK autogenerated by Speakeasy
   * ==================================================================================================
   */

  async function createWorkflow(newVar: CreateWorkflowDto): Promise<WorkflowResponseDto> {
    const res = await apiClient.createWorkflow(newVar);
    if (!res.isSuccessResult()) {
      throw new Error(res.error!.responseText);
    }

    return res.value;
  }

  async function getWorkflow(id: string): Promise<WorkflowResponseDto> {
    const res = await apiClient.getWorkflow(id);
    if (!res.isSuccessResult()) {
      throw new Error(res.error!.responseText);
    }

    return res.value;
  }

  async function patchWorkflow(workflowId: string, active: boolean) {
    const res = await apiClient.patchWorkflow(workflowId, {
      active,
    });
    if (!res.isSuccessResult()) {
      throw new Error(res.error!.responseText);
    }

    return res.value;
  }

  async function updateWorkflow(id: string, workflow: UpdateWorkflowDto): Promise<WorkflowResponseDto> {
    const res = await apiClient.updateWorkflow(id, workflow);
    if (!res.isSuccessResult()) {
      throw new Error(res.error!.responseText);
    }

    return res.value;
  }

  async function syncWorkflow(devWorkflow: WorkflowResponseDto, prodEnvironmentId: string) {
    const res = await apiClient.syncWorkflow(devWorkflow._id, {
      targetEnvironmentId: prodEnvironmentId,
    });
    if (res.isSuccessResult()) {
      return res.value;
    }
    throw new Error(res.error!.responseText);
  }

  async function getStepData(workflowId: string, stepId: string, envId?: string) {
    const novuRestResult = await createWorkflowClient(session.serverUrl, setHeaders(envId)).getWorkflowStepData(
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
    const novuRestResult = await createWorkflowClient(session.serverUrl, setHeaders(envId)).getWorkflowTestData(
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
    const updatedWorkflow: WorkflowResponseDto = await updateWorkflow(workflowRequestId, updateRequest);
    const slug = buildSlug(updateRequest.name, ShortIsPrefixEnum.WORKFLOW, updatedWorkflow._id);

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
        expect(buildSlug(stepInRequest.name, ShortIsPrefixEnum.STEP, stepInRequest._id)).to.equal(
          updatedWorkflow.steps[i].slug
        );
      }
    }

    expect(new Date(updatedWorkflow.updatedAt)).to.be.greaterThan(new Date(expectedPastUpdatedAt));
  }

  async function assertValuesInSteps(workflowCreated: WorkflowResponseDto) {
    for (const step of workflowCreated.steps) {
      expect(step).to.be.ok;
      expect(step.controls).to.be.ok;
      if (step.controls) {
        expect(step.controls.values).to.be.ok;
        expect(step.controls.dataSchema).to.be.ok;
        // @ts-expect-error containsSubset is not typed
        expect(stepTypeToControlSchema[step.type].schema).to.containSubset(step.controls.dataSchema);
        expect(step.controls.uiSchema).to.deep.equal(stepTypeToControlSchema[step.type].uiSchema);
      }
    }
  }

  async function create10Workflows(prefix: string = 'Test Workflow') {
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < 10; i++) {
      await createWorkflowAndValidate(`${prefix}-${i}`);
    }
  }

  async function createWorkflowAndValidate(name: string = 'Test Workflow'): Promise<WorkflowResponseDto> {
    const createWorkflowDto: CreateWorkflowDto = buildWorkflow({ name });
    const res = await apiClient.createWorkflow(createWorkflowDto);
    if (!res.isSuccessResult()) {
      throw new Error(res.error!.responseText);
    }
    validateCreateWorkflowResponse(res.value, createWorkflowDto);

    return res.value;
  }

  async function getWorkflowAndValidate(workflowCreated: WorkflowResponseDto) {
    const workflowRetrieved = await getWorkflow(workflowCreated._id);
    expect(workflowRetrieved).to.deep.equal(workflowCreated);
  }

  async function listWorkflows(query: string, offset: number, limit: number): Promise<ListWorkflowResponse> {
    return (await session.testAgent.get(`/v2/workflows?query=${query}&offset=${offset}&limit=${limit}`)).body.data;
  }

  async function getAllAndValidate({
    msgPrefix = '',
    searchQuery = '',
    offset = 0,
    limit = 50,
    expectedTotalResults,
    expectedArraySize,
  }: {
    msgPrefix?: string;
    searchQuery: string;
    offset?: number;
    limit?: number;
    expectedTotalResults: number;
    expectedArraySize: number;
  }): Promise<WorkflowListResponseDto[]> {
    const listWorkflowResponse: ListWorkflowResponse = await listWorkflows(searchQuery, offset, limit);
    expect(listWorkflowResponse.workflows).lengthOf(expectedArraySize);
    expect(listWorkflowResponse.totalCount).to.be.equal(expectedTotalResults);

    return listWorkflowResponse.workflows;
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
    }
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
});
