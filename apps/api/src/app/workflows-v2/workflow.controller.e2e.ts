import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { randomBytes } from 'crypto';
import { slugifyName } from '@novu/application-generic';
import {
  CreateWorkflowDto,
  DEFAULT_WORKFLOW_PREFERENCES,
  isStepUpdateBody,
  ListWorkflowResponse,
  StepCreateDto,
  StepDto,
  StepResponseDto,
  StepTypeEnum,
  StepUpdateDto,
  UpdateStepBody,
  UpsertStepBody,
  UpsertWorkflowBody,
  UpdateWorkflowDto,
  WorkflowCommonsFields,
  WorkflowCreationSourceEnum,
  WorkflowListResponseDto,
  WorkflowResponseDto,
  ShortIsPrefixEnum,
} from '@novu/shared';
import { createWorkflowClient } from './clients';

import { encodeBase62 } from '../shared/helpers';

const v2Prefix = '/v2';
const PARTIAL_UPDATED_NAME = 'Updated';
const TEST_WORKFLOW_UPDATED_NAME = `${PARTIAL_UPDATED_NAME} Workflow Name`;
const TEST_WORKFLOW_NAME = 'Test Workflow Name';

const TEST_TAGS = ['test'];
let session: UserSession;

describe('Workflow Controller E2E API Testing', () => {
  let workflowsClient: ReturnType<typeof createWorkflowClient>;

  beforeEach(async () => {
    // @ts-ignore
    process.env.IS_WORKFLOW_PREFERENCES_ENABLED = 'true';
    session = new UserSession();
    await session.initialize();
    workflowsClient = createWorkflowClient(session.serverUrl, getHeaders());
  });
  function getHeaders(): HeadersInit {
    return {
      Authorization: session.token, // Fixed space
      'Novu-Environment-Id': session.environment._id,
    };
  }

  it('Smoke Testing', async () => {
    // @ts-ignore
    process.env.IS_WORKFLOW_PREFERENCES_ENABLED = 'true';
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

  describe('Create Workflow Permutations', () => {
    // todo: remove skip and fix if needed once pr 6657 is merged
    it('should allow creating two workflows for the same user with the same name', async () => {
      const nameSuffix = `Test Workflow${new Date().toString()}`;
      await createWorkflowAndValidate(nameSuffix);
      const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto(nameSuffix);
      const res = await session.testAgent.post(`${v2Prefix}/workflows`).send(createWorkflowDto);
      expect(res.status).to.be.equal(201);
      const workflowCreated: WorkflowResponseDto = res.body.data;
      expect(workflowCreated.workflowId).to.include(`${slugifyName(nameSuffix)}-`);
    });

    it('should throw error when creating workflow with duplicate step ids', async () => {
      const nameSuffix = `Test Workflow${new Date().toString()}`;
      const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto(nameSuffix, {
        steps: [buildEmailStep(), buildEmailStep(), buildInAppStep(), buildInAppStep()],
      });
      const res = await session.testAgent.post(`${v2Prefix}/workflows`).send(createWorkflowDto);
      expect(res.status).to.be.equal(400);
      expect(res.body.message).to.be.equal('Duplicate stepIds are not allowed: email-test-step, in-app-test-step');
    });
  });

  describe('Update Workflow Permutations', () => {
    it('should update control values', async () => {
      const nameSuffix = `Test Workflow${new Date().toString()}`;
      const workflowCreated: WorkflowResponseDto = await createWorkflowAndValidate(nameSuffix);
      const updateDtoWithValues = buildUpdateDtoWithValues(workflowCreated);
      const updatedWorkflow: WorkflowResponseDto = await updateWorkflowRest(workflowCreated._id, updateDtoWithValues);
      expect(updatedWorkflow.steps[0].controlValues.test).to.be.equal(updateDtoWithValues.steps[0].controlValues.test);
      expect(updatedWorkflow.steps[1].controlValues.test).to.be.equal(updateDtoWithValues.steps[1].controlValues.test);
    });

    it('should keep the step id on updated ', async () => {
      const nameSuffix = `Test Workflow${new Date().toString()}`;
      const workflowCreated: WorkflowResponseDto = await createWorkflowAndValidate(nameSuffix);
      const updateDto = convertResponseToUpdateDto(workflowCreated);
      const updatedWorkflow = await updateWorkflowRest(workflowCreated._id, updateDto);
      const updatedStep = updatedWorkflow.steps[0];
      const originalStep = workflowCreated.steps[0];
      expect(updatedStep._id).to.be.ok;
      expect(updatedStep._id).to.be.equal(originalStep._id);
    });

    it('adding user preferences', async () => {
      const nameSuffix = `Test Workflow${new Date().toString()}`;
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
      const nameSuffix = `Test Workflow${new Date().toString()}`;
      const workflowCreated: WorkflowResponseDto = await createWorkflowAndValidate(nameSuffix);
      const updateDtoWithValues = buildUpdateDtoWithValues(workflowCreated);

      const internalId = workflowCreated._id;
      await updateWorkflowAndValidate(internalId, workflowCreated.updatedAt, updateDtoWithValues, internalId);

      const slugPrefixAndEncodedInternalId = `workflow-name-${ShortIsPrefixEnum.WORKFLOW}${encodeBase62(internalId)}`;
      await updateWorkflowAndValidate(
        slugPrefixAndEncodedInternalId,
        workflowCreated.updatedAt,
        updateDtoWithValues,
        internalId
      );

      const { workflowId } = workflowCreated;
      await updateWorkflowAndValidate(workflowId, workflowCreated.updatedAt, updateDtoWithValues, internalId);
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
      expect(JSON.parse(novuRestResult.error!.responseText).workflowId).to.contain(notExistingId);
    });
  });
});

function buildErrorMsg(createWorkflowDto: WorkflowCommonsFields, createdWorkflowWithoutUpdateDate) {
  return `created workflow does not match as expected 
    Original:
     ${JSON.stringify(createWorkflowDto, null, 2)}
    Returned:
     ${JSON.stringify(createdWorkflowWithoutUpdateDate, null, 2)}
   
     `;
}

async function createWorkflowAndValidate(nameSuffix: string = ''): Promise<WorkflowResponseDto> {
  const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto(nameSuffix);
  const res = await session.testAgent.post(`${v2Prefix}/workflows`).send(createWorkflowDto);
  const workflowResponseDto: WorkflowResponseDto = res.body.data;
  const errorMessageOnFailure = JSON.stringify(res, null, 2);
  expect(workflowResponseDto, errorMessageOnFailure).to.be.ok;
  expect(workflowResponseDto._id, errorMessageOnFailure).to.be.ok;
  expect(workflowResponseDto.updatedAt, errorMessageOnFailure).to.be.ok;
  expect(workflowResponseDto.createdAt, errorMessageOnFailure).to.be.ok;
  expect(workflowResponseDto.preferences, errorMessageOnFailure).to.be.ok;
  expect(workflowResponseDto.status, errorMessageOnFailure).to.be.ok;
  expect(workflowResponseDto.origin, errorMessageOnFailure).to.be.eq('novu-cloud');
  for (const step of workflowResponseDto.steps) {
    expect(step._id, errorMessageOnFailure).to.be.ok;
    expect(step.slug, errorMessageOnFailure).to.be.ok;
  }
  const createdWorkflowWithoutUpdateDate = removeFields(
    workflowResponseDto,
    '_id',
    'origin',
    'preferences',
    'updatedAt',
    'createdAt',
    'status',
    'slug'
  );
  createdWorkflowWithoutUpdateDate.steps = createdWorkflowWithoutUpdateDate.steps.map((step) =>
    removeFields(step, '_id', 'slug', 'slug', 'controls', 'stepId')
  );
  expect(createdWorkflowWithoutUpdateDate).to.deep.equal(
    removeFields(createWorkflowDto, '__source')
    // buildErrorMsg(createWorkflowDto, createdWorkflowWithoutUpdateDate)
  );

  return workflowResponseDto;
}

function buildEmailStep(): StepDto {
  return {
    controlValues: {},
    name: 'Email Test Step',
    type: StepTypeEnum.EMAIL,
  };
}

function buildInAppStep(): StepDto {
  return {
    controlValues: {},
    name: 'In-App Test Step',
    type: StepTypeEnum.IN_APP,
  };
}

export function buildCreateWorkflowDto(
  nameSuffix: string,
  overrides: Partial<CreateWorkflowDto> = {}
): CreateWorkflowDto {
  return {
    __source: WorkflowCreationSourceEnum.EDITOR,
    name: TEST_WORKFLOW_NAME + nameSuffix,
    workflowId: `${slugifyName(TEST_WORKFLOW_NAME + nameSuffix)}`,
    description: 'This is a test workflow',
    active: true,
    tags: TEST_TAGS,
    steps: [buildEmailStep(), buildInAppStep()],
    ...overrides,
  };
}

async function updateWorkflowRest(id: string, workflow: UpsertWorkflowBody): Promise<WorkflowResponseDto> {
  return await safePut(`${v2Prefix}/workflows/${id}`, workflow);
}

function convertToDate(dateString: string) {
  const timestamp = Date.parse(dateString);

  return new Date(timestamp);
}

function isStepUpdateDto(obj: StepCreateDto | StepUpdateDto): obj is StepUpdateDto {
  return typeof obj === 'object' && obj !== null && !!(obj as StepUpdateDto)._id;
}

function buildStepWithoutUUid(stepInResponse: StepResponseDto) {
  if (!stepInResponse.controls) {
    return {
      controlValues: stepInResponse.controlValues,
      name: stepInResponse.name,
      type: stepInResponse.type,
    };
  }

  return {
    controlValues: stepInResponse.controlValues,
    controls: stepInResponse.controls,
    name: stepInResponse.name,
    type: stepInResponse.type,
  };
}

function findStepOnRequestBasedOnId(workflowUpdateRequest: UpsertWorkflowBody, stepUuid: string) {
  for (const stepInRequest of workflowUpdateRequest.steps) {
    if (isStepUpdateBody(stepInRequest) && (stepInRequest as UpdateStepBody)._id === stepUuid) {
      return stepInRequest;
    }
  }

  return undefined;
}

/*
 * There's a side effect on the backend where the stepId gets updated based on the step name.
 * We need to make a design decision on the client side, should we allow users to update the stepId separately.
 */
function updateStepId(step: StepResponseDto): Partial<StepResponseDto> {
  const { controls, ...rest } = step;

  return {
    ...rest,
    ...(step._id && step.name ? { stepId: slugifyName(step.name) } : {}),
    ...(step.name && step._id
      ? { slug: `${slugifyName(step.name)}_${ShortIsPrefixEnum.STEP}${encodeBase62(step._id)}` }
      : {}),
  };
}

function validateUpdatedWorkflowAndRemoveResponseFields(
  workflowResponse: WorkflowResponseDto,
  workflowUpdateRequest: UpsertWorkflowBody
): UpsertWorkflowBody {
  const updatedWorkflowWoUpdated: UpsertWorkflowBody = removeFields(
    workflowResponse,
    'updatedAt',
    'origin',
    '_id',
    'status'
  );
  const augmentedSteps: UpsertStepBody[] = [];
  for (const stepInResponse of workflowResponse.steps) {
    const responseStep = removeFields(stepInResponse, 'controls');
    expect(stepInResponse._id).to.be.ok;

    const { _id } = responseStep;
    const stepOnRequestBasedOnId = findStepOnRequestBasedOnId(workflowUpdateRequest, _id);
    let augmentedStep: StepUpdateDto | StepCreateDto;
    if (!stepOnRequestBasedOnId) {
      augmentedStep = buildStepWithoutUUid(responseStep);
    } else {
      augmentedStep = responseStep;
    }
    augmentedSteps.push(augmentedStep);
  }

  updatedWorkflowWoUpdated.steps = [...augmentedSteps];

  return updatedWorkflowWoUpdated;
}

async function updateWorkflowAndValidate(
  workflowRequestId: string,
  updatedAt: string,
  updateRequest: UpsertWorkflowBody,
  workflowInternalId?: string
): Promise<void> {
  const updatedWorkflow: WorkflowResponseDto = await updateWorkflowRest(workflowRequestId, updateRequest);
  const updatedWorkflowWithResponseFieldsRemoved = validateUpdatedWorkflowAndRemoveResponseFields(
    updatedWorkflow,
    updateRequest
  );
  const expectedUpdateRequest = {
    ...updateRequest,
    slug: `${slugifyName(updateRequest.name)}_${ShortIsPrefixEnum.WORKFLOW}${encodeBase62(
      workflowInternalId || workflowRequestId
    )}`,
    steps: updateRequest.steps.map(updateStepId),
  };
  expect(updatedWorkflowWithResponseFieldsRemoved, 'workflow after update does not match as expected').to.deep.equal(
    expectedUpdateRequest
  );
  expect(convertToDate(updatedWorkflow.updatedAt)).to.be.greaterThan(convertToDate(updatedAt));
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

async function create10Workflows(prefix: string) {
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < 10; i++) {
    await createWorkflowAndValidate(`${prefix}-ABC${i}`);
  }
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

async function safePut<T>(url: string, data: object): Promise<T> {
  return (await safeRest(url, () => session.testAgent.put(url).send(data) as unknown as Promise<ApiResponse>)) as T;
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

function addValueToExistingStep(steps: UpsertStepBody[]): UpdateStepBody {
  const stepToUpdate = steps[0];

  if (isStepUpdateBody(stepToUpdate)) {
    stepToUpdate.name = `Updated Step Name- ${generateUUID()}`;
    stepToUpdate.controlValues = { test: `test-${generateUUID()}` };

    return stepToUpdate;
  }

  throw new Error('Step to update is not a StepUpdateDto');
}

function buildInAppStepWithValues() {
  const stepDto = buildInAppStep();
  stepDto.controlValues = { testNew: [`testNew -${generateUUID()}`] };

  return stepDto;
}

function convertResponseToUpdateDto(workflowCreated: WorkflowResponseDto): UpsertWorkflowBody {
  const workflowWithoutResponseFields = removeFields(workflowCreated, 'updatedAt', '_id', 'origin', 'status');
  const steps: UpsertStepBody[] = workflowWithoutResponseFields.steps.map((step) => removeFields(step, 'stepId'));

  return { ...workflowWithoutResponseFields, steps };
}

function buildUpdateDtoWithValues(workflowCreated: WorkflowResponseDto): UpsertWorkflowBody {
  const updateDto = convertResponseToUpdateDto(workflowCreated);
  const updatedStep = addValueToExistingStep(updateDto.steps);
  const newStep = buildInAppStepWithValues();

  return {
    ...updateDto,
    name: `${TEST_WORKFLOW_UPDATED_NAME}-${generateUUID()}`,
    steps: [updatedStep, newStep],
  };
}

function createStep(): StepCreateDto {
  return {
    name: 'someStep',
    type: StepTypeEnum.SMS,
    controlValues: {
      text: '{SOME_TEXT_VARIABLE}',
    },
  };
}

function buildUpdateRequest(workflowCreated: WorkflowResponseDto): UpdateWorkflowDto {
  const steps = [createStep()];
  const updateRequest = removeFields(workflowCreated, 'updatedAt', '_id', 'origin', 'status') as UpdateWorkflowDto;

  return {
    ...updateRequest,
    name: TEST_WORKFLOW_UPDATED_NAME,
    workflowId: `${slugifyName(TEST_WORKFLOW_UPDATED_NAME)}`,
    steps,
  };
}
