import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import {
  CreateWorkflowDto,
  DEFAULT_WORKFLOW_PREFERENCES,
  ListWorkflowResponse,
  StepCreateDto,
  StepDto,
  StepTypeEnum,
  StepUpdateDto,
  UpdateWorkflowDto,
  WorkflowCommonsFields,
  WorkflowCreationSourceEnum,
  WorkflowListResponseDto,
  WorkflowResponseDto,
} from '@novu/shared';
import { randomBytes } from 'crypto';
import { channelStepSchemas, JsonSchema } from '@novu/framework';
import { slugifyName } from '@novu/application-generic';

const v2Prefix = '/v2';
const PARTIAL_UPDATED_NAME = 'Updated';
const TEST_WORKFLOW_UPDATED_NAME = `${PARTIAL_UPDATED_NAME} Workflow Name`;
const TEST_WORKFLOW_NAME = 'Test Workflow Name';

const TEST_TAGS = ['test'];
let session: UserSession;

const SCHEMA_WITH_TEXT: JsonSchema = {
  type: 'object',
  properties: {
    text: {
      type: 'string',
    },
  },
  required: ['text'],
};

describe('Workflow Controller E2E API Testing', () => {
  beforeEach(async () => {
    // @ts-ignore
    process.env.IS_WORKFLOW_PREFERENCES_ENABLED = 'true';
    session = new UserSession();
    await session.initialize();
  });

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
    it('should allow creating two workflows for the same user with the same name', async () => {
      const nameSuffix = `Test Workflow${new Date().toString()}`;
      await createWorkflowAndValidate(nameSuffix);
      const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto(nameSuffix);
      const res = await session.testAgent.post(`${v2Prefix}/workflows`).send(createWorkflowDto);
      expect(res.status).to.be.equal(201);
      const workflowCreated: WorkflowResponseDto = res.body.data;
      expect(workflowCreated.workflowId).to.include(`${slugifyName(nameSuffix)}-`);
    });
  });

  describe('Update Workflow Permutations', () => {
    it('should update control values', async () => {
      const nameSuffix = `Test Workflow${new Date().toString()}`;
      const workflowCreated: WorkflowResponseDto = await createWorkflowAndValidate(nameSuffix);
      const updateDtoWithValues = buildUpdateDtoWithValues(workflowCreated);
      await updateWorkflowAndValidate(workflowCreated._id, workflowCreated.updatedAt, updateDtoWithValues);
    });

    it('should keep the step id on updated ', async () => {
      const nameSuffix = `Test Workflow${new Date().toString()}`;
      const workflowCreated: WorkflowResponseDto = await createWorkflowAndValidate(nameSuffix);
      const updateDto = convertResponseToUpdateDto(workflowCreated);
      const updatedWorkflow = await updateWorkflowRest(workflowCreated._id, updateDto);
      const updatedStep = updatedWorkflow.steps[0];
      const originalStep = workflowCreated.steps[0];
      expect(updatedStep.stepUuid).to.be.ok;
      expect(updatedStep.stepUuid).to.be.equal(originalStep.stepUuid);
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
      const listWorkflowResponse = await getAllAndValidate({
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
      const listWorkflowResponse = await getAllAndValidate({
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
      const listWorkflowResponse = await getAllAndValidate({
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
});

function buildErrorMsg(createWorkflowDto: Omit<WorkflowCommonsFields, '_id'>, createdWorkflowWithoutUpdateDate) {
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
  expect(workflowResponseDto, JSON.stringify(res, null, 2)).to.be.ok;
  expect(workflowResponseDto._id, JSON.stringify(res, null, 2)).to.be.ok;
  expect(workflowResponseDto.updatedAt, JSON.stringify(res, null, 2)).to.be.ok;
  expect(workflowResponseDto.createdAt, JSON.stringify(res, null, 2)).to.be.ok;
  expect(workflowResponseDto.preferences, JSON.stringify(res, null, 2)).to.be.ok;
  expect(workflowResponseDto.status, JSON.stringify(res, null, 2)).to.be.ok;
  const createdWorkflowWithoutUpdateDate = removeFields(
    workflowResponseDto,
    '_id',
    'origin',
    'preferences',
    'updatedAt',
    'createdAt',
    'status',
    'type'
  );
  createdWorkflowWithoutUpdateDate.steps = createdWorkflowWithoutUpdateDate.steps.map((step) =>
    removeFields(step, 'stepUuid')
  );
  expect(createdWorkflowWithoutUpdateDate).to.deep.equal(
    removeFields(createWorkflowDto, '__source'),
    buildErrorMsg(createWorkflowDto, createdWorkflowWithoutUpdateDate)
  );

  return workflowResponseDto;
}

function buildEmailStep(): StepDto {
  return {
    controlValues: {},
    controls: {
      schema: channelStepSchemas.email.output,
    },
    name: 'Email Test Step',
    type: StepTypeEnum.EMAIL,
  };
}

function buildInAppStep(): StepDto {
  return {
    controlValues: {},
    controls: {
      schema: channelStepSchemas.in_app.output,
    },
    name: 'In-App Test Step',
    type: StepTypeEnum.IN_APP,
  };
}

function buildCreateWorkflowDto(nameSuffix: string): CreateWorkflowDto {
  return {
    __source: WorkflowCreationSourceEnum.EDITOR,
    name: TEST_WORKFLOW_NAME + nameSuffix,
    workflowId: `${slugifyName(TEST_WORKFLOW_NAME + nameSuffix)}`,
    description: 'This is a test workflow',
    active: true,
    tags: TEST_TAGS,
    steps: [buildEmailStep(), buildInAppStep()],
  };
}

async function updateWorkflowRest(id: string, workflow: UpdateWorkflowDto): Promise<WorkflowResponseDto> {
  return await safePut(`${v2Prefix}/workflows/${id}`, workflow);
}

function convertToDate(dateString: string) {
  const timestamp = Date.parse(dateString);

  return new Date(timestamp);
}

function isStepUpdateDto(obj: StepDto): obj is StepUpdateDto {
  return typeof obj === 'object' && obj !== null && 'stepUuid' in obj;
}

function buildStepWithoutUUid(stepInResponse: StepDto & { stepUuid: string }) {
  if (!stepInResponse.controls) {
    return {
      controlValues: stepInResponse.controlValues,
      controls: {
        schema: channelStepSchemas[stepInResponse.type].output,
      },
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

function findStepOnRequestBasedOnId(workflowUpdateRequest: UpdateWorkflowDto, stepUuid: string) {
  for (const stepInRequest of workflowUpdateRequest.steps) {
    if (isStepUpdateDto(stepInRequest) && stepInRequest.stepUuid === stepUuid) {
      return stepInRequest;
    }
  }

  return undefined;
}

function validateUpdatedWorkflowAndRemoveResponseFields(
  workflowResponse: WorkflowResponseDto,
  workflowUpdateRequest: UpdateWorkflowDto
): UpdateWorkflowDto {
  const updatedWorkflowWoUpdated: UpdateWorkflowDto = removeFields(
    workflowResponse,
    'updatedAt',
    'origin',
    '_id',
    'status',
    'type'
  );
  const augmentedStep: (StepUpdateDto | StepCreateDto)[] = [];
  for (const stepInResponse of workflowResponse.steps) {
    expect(stepInResponse.stepUuid).to.be.ok;
    const { stepUuid } = stepInResponse;
    const stepOnRequestBasedOnId = findStepOnRequestBasedOnId(workflowUpdateRequest, stepUuid);
    if (!stepOnRequestBasedOnId) {
      augmentedStep.push(buildStepWithoutUUid(stepInResponse));
    } else {
      augmentedStep.push({ ...stepInResponse });
    }
  }
  updatedWorkflowWoUpdated.steps = [...augmentedStep];

  return updatedWorkflowWoUpdated;
}

async function updateWorkflowAndValidate(
  id: string,
  updatedAt: string,
  updateRequest: UpdateWorkflowDto
): Promise<void> {
  const updatedWorkflow: WorkflowResponseDto = await updateWorkflowRest(id, updateRequest);
  const updatedWorkflowWithResponseFieldsRemoved = validateUpdatedWorkflowAndRemoveResponseFields(
    updatedWorkflow,
    updateRequest
  );
  expect(updatedWorkflowWithResponseFieldsRemoved, 'workflow after update does not match as expected').to.deep.equal(
    updateRequest
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

async function getWorkflowRest(
  workflowCreated: WorkflowCommonsFields & { updatedAt: string }
): Promise<WorkflowResponseDto> {
  return await safeGet(`${v2Prefix}/workflows/${workflowCreated._id}`);
}

async function validateWorkflowDeleted(workflowId: string): Promise<void> {
  await session.testAgent.get(`${v2Prefix}/workflows/${workflowId}`).expect(400);
}

async function getWorkflowAndValidate(workflowCreated: WorkflowResponseDto) {
  const workflowRetrieved = await getWorkflowRest(workflowCreated);
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
async function safePost<T>(url: string, data: object): Promise<T> {
  return (await safeRest(url, () => session.testAgent.post(url).send(data) as unknown as Promise<ApiResponse>)) as T;
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
function addValueToExistingStep(steps: (StepCreateDto | StepUpdateDto)[]): StepDto {
  const stepToUpdate = steps[0];
  stepToUpdate.name = `Updated Step Name- ${generateUUID()}`;
  stepToUpdate.controlValues = { test: `test-${generateUUID()}` };

  return stepToUpdate;
}

function buildInAppStepWithValues() {
  const stepDto = buildInAppStep();
  stepDto.controlValues = { testNew: [`testNew -${generateUUID()}`] };

  return stepDto;
}

function convertResponseToUpdateDto(workflowCreated: WorkflowResponseDto): UpdateWorkflowDto {
  return removeFields(workflowCreated, 'updatedAt', '_id', 'origin', 'type', 'status') as UpdateWorkflowDto;
}

function buildUpdateDtoWithValues(workflowCreated: WorkflowResponseDto): UpdateWorkflowDto {
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
    controls: {
      schema: SCHEMA_WITH_TEXT,
    },
    controlValues: {
      text: '{SOME_TEXT_VARIABLE}',
    },
  };
}

function buildUpdateRequest(workflowCreated: WorkflowResponseDto): UpdateWorkflowDto {
  const steps = [createStep()];
  const updateRequest = removeFields(
    workflowCreated,
    'updatedAt',
    '_id',
    'origin',
    'status',
    'type'
  ) as UpdateWorkflowDto;

  return {
    ...updateRequest,
    name: TEST_WORKFLOW_UPDATED_NAME,
    workflowId: `${slugifyName(TEST_WORKFLOW_UPDATED_NAME)}`,
    steps,
  };
}
