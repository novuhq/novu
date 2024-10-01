import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { DEFAULT_WORKFLOW_PREFERENCES, StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { randomBytes } from 'crypto';
import axios from 'axios';

import { JsonSchema } from '@novu/framework';
import {
  ListWorkflowResponse,
  StepCreateDto,
  StepDto,
  StepUpdateDto,
  WorkflowCommonsFields,
  WorkflowListResponseDto,
} from './dto/workflow-commons-fields';
import { WorkflowResponseDto } from './dto/workflow-response-dto';
import { UpdateWorkflowDto } from './dto/update-workflow-dto';
import { CreateWorkflowDto } from './dto/create-workflow-dto';

const v2Prefix = '/v2';
const PARTIAL_UPDATED_NAME = 'Updated';
const TEST_WORKFLOW_UPDATED_NAME = `${PARTIAL_UPDATED_NAME} Workflow Name`;
const TEST_WORKFLOW_NAME = 'Test Workflow Name';

const TEST_TAGS = ['test'];
let session: UserSession;
let axiosInstance;

const SCHEMA_WITH_TEXT: JsonSchema = {
  type: 'object',
  properties: {
    text: {
      type: 'string',
    },
  },
  required: ['text'],
};

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
  const updateRequest = removeFields(workflowCreated, 'updatedAt', '_id', 'origin') as UpdateWorkflowDto;

  return { ...updateRequest, name: TEST_WORKFLOW_UPDATED_NAME, steps };
}

describe.only('Workflow Controller E2E API Testing', () => {
  beforeEach(async () => {
    // @ts-ignore
    process.env.IS_WORKFLOW_PREFERENCES_ENABLED = 'true';
    session = new UserSession();
    await session.initialize();
    axiosInstance = axios.create({
      baseURL: `${session.serverUrl}${v2Prefix}`,
      headers: {
        authorization: `${session.token}`,
      },
    });
  });

  it('Smoke Testing', async () => {
    try {
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
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(error);
      throw error;
    }
  });

  describe('Create Workflow Permutations', () => {
    it('should not allow creating two workflows for the same user with the same name', async () => {
      const nameSuffix = `Test Workflow${new Date().toString()}`;
      await createWorkflowAndValidate(nameSuffix);
      const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto(nameSuffix);
      try {
        await axiosInstance.post('/workflows', createWorkflowDto);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log('Error:', error?.response?.data?.message);
        // eslint-disable-next-line no-console
        console.log('Error:', error?.response?.data);
        // eslint-disable-next-line no-console
        console.log('Error:', error?.response);
        // eslint-disable-next-line no-console
        console.log('Error:', error);

        expect(error.response.status).to.be.equal(400);
        expect(error.response.data).to.contain('Workflow with the same name already exists');
      }
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

    it('should return  results without query', async () => {
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
  try {
    const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto(nameSuffix);
    // eslint-disable-next-line no-console
    console.log('createWorkflowDto', JSON.stringify(createWorkflowDto, null, 2));
    const res = await axiosInstance.post('/workflows', createWorkflowDto);
    const workflowResponseDto: WorkflowResponseDto = res.data.data;
    expect(workflowResponseDto, 'Workflow response DTO should exist').to.be.ok;
    /*
     * expect(workflowResponseDto._id, JSON.stringify(res, null, 2)).to.be.ok;
     * expect(workflowResponseDto.updatedAt, JSON.stringify(res, null, 2)).to.be.ok;
     * expect(workflowResponseDto.createdAt, JSON.stringify(res, null, 2)).to.be.ok;
     * expect(workflowResponseDto.preferences, JSON.stringify(res, null, 2)).to.be.ok;
     */
    const createdWorkflowWithoutUpdateDate = removeFields(
      workflowResponseDto,
      '_id',
      'origin',
      'preferences',
      'updatedAt',
      'createdAt'
    );
    createdWorkflowWithoutUpdateDate.steps = createdWorkflowWithoutUpdateDate.steps.map((step) =>
      removeFields(step, 'stepUuid')
    );
    expect(createdWorkflowWithoutUpdateDate).to.deep.equal(
      removeFields(createWorkflowDto, '__source'),
      buildErrorMsg(createWorkflowDto, createdWorkflowWithoutUpdateDate)
    );

    return workflowResponseDto;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('Error:', error?.response?.data?.message);
    // eslint-disable-next-line no-console
    console.log('Error:', error?.response?.data);
    // eslint-disable-next-line no-console
    console.log('Error:', error?.response);
    // eslint-disable-next-line no-console
    console.log('Error:', error);

    throw error;
  }
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

function buildCreateWorkflowDto(nameSuffix: string): CreateWorkflowDto {
  return {
    __source: WorkflowCreationSourceEnum.EDITOR,
    name: TEST_WORKFLOW_NAME + nameSuffix,
    description: 'This is a test workflow',
    active: true,
    tags: TEST_TAGS,
    steps: [buildEmailStep(), buildInAppStep()],
  };
}

async function updateWorkflowRest(id: string, workflow: UpdateWorkflowDto): Promise<WorkflowResponseDto> {
  // eslint-disable-next-line no-console
  console.log(`updateWorkflow- ${id}: 
  ${JSON.stringify(workflow, null, 2)}`);

  return (await axiosInstance.put(`/workflows/${id}`, workflow)).data.data;
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
  const updatedWorkflowWoUpdated: UpdateWorkflowDto = removeFields(workflowResponse, 'updatedAt', 'origin', '_id');
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
  // eslint-disable-next-line no-console
  console.log('updateRequest:::'.toUpperCase(), JSON.stringify(updateRequest.steps, null, 2));
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

async function getWorkflowRest(
  workflowCreated: WorkflowCommonsFields & { updatedAt: string }
): Promise<WorkflowResponseDto> {
  return (await axiosInstance.get(`/workflows/${workflowCreated._id}`)).data.data;
}

async function validateWorkflowDeleted(workflowId: string): Promise<void> {
  try {
    await axiosInstance.get(`/workflows/${workflowId}`);
  } catch (error) {
    expect(error.response.status).to.equal(400);
  }
}

async function getWorkflowAndValidate(workflowCreated: WorkflowResponseDto) {
  const workflowRetrieved = await getWorkflowRest(workflowCreated);
  expect(workflowRetrieved).to.deep.equal(workflowCreated);
}

async function getListWorkflows(query: string, offset: number, limit: number): Promise<ListWorkflowResponse> {
  return (await axiosInstance.get(`/workflows?query=${query}&offset=${offset}&limit=${limit}`)).data.data;
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
  await axiosInstance.delete(`/workflows/${_id}`);
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
  return removeFields(workflowCreated, 'updatedAt', '_id', 'origin') as UpdateWorkflowDto;
}

function buildUpdateDtoWithValues(workflowCreated: WorkflowResponseDto): UpdateWorkflowDto {
  const updateDto = convertResponseToUpdateDto(workflowCreated);
  const updatedStep = addValueToExistingStep(updateDto.steps);
  const newStep = buildInAppStepWithValues();
  // eslint-disable-next-line no-console
  console.log('newStep:::', JSON.stringify(newStep, null, 2));

  const stoWithValues: UpdateWorkflowDto = {
    ...updateDto,
    name: `${TEST_WORKFLOW_UPDATED_NAME}-${generateUUID()}`,
    steps: [updatedStep, newStep],
  };

  // eslint-disable-next-line no-console
  console.log('updateDto:::', JSON.stringify(stoWithValues, null, 2));

  return stoWithValues;
}
