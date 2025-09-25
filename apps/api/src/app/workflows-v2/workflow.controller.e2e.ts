import { Novu } from '@novu/api';
import {
  ContentIssueEnum,
  CreateWorkflowDto,
  DigestStepUpsertDto,
  EmailStepResponseDto,
  EmailStepUpsertDto,
  InAppStepResponseDto,
  InAppStepUpsertDto,
  JSONSchemaDto,
  ListWorkflowResponse,
  ResourceOriginEnum,
  StepTypeEnum,
  UpdateWorkflowDto,
  UpdateWorkflowDtoSteps,
  WorkflowCreationSourceEnum,
  WorkflowListResponseDto,
  WorkflowStatusEnum,
} from '@novu/api/models/components';
import { ErrorDto } from '@novu/api/models/errors';
import { WorkflowResponseDto } from '@novu/api/src/models/components';
import { PreferencesRepository } from '@novu/dal';
import {
  ApiServiceLevelEnum,
  DEFAULT_WORKFLOW_PREFERENCES,
  FeatureNameEnum,
  getFeatureForTierAsNumber,
  ShortIsPrefixEnum,
  slugify,
} from '@novu/shared';
import { UserSession } from '@novu/testing';
import chai, { expect } from 'chai';
import chaiSubset from 'chai-subset';
import { buildSlug } from '../shared/helpers/build-slug';
import {
  expectSdkExceptionGeneric,
  expectSdkValidationExceptionGeneric,
  initNovuClassSdkInternalAuth,
} from '../shared/helpers/e2e/sdk/e2e-sdk.helper';

chai.use(chaiSubset);

// TODO: Introduce test factories for steps and workflows and move the following build functions there
function buildInAppStep(overrides: Partial<InAppStepUpsertDto> = {}): InAppStepUpsertDto {
  return {
    name: 'In-App Test Step',
    type: 'in_app',
    controlValues: {
      subject: 'Test Subject',
      body: 'Test Body',
    },
    ...overrides,
  } as InAppStepUpsertDto;
}

function buildDigestStep(overrides: Partial<DigestStepUpsertDto> = {}): DigestStepUpsertDto {
  return {
    name: 'Digest Test Step',
    type: 'digest',
    controlValues: {
      amount: 1,
      unit: 'hours',
    },
    ...overrides,
  } as DigestStepUpsertDto;
}

function buildEmailStep(overrides: Partial<EmailStepUpsertDto> = {}): EmailStepUpsertDto {
  return {
    name: 'Email Test Step',
    type: 'email',
    controlValues: {
      subject: 'Test Email Subject',
      body: 'Test Email Body',
      disableOutputSanitization: false,
    },
    ...overrides,
  } as EmailStepUpsertDto;
}

// biome-ignore lint/suspicious/noExportsInTest: <explanation>
export function buildWorkflow(overrides: Partial<CreateWorkflowDto> = {}): CreateWorkflowDto {
  const name = overrides.name || 'Test Workflow';

  return {
    source: WorkflowCreationSourceEnum.Editor,
    name,
    workflowId: slugify(name),
    description: 'This is a test workflow',
    active: true,
    tags: ['tag1', 'tag2'],
    steps: [buildEmailStep(), buildInAppStep()],
    ...overrides,
  } as CreateWorkflowDto;
}

let session: UserSession;

function buildHeaders(overrideEnv?: string): HeadersInit {
  return {
    Authorization: session.token,
    'Novu-Environment-Id': overrideEnv || session.environment._id,
  };
}

async function createWorkflowAndExpectError(
  apiClient: Novu,
  createWorkflowDto: CreateWorkflowDto,
  expectedPartialErrorMsg?: string
): Promise<ErrorDto> {
  const res = await expectSdkExceptionGeneric(() => apiClient.workflows.create(createWorkflowDto));
  expect(res.error).to.be.ok;
  if (expectedPartialErrorMsg) {
    expect(res.error?.message).to.include(expectedPartialErrorMsg);
  }

  return res.error!;
}
async function createWorkflowAndExpectValidationError(
  apiClient: Novu,
  createWorkflowDto: CreateWorkflowDto,
  expectedPartialErrorMsg?: string
): Promise<ErrorDto> {
  const res = await expectSdkValidationExceptionGeneric(() => apiClient.workflows.create(createWorkflowDto));
  expect(res.error).to.be.ok;
  if (expectedPartialErrorMsg) {
    expect(JSON.stringify(res.error?.errors)).to.include(expectedPartialErrorMsg);
  }

  return res.error!;
}
async function createWorkflow(apiClient: Novu, createWorkflowDto: CreateWorkflowDto) {
  return (await apiClient.workflows.create(createWorkflowDto)).result;
}

describe('Workflow Controller E2E API Testing #novu-v2', () => {
  let apiClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    apiClient = initNovuClassSdkInternalAuth(session);
  });

  describe('Create workflow', () => {
    it('should allow creating two workflows for the same user with the same name', async () => {
      const name = `Test Workflow${new Date().toISOString()}`;
      await createWorkflowAndValidate(name);
      const createWorkflowDto: CreateWorkflowDto = buildWorkflow({ name });
      const workflowCreated = await createWorkflow(apiClient, createWorkflowDto);
      expect(workflowCreated.workflowId).to.include(`${slugify(name)}-`);
    });

    it('should generate a payload schema if only control values are provided during workflow creation', async () => {
      const steps: UpdateWorkflowDtoSteps[] = [
        {
          ...buildEmailStep(),
          controlValues: {
            body: 'Welcome {{payload.name}}',
            subject: 'Hello {{payload.name}}',
          },
        } as UpdateWorkflowDtoSteps,
      ];

      const createWorkflowDto: CreateWorkflowDto = buildWorkflow({
        steps,
        payloadSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: [],
          additionalProperties: false,
        },
      });
      const workflow = await createWorkflow(apiClient, createWorkflowDto);

      expect(workflow).to.be.ok;

      expect(workflow.steps[0].variables).to.be.ok;

      const stepData = await getStepData(workflow.id, workflow.steps[0].id);
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
        await createWorkflow(apiClient, createWorkflowDto);
      }

      const createWorkflowDto: CreateWorkflowDto = buildWorkflow({ name: new Date().toISOString() });
      const error = await createWorkflowAndExpectError(apiClient, createWorkflowDto);
      expect(error?.statusCode).eq(400);
    });

    it('should create workflow with payloadSchema and validatePayload fields', async () => {
      const payloadSchema = {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'User name',
          },
          age: {
            type: 'number',
            minimum: 0,
          },
        },
        required: ['name'],
      };

      const createWorkflowDto: CreateWorkflowDto = {
        ...buildWorkflow({
          name: `Test Workflow with Schema ${new Date().toISOString()}`,
        }),
        payloadSchema,
        validatePayload: true,
      };

      const workflowCreated = await createWorkflow(apiClient, createWorkflowDto);

      expect(workflowCreated).to.be.ok;
      expect(workflowCreated.payloadSchema).to.deep.equal(payloadSchema);
      expect(workflowCreated.validatePayload).to.be.true;
    });

    it('should create workflow with validatePayload false', async () => {
      const createWorkflowDto: CreateWorkflowDto = {
        ...buildWorkflow({
          name: `Test Workflow No Validation ${new Date().toISOString()}`,
        }),
        validatePayload: false,
      };

      const workflowCreated = await createWorkflow(apiClient, createWorkflowDto);

      expect(workflowCreated).to.be.ok;
      expect(workflowCreated.validatePayload).to.be.false;
    });

    it('should reject workflow creation with invalid JSON schema', async () => {
      const invalidPayloadSchema = {
        type: 'invalid-type',
        properties: 'not-an-object',
      };

      const createWorkflowDto: CreateWorkflowDto = {
        ...buildWorkflow({
          name: `Test Invalid Schema ${new Date().toISOString()}`,
        }),
        payloadSchema: invalidPayloadSchema,
      };

      const error = await createWorkflowAndExpectValidationError(apiClient, createWorkflowDto);
      expect(error?.statusCode).to.equal(422);
      expect(JSON.stringify(error)).to.include('payloadSchema must be a valid JSON schema');
    });
  });

  describe('Update workflow', () => {
    it('should update control values', async () => {
      const nameSuffix = `Test Workflow${new Date().toISOString()}`;
      const workflowCreated: WorkflowResponseDto = await createWorkflowAndValidate(nameSuffix);
      const inAppControlValue = 'In-App Test';
      const emailControlValue = 'Email Test';
      const updateRequest: UpdateWorkflowDto = {
        origin: ResourceOriginEnum.NovuCloud,
        name: workflowCreated.name,
        preferences: {
          user: null,
        },
        steps: [
          buildInAppStep({ controlValues: { subject: inAppControlValue } }),
          buildEmailStep({ controlValues: { subject: emailControlValue } }),
        ],
        workflowId: workflowCreated.workflowId,
      } as UpdateWorkflowDto;
      const updatedWorkflow: WorkflowResponseDto = await updateWorkflow(
        workflowCreated.id,
        updateRequest as UpdateWorkflowDto
      );
      // TODO: Control values must be typed and accept only valid control values
      expect((updatedWorkflow.steps[0] as InAppStepResponseDto).controls.values.subject).to.be.equal(inAppControlValue);
      expect((updatedWorkflow.steps[1] as EmailStepResponseDto).controls.values.subject).to.be.equal(emailControlValue);
    });

    it('should keep the step id on updated ', async () => {
      const nameSuffix = `Test Workflow${new Date().toISOString()}`;
      const workflowCreated: WorkflowResponseDto = await createWorkflowAndValidate(nameSuffix);
      const updatedWorkflow = await updateWorkflow(workflowCreated.id, mapResponseToUpdateDto(workflowCreated));
      const updatedStep = updatedWorkflow.steps[0];
      const originalStep = workflowCreated.steps[0];
      expect(updatedStep.id).to.be.ok;
      expect(updatedStep.id).to.be.equal(originalStep.id);
    });

    it('should keep the step id on updated ', async () => {
      const nameSuffix = `Test Workflow${new Date().toISOString()}`;
      const workflowCreated: WorkflowResponseDto = await createWorkflowAndValidate(nameSuffix);
      expect(workflowCreated.steps.length).to.be.equal(2);

      // Verify that all step ids are unique
      const stepIds1 = workflowCreated.steps.map((step) => step.id);
      const uniqueStepIds1 = [...new Set(stepIds1)];
      expect(stepIds1.length).to.equal(uniqueStepIds1.length, 'All step ids should be unique on creation');

      // Add a step of an existing channel at the beginning of the steps array
      workflowCreated.steps = [buildInAppStep(), ...workflowCreated.steps] as any;
      const updatedWorkflow = await updateWorkflow(workflowCreated.id, mapResponseToUpdateDto(workflowCreated));
      expect(updatedWorkflow.steps.length).to.be.equal(3);

      // Verify that all step ids are unique
      const stepIds2 = workflowCreated.steps.map((step) => step.id);
      const uniqueStepIds2 = [...new Set(stepIds2)];
      expect(stepIds2.length).to.equal(uniqueStepIds2.length, 'All step ids should be unique after update');
    });

    it('should update user preferences', async () => {
      const nameSuffix = `Test Workflow${new Date().toISOString()}`;
      const workflowCreated: WorkflowResponseDto = await createWorkflowAndValidate(nameSuffix);
      const updatedWorkflow = await updateWorkflow(workflowCreated.id, {
        ...mapResponseToUpdateDto(workflowCreated),
        preferences: {
          user: { ...DEFAULT_WORKFLOW_PREFERENCES, all: { ...DEFAULT_WORKFLOW_PREFERENCES.all, enabled: false } },
        },
      });
      expect(updatedWorkflow.preferences.user, JSON.stringify(updatedWorkflow, null, 2)).to.be.ok;
      expect(updatedWorkflow.preferences?.user?.all.enabled, JSON.stringify(updatedWorkflow, null, 2)).to.be.false;

      const updatedWorkflow2 = await updateWorkflow(workflowCreated.id, {
        ...mapResponseToUpdateDto(workflowCreated),
        preferences: {
          user: null,
        },
      });
      expect(updatedWorkflow2.preferences.user).to.be.null;
      expect(updatedWorkflow2.preferences.default).to.be.ok;
    });

    it('should update by slugify ids', async () => {
      const workflowCreated = await createWorkflowAndValidate();
      const { id, workflowId, slug, updatedAt } = workflowCreated;

      await updateWorkflowAndValidate(id, updatedAt, {
        ...mapResponseToUpdateDto(workflowCreated),
        name: 'Test Workflow 1',
      });
      await updateWorkflowAndValidate(workflowId, updatedAt, {
        ...mapResponseToUpdateDto(workflowCreated),
        name: 'Test Workflow 2',
      });
      await updateWorkflowAndValidate(slug, updatedAt, {
        ...mapResponseToUpdateDto(workflowCreated),
        name: 'Test Workflow 3',
      });
    });

    it('should update workflow with payloadSchema and validatePayload fields', async () => {
      const workflowCreated = await createWorkflowAndValidate();
      const payloadSchema = {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
          },
          count: {
            type: 'number',
            minimum: 1,
          },
        },
        required: ['email'],
      };

      const updateRequest: UpdateWorkflowDto = {
        ...mapResponseToUpdateDto(workflowCreated),
        payloadSchema,
        validatePayload: true,
      } as UpdateWorkflowDto;

      const updatedWorkflow = await updateWorkflow(workflowCreated.id, updateRequest);

      expect(updatedWorkflow).to.be.ok;
      expect(updatedWorkflow.payloadSchema).to.deep.equal(payloadSchema);
      expect(updatedWorkflow.validatePayload).to.be.true;
    });

    it('should update workflow to disable payload validation', async () => {
      const workflowCreated = await createWorkflowAndValidate();

      const updateRequest: UpdateWorkflowDto = {
        ...mapResponseToUpdateDto(workflowCreated),
        validatePayload: false,
      } as UpdateWorkflowDto;

      const updatedWorkflow = await updateWorkflow(workflowCreated.id, updateRequest);

      expect(updatedWorkflow).to.be.ok;
      expect(updatedWorkflow.validatePayload).to.be.false;
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
        ...listWorkflowResponse1.map((workflow) => workflow.id),
        ...listWorkflowResponse2.map((workflow) => workflow.id),
      ]);
      expect(idsDeduplicated.size).to.be.equal(10);
    });

    async function createV0Workflow(id: number) {
      return await createWorkflowsV1({
        name: `Test V0 Workflow${id}`,
        description: 'This is a test description',
        tags: ['test-tag-api'],
        notificationGroupId: session.notificationGroups[0]._id,
        steps: [],
      });
    }

    async function searchWorkflowsV0(workflowId?: string) {
      return await searchWorkflowsV1(workflowId);
    }

    async function getV2WorkflowIdAndExternalId(prefix: string) {
      await create10Workflows(prefix);
      const listWorkflowResponse: ListWorkflowResponse = await listWorkflows(prefix, 0, 5);
      const workflowV2Id = listWorkflowResponse.workflows[0].id;
      const { workflowId } = listWorkflowResponse.workflows[0];

      return { workflowV2Id, workflowId, name: listWorkflowResponse.workflows[0].name };
    }

    it('old list endpoint should not retrieve the new workflow', async () => {
      const { workflowV2Id, name } = await getV2WorkflowIdAndExternalId('Test Workflow');
      const [, , workflowV0Created] = await Promise.all([
        createV0Workflow(1),
        createV0Workflow(2),
        createV0Workflow(3),
      ]);
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
            controlValues: { body: 'Example body', subject: 'Example subject', disableOutputSanitization: false },
          }),
          buildInAppStep({
            controlValues: { body: 'Example body' },
          }),
        ],
      } as CreateWorkflowDto);
      let devWorkflow = await createWorkflow(apiClient, createWorkflowDto);

      // Update the workflow name to make sure the workflow identifier is the same after promotion
      devWorkflow = await updateWorkflow(devWorkflow.id, {
        ...mapResponseToUpdateDto(devWorkflow),
        name: `${devWorkflow.name}-updated`,
      });
      devWorkflow = await getWorkflow(devWorkflow.id);

      // Switch to production environment and get its ID
      await session.switchToProdEnvironment();
      const prodEnvironmentId = session.environment._id;
      await session.switchToDevEnvironment();

      // Promote the workflow to production
      const prodWorkflow = await syncWorkflow(devWorkflow, prodEnvironmentId);

      // Verify that the promoted workflow has a new ID but the same workflowId
      expect(prodWorkflow.id).to.not.equal(devWorkflow.id);
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
            controlValues: {
              body: 'Example body',
              subject: 'Example subject',
              disableOutputSanitization: false,
              editorType: 'html',
            },
          }),
          buildInAppStep({
            controlValues: { body: 'Example body', disableOutputSanitization: false },
          }),
        ],
      } as CreateWorkflowDto);
      const devWorkflow = await createWorkflow(apiClient, createWorkflowDto);

      // Promote the workflow to production
      const resPromoteCreate = await apiClient.workflows.sync(
        {
          targetEnvironmentId: prodEnvironmentId,
        },
        devWorkflow.id
      );
      const prodWorkflowCreated = resPromoteCreate.result;

      // Update the workflow in the development environment
      const updateDto: UpdateWorkflowDto = {
        ...mapResponseToUpdateDto(devWorkflow),
        name: 'Updated Name',
        description: 'Updated Description',
        // modify existing Email Step, add new InApp Steps, previously existing InApp Step is removed
        steps: [
          {
            ...buildEmailStep({
              controlValues: {
                body: 'Example body',
                editorType: 'html',
                subject: 'Example subject',
                disableOutputSanitization: false,
              },
            }),
            id: devWorkflow.steps[0].id,
            name: 'Updated Email Step',
          },
          {
            ...buildInAppStep({ controlValues: { body: 'Example body', disableOutputSanitization: false } }),
            name: 'New InApp Step',
          },
        ],
      } as UpdateWorkflowDto;
      await updateWorkflowAndValidate(devWorkflow.id, devWorkflow.updatedAt, updateDto);

      // Promote the updated workflow to production
      const resPromoteUpdate = await apiClient.workflows.sync(
        {
          targetEnvironmentId: prodEnvironmentId,
        },
        devWorkflow.id
      );

      const prodWorkflowUpdated = resPromoteUpdate.result;

      // Verify that IDs remain unchanged
      expect(prodWorkflowUpdated.id).to.equal(prodWorkflowCreated.id);
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
      expect(prodWorkflowUpdated.steps[0].id).to.equal(prodWorkflowCreated.steps[0].id);
      expect(prodWorkflowUpdated.steps[0].stepId).to.equal(prodWorkflowCreated.steps[0].stepId);
      expect(prodWorkflowUpdated.steps[0].controls.values).to.deep.equal({
        body: 'Example body',
        subject: 'Example subject',
        disableOutputSanitization: false,
        editorType: 'html',
      });

      // Verify new created step
      expect(prodWorkflowUpdated.steps[1].name).to.equal('New InApp Step');
      expect(prodWorkflowUpdated.steps[1].id).to.not.equal(prodWorkflowCreated.steps[1].id);
      expect(prodWorkflowUpdated.steps[1].stepId).to.equal('new-in-app-step');
      expect(prodWorkflowUpdated.steps[1].controls.values).to.deep.equal({
        body: 'Example body',
        disableOutputSanitization: false,
      });
    });

    it('should throw an error if trying to promote to the same environment', async () => {
      const devWorkflow = await createWorkflowAndValidate('-promote-workflow');

      const { error } = await expectSdkExceptionGeneric(() =>
        apiClient.workflows.sync(
          {
            targetEnvironmentId: session.environment._id,
          },
          devWorkflow.id
        )
      );

      expect(error?.statusCode).to.equal(400);
      expect(error?.message).to.equal('Cannot sync workflow to the same environment');
    });

    it('should throw an error if the workflow to promote is not found', async () => {
      const { error } = await expectSdkExceptionGeneric(() =>
        apiClient.workflows.sync({ targetEnvironmentId: '123' }, '123')
      );

      expect(error?.statusCode).to.equal(404);
      expect(error?.message).to.equal('Workflow cannot be found');
      expect(error?.ctx?.workflowId).to.equal('123');
    });
  });

  describe('Get workflow', () => {
    it('should get by slugify ids', async () => {
      const workflowCreated = await createWorkflowAndValidate('XYZ');

      const internalId = workflowCreated.id;
      const workflowRetrievedByInternalId = await getWorkflow(internalId);
      expect(workflowRetrievedByInternalId.id).to.equal(internalId);

      const slugPrefixAndEncodedInternalId = buildSlug(`my-workflow`, ShortIsPrefixEnum.WORKFLOW, internalId);
      const workflowRetrievedBySlugPrefixAndEncodedInternalId = await getWorkflow(slugPrefixAndEncodedInternalId);
      expect(workflowRetrievedBySlugPrefixAndEncodedInternalId.id).to.equal(internalId);

      const workflowIdentifier = workflowCreated.workflowId;
      const workflowRetrievedByWorkflowIdentifier = await getWorkflow(workflowIdentifier);
      expect(workflowRetrievedByWorkflowIdentifier.id).to.equal(internalId);
    });

    it('should return 404 if workflow does not exist', async () => {
      const notExistingId = '123';
      const novuRestResult = await expectSdkExceptionGeneric(() => apiClient.workflows.get(notExistingId));
      expect(novuRestResult.error).to.be.ok;
      expect(novuRestResult.error!.statusCode).to.equal(404);
      expect(novuRestResult.error!.message).to.contain('Workflow');
      expect(novuRestResult.error!.ctx?.workflowId).to.contain(notExistingId);
    });
  });

  describe('Duplicate workflow', () => {
    it('should duplicate a workflow', async () => {
      const workflowCreated = await createWorkflowAndValidate('XYZ');
      const duplicatedWorkflow = (
        await apiClient.workflows.duplicate(
          {
            name: 'Duplicated Workflow',
          },
          workflowCreated.id
        )
      ).result;

      expect(duplicatedWorkflow?.id).to.not.equal(workflowCreated.id);
      expect(duplicatedWorkflow?.active).to.be.false;
      expect(duplicatedWorkflow?.name).to.equal('Duplicated Workflow');
      expect(duplicatedWorkflow?.description).to.equal(workflowCreated.description);
      expect(duplicatedWorkflow?.tags).to.deep.equal(workflowCreated.tags);
      expect(duplicatedWorkflow?.steps.length).to.equal(workflowCreated.steps.length);
      duplicatedWorkflow?.steps.forEach((step, index) => {
        expect(step.name).to.equal(workflowCreated.steps[index].name);
        expect(step.id).to.not.equal(workflowCreated.steps[index].id);
      });
      expect(duplicatedWorkflow?.preferences).to.deep.equal(workflowCreated.preferences);
    });

    it('should duplicate a workflow with overrides', async () => {
      const workflowCreated = await createWorkflowAndValidate('XYZ');
      const duplicatedWorkflow = (
        await apiClient.workflows.duplicate(
          {
            name: 'Duplicated Workflow',
            tags: ['tag1', 'tag2'],
            description: 'New Description',
          },
          workflowCreated.id
        )
      ).result;
      expect(duplicatedWorkflow?.id).to.not.equal(workflowCreated.id);
      expect(duplicatedWorkflow?.active).to.be.false;
      expect(duplicatedWorkflow?.name).to.equal('Duplicated Workflow');
      expect(duplicatedWorkflow?.description).to.equal('New Description');
      expect(duplicatedWorkflow?.tags).to.deep.equal(['tag1', 'tag2']);
    });

    it('should throw an error if the workflow to duplicate is not found', async () => {
      const res = await expectSdkExceptionGeneric(() =>
        apiClient.workflows.duplicate({ name: 'Duplicated Workflow' }, '123')
      );
      expect(res.error).to.be.ok;
      expect(res.error!.statusCode).to.equal(404);
      expect(res.error!.message).to.contain('Workflow');
      expect(res.error!.ctx?.workflowId).to.contain('123');
    });
  });

  describe('Get step data', () => {
    it('should get step by worflow slugify ids', async () => {
      const workflowCreated = await createWorkflowAndValidate('XYZ');
      const internalWorkflowId = workflowCreated.id;
      const stepId = workflowCreated.steps[0].id;

      const stepRetrievedByWorkflowInternalId = await getStepData(internalWorkflowId, stepId);
      expect(stepRetrievedByWorkflowInternalId.id).to.equal(stepId);

      const slugPrefixAndEncodedWorkflowInternalId = buildSlug(
        `my-workflow`,
        ShortIsPrefixEnum.WORKFLOW,
        internalWorkflowId
      );
      const stepRetrievedBySlugPrefixAndEncodedWorkflowInternalId = await getStepData(
        slugPrefixAndEncodedWorkflowInternalId,
        stepId
      );
      expect(stepRetrievedBySlugPrefixAndEncodedWorkflowInternalId.id).to.equal(stepId);

      const workflowIdentifier = workflowCreated.workflowId;
      const stepRetrievedByWorkflowIdentifier = await getStepData(workflowIdentifier, stepId);
      expect(stepRetrievedByWorkflowIdentifier.id).to.equal(stepId);
    });

    it('should get step by step slugify ids', async () => {
      const workflowCreated = await createWorkflowAndValidate('XYZ');
      const internalWorkflowId = workflowCreated.id;
      const stepId = workflowCreated.steps[0].id;

      const stepRetrievedByStepInternalId = await getStepData(internalWorkflowId, stepId);
      expect(stepRetrievedByStepInternalId.id).to.equal(stepId);

      const slugPrefixAndEncodedStepId = buildSlug(`my-step`, ShortIsPrefixEnum.STEP, stepId);
      const stepRetrievedBySlugPrefixAndEncodedStepId = await getStepData(
        internalWorkflowId,
        slugPrefixAndEncodedStepId
      );
      expect(stepRetrievedBySlugPrefixAndEncodedStepId.id).to.equal(stepId);

      const stepIdentifier = workflowCreated.steps[0].stepId;
      const stepRetrievedByStepIdentifier = await getStepData(internalWorkflowId, stepIdentifier);
      expect(stepRetrievedByStepIdentifier.id).to.equal(stepId);
    });

    describe('Variables', () => {
      it('should get step available variables', async () => {
        const steps = [
          {
            ...buildEmailStep(),
            controlValues: {
              body: 'Welcome to our newsletter {{subscriber.nonExistentValue}}{{payload.prefixBodyText2}}{{payload.prefixBodyText}}',
              editorType: 'html',
              subject: 'Welcome to our newsletter {{subjectText}} {{payload.prefixSubjectText}}',
            },
          },
          { ...buildInAppStep(), controlValues: { subject: 'Welcome to our newsletter {{inAppSubjectText}}' } },
        ];
        const createWorkflowDto: CreateWorkflowDto = buildWorkflow({
          steps: steps as UpdateWorkflowDtoSteps[],
          payloadSchema: {
            type: 'object',
            properties: {
              prefixBodyText2: { type: 'string' },
              prefixBodyText: { type: 'string' },
              prefixSubjectText: { type: 'string' },
            },
            required: [],
            additionalProperties: false,
          },
        });
        const res = await createWorkflow(apiClient, createWorkflowDto);
        const stepData = await getStepData(res.id, res.steps[0].id);
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
        const createWorkflowDto: CreateWorkflowDto = buildWorkflow({
          steps: steps as UpdateWorkflowDtoSteps[],
          payloadSchema: {
            type: 'object',
            properties: {
              inAppSubjectText: { type: 'string' },
            },
            required: [],
            additionalProperties: false,
          },
        });
        const res = await createWorkflow(apiClient, createWorkflowDto);
        const novuRestResult = await apiClient.workflows.steps.retrieve(res.id, res.steps[1].id);
        const { variables } = novuRestResult.result;
        const variableList = getJsonSchemaPrimitiveProperties(variables as JSONSchemaDto);
        const hasStepVariables = variableList.some((variable) => variable.startsWith('steps.'));
        expect(hasStepVariables, JSON.stringify(variableList)).to.be.true;
      });
    });
  });

  describe('Patch workflow', () => {
    it('should work and allow us to turn workflow active on / off and have the status change accordingly', async () => {
      const workflowDto = await createWorkflow(apiClient, buildWorkflow());
      let updatedWorkflow = await patchWorkflow(workflowDto.id, false);
      expect(updatedWorkflow.status).to.equal(WorkflowStatusEnum.Inactive);
      updatedWorkflow = await patchWorkflow(workflowDto.id, true);
      expect(updatedWorkflow.status).to.equal(WorkflowStatusEnum.Active);
    });
  });

  describe('Delete workflow', () => {
    it('should delete a workflow', async () => {
      const { id, workflowId } = await createWorkflowAndValidate();
      await apiClient.workflows.delete(workflowId);
      const { error, successfulBody } = await expectSdkExceptionGeneric(() => apiClient.workflows.delete(workflowId));
      expect(error).to.be.ok;
      expect(error?.statusCode).to.equal(404);
      const preferencesRepository = new PreferencesRepository();
      const preferences = await preferencesRepository.find({
        _templateId: id,
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

        await createWorkflowAndExpectValidationError(
          apiClient,
          createWorkflowDto,
          'name must be longer than or equal to 1 characters'
        );
      });

      it('should respond with 400 when name is too long', async () => {
        const createWorkflowDto: CreateWorkflowDto = buildWorkflow({
          name: Array.from({ length: 80 }).join('X'),
        });

        await createWorkflowAndExpectValidationError(
          apiClient,
          createWorkflowDto,
          'name must be shorter than or equal to 64 characters'
        );
      });

      it('should respond with 400 when description is too long', async () => {
        const createWorkflowDto: CreateWorkflowDto = buildWorkflow({
          description: Array.from({ length: 260 }).join('X'),
        });

        await createWorkflowAndExpectValidationError(
          apiClient,
          createWorkflowDto,
          'description must be shorter than or equal to 256 characters'
        );
      });

      it('should respond with 400 when description is too long on an update call', async () => {
        const createWorkflowDto = buildWorkflow();

        const res = await createWorkflow(apiClient, createWorkflowDto);
        const updateWorkflowDto: UpdateWorkflowDto = {
          ...mapResponseToUpdateDto(res),
          description: Array.from({ length: 260 }).join('X'),
        };

        const errorResult = await expectSdkValidationExceptionGeneric(() =>
          apiClient.workflows.update(updateWorkflowDto, res.id)
        );
        expect(errorResult.error).to.be.ok;
        expect(JSON.stringify(errorResult.error?.errors), JSON.stringify(errorResult.error)).to.include(
          'description must be shorter than or equal to 256 characters'
        );
      });

      it('should respond with 400 when a tag is too long', async () => {
        const createWorkflowDto: CreateWorkflowDto = buildWorkflow({
          tags: ['tag1', Array.from({ length: 70 }).join('X')],
        });

        await createWorkflowAndExpectValidationError(
          apiClient,
          createWorkflowDto,
          'each value in tags must be longer than or equal to 1 and shorter than or equal to 64 characters'
        );
      });

      it('should respond with 400 when a tag is empty', async () => {
        const createWorkflowDto: CreateWorkflowDto = buildWorkflow({
          tags: ['tag1', ''],
        });

        await createWorkflowAndExpectValidationError(
          apiClient,
          createWorkflowDto,
          'each value in tags must be longer than or equal to 1 and shorter than or equal to 64 characters'
        );
      });

      it('should respond with 400 when a duplicate tag is provided', async () => {
        const createWorkflowDto: CreateWorkflowDto = buildWorkflow({
          tags: ['tag1', 'tag1'],
        });

        await createWorkflowAndExpectValidationError(
          apiClient,
          createWorkflowDto,
          "All tags's elements must be unique"
        );
      });

      it('should respond with 400 when more than 16 tags are provided', async () => {
        const createWorkflowDto: CreateWorkflowDto = buildWorkflow({
          tags: Array.from({ length: 17 }).map((_, index) => `tag${index}`),
        });

        await createWorkflowAndExpectValidationError(
          apiClient,
          createWorkflowDto,
          'tags must contain no more than 16 elements'
        );
      });
    });

    describe('steps validation', () => {
      it('should throw 400 when name is empty', async () => {
        // @ts-expect-error
        const overrideDto = { steps: [{ ...buildEmailStep(), name: '' } as unknown as StepUpsertDto] };
        const createWorkflowDto: CreateWorkflowDto = buildWorkflow();
        const dtoWithoutName = { ...createWorkflowDto, ...overrideDto };

        await createWorkflowAndExpectValidationError(apiClient, dtoWithoutName, 'name');
      });

      describe('step control issues', () => {
        it('should return issues for all steps immediately', async () => {
          const createWorkflowDto: CreateWorkflowDto = buildWorkflow({
            steps: [
              {
                name: 'In-App Test Step',
                type: StepTypeEnum.InApp,
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

          const createdWorkflow = await createWorkflow(apiClient, createWorkflowDto);

          const stepData = await getStepData(createdWorkflow!.id, createdWorkflow!.steps[0].id);
          expect(stepData.issues!.controls!.body).to.eql([
            { message: 'Subject or body is required', issueType: 'MISSING_VALUE', variableName: 'body' },
          ]);

          // TODO: This should return a different type such as 'INVALID_URL'
          expect(stepData.issues!.controls!['redirect.url'][0].issueType).to.equal('MISSING_VALUE');
          expect(stepData.issues!.controls!['primaryAction.redirect.url'][0].issueType).to.equal('MISSING_VALUE');
          expect(stepData.issues!.controls!['secondaryAction.redirect.url'][0].issueType).to.equal('MISSING_VALUE');
        });

        it('should always show digest control value issues when illegal value provided', async () => {
          const steps = [{ ...buildDigestStep({ controlValues: { amount: 555, unit: 'days' } }) }];
          const workflowCreated = await createWorkflow(apiClient, buildWorkflow({ steps } as CreateWorkflowDto));
          const step = workflowCreated.steps[0];

          expect(step.issues?.controls?.amount[0].issueType).to.deep.equal(ContentIssueEnum.TierLimitExceeded);
          expect(step.issues?.controls?.unit[0].issueType).to.deep.equal(ContentIssueEnum.TierLimitExceeded);
        });

        it('should always show issues for illegal variables in control values', async () => {
          const createWorkflowDto: CreateWorkflowDto = buildWorkflow({
            steps: [
              {
                name: 'Email Test Step',
                type: StepTypeEnum.Email,
                controlValues: { body: 'Welcome {{}}', subject: 'Welcome {{}}' },
              },
            ],
          });

          const workflow = await createWorkflow(apiClient, createWorkflowDto);

          const stepData = await getStepData(workflow.id, workflow.steps[0].id);
          expect(stepData.issues, 'Step data should have issues').to.exist;
          expect(stepData.issues?.controls?.body, 'Step data should have body issues').to.exist;
          expect(stepData.issues?.controls?.body?.[0]?.variableName).to.equal('{{}}');
          expect(stepData.issues?.controls?.body?.[0]?.issueType).to.equal('ILLEGAL_VARIABLE_IN_CONTROL_VALUE');
        });
      });
    });
  });

  async function getWorkflow(id: string): Promise<WorkflowResponseDto> {
    const res = await apiClient.workflows.get(id);

    return res.result;
  }

  async function patchWorkflow(workflowId: string, active: boolean) {
    const res = await apiClient.workflows.patch(
      {
        active,
      },
      workflowId
    );

    return res.result;
  }

  async function updateWorkflow(id: string, workflow: UpdateWorkflowDto): Promise<WorkflowResponseDto> {
    const res = await apiClient.workflows.update(workflow, id);

    return res.result;
  }

  async function syncWorkflow(devWorkflow: WorkflowResponseDto, prodEnvironmentId: string) {
    const res = await apiClient.workflows.sync(
      {
        targetEnvironmentId: prodEnvironmentId,
      },
      devWorkflow.id
    );

    return res.result;
  }

  async function getStepData(workflowId: string, stepId: string, envId?: string) {
    const novuRestResult = await apiClient.workflows.steps.retrieve(workflowId, stepId, undefined, {
      fetchOptions: { headers: buildHeaders(envId) },
    });

    return novuRestResult.result;
  }

  async function updateWorkflowAndValidate(
    workflowRequestId: string,
    expectedPastUpdatedAt: string,
    updateRequest: UpdateWorkflowDto
  ): Promise<void> {
    const updatedWorkflow: WorkflowResponseDto = await updateWorkflow(workflowRequestId, updateRequest);
    const slug = buildSlug(updateRequest.name, ShortIsPrefixEnum.WORKFLOW, updatedWorkflow.id);

    expect(updatedWorkflow.slug).to.equal(slug);
    for (let i = 0; i < updateRequest.steps.length; i++) {
      const stepInRequest = updateRequest.steps[i];
      expect(stepInRequest.name).to.equal(updatedWorkflow.steps[i].name);
      expect(stepInRequest.type).to.equal(updatedWorkflow.steps[i].type);

      if (stepInRequest.controlValues) {
        expect(stepInRequest.controlValues).to.deep.equal(updatedWorkflow.steps[i].controls.values);
      }

      if ('id' in stepInRequest) {
        expect(buildSlug(stepInRequest.name, ShortIsPrefixEnum.STEP, stepInRequest.id!)).to.equal(
          updatedWorkflow.steps[i].slug
        );
      }
    }

    expect(new Date(updatedWorkflow.updatedAt)).to.be.greaterThan(new Date(expectedPastUpdatedAt));
  }

  async function create10Workflows(prefix: string = 'Test Workflow') {
    for (let i = 0; i < 10; i++) {
      await createWorkflowAndValidate(`${prefix}-${i}`);
    }
  }

  async function createWorkflowAndValidate(name: string = 'Test Workflow'): Promise<WorkflowResponseDto> {
    const createWorkflowDto: CreateWorkflowDto = buildWorkflow({ name });
    const res = await createWorkflow(apiClient, createWorkflowDto);
    validateCreateWorkflowResponse(res, createWorkflowDto);

    return res;
  }

  async function getWorkflowAndValidate(workflowCreated: WorkflowResponseDto) {
    const workflowRetrieved = await getWorkflow(workflowCreated.id);
    expect(workflowRetrieved).to.deep.equal(workflowCreated);
  }

  async function listWorkflows(query: string, offset: number, limit: number): Promise<ListWorkflowResponse> {
    return (await apiClient.workflows.list({ query, offset, limit })).result;
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

  function stringify(obj: unknown) {
    return JSON.stringify(obj, null, 2);
  }

  function mapResponseToUpdateDto(workflowResponse: WorkflowResponseDto): UpdateWorkflowDto {
    return {
      ...workflowResponse,
      steps: workflowResponse.steps.map(
        (step) =>
          ({
            id: step.id,
            type: step.type,
            name: step.name,
            controlValues: step.controls?.values || {},
          }) as UpdateWorkflowDtoSteps
      ),
    };
  }

  function assertWorkflowResponseBodyData(workflowResponseDto: WorkflowResponseDto) {
    expect(workflowResponseDto, stringify(workflowResponseDto)).to.be.ok;
    expect(workflowResponseDto.id, stringify(workflowResponseDto)).to.be.ok;
    expect(workflowResponseDto.updatedAt, stringify(workflowResponseDto)).to.be.ok;
    expect(workflowResponseDto.createdAt, stringify(workflowResponseDto)).to.be.ok;
    expect(workflowResponseDto.preferences, stringify(workflowResponseDto)).to.be.ok;
    expect(workflowResponseDto.status, stringify(workflowResponseDto)).to.be.ok;
    expect(workflowResponseDto.origin, stringify(workflowResponseDto)).to.be.eq(ResourceOriginEnum.NovuCloud);
    expect(Object.keys(workflowResponseDto.issues || {}).length, stringify(workflowResponseDto)).to.be.equal(0);
  }

  function assertStepResponse(workflowResponseDto: WorkflowResponseDto, createWorkflowDto: CreateWorkflowDto) {
    for (let i = 0; i < workflowResponseDto.steps.length; i++) {
      const stepInRequest = createWorkflowDto.steps[i];
      const step = workflowResponseDto.steps[i];
      expect(step.id, stringify(step)).to.be.ok;
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

  function getJsonSchemaPrimitiveProperties(schema: JSONSchemaDto, prefix: string = ''): string[] {
    if (!isJSONSchemaDto(schema)) {
      return [];
    }
    let properties: string[] = [];
    // Check if the schema has properties
    if (schema.properties) {
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
const createWorkflowsV1 = async (templateBody: {
  name: string;
  description: string;
  tags: string[];
  notificationGroupId: string;
  steps: any[];
}): Promise<{ _id: string; name: string }> => {
  const res = await session.testAgent.post(`/v1/workflows`).send({
    name: templateBody.name,
    description: templateBody.description,
    tags: templateBody.tags,
    notificationGroupId: templateBody.notificationGroupId,
    steps: templateBody.steps,
  });
  expect(res.status).to.equal(201);

  return res.body.data;
};
const searchWorkflowsV1 = async (queryParams?: string): Promise<{ _id: string }[]> => {
  const query = new URLSearchParams();
  query.append('defaultLimit', '10');
  query.append('maxLimit', '50');
  if (queryParams) {
    query.append('query', queryParams);
  }

  const res = await session.testAgent.get(`/v1/workflows?${query.toString()}`);
  expect(res.status).to.equal(200);

  return res.body.data;
};
