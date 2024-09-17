import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { ChannelTypeEnum, StepTypeEnum, WorkflowChannelPreferences } from '@novu/shared';
import _ from 'lodash';
import { CreateWorkflowDto, ListWorkflowResponse, WorkflowResponseDto } from './dto/workflow.dto';

const PARTIAL_UPDATED_NAME = 'Updated';
const TEST_WORKFLOW_UPDATED_NAME = `${PARTIAL_UPDATED_NAME} Workflow Name`;

let session: UserSession;

describe('Workflow Controller E2E API Testing', () => {
  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });
  it('Smoke Testing', async () => {
    const workflowCreated = await createWorkflowAndValidate('name suffix');
    await getWorkflowAndValidate(workflowCreated);
    await updateWorkflowNameAndValidate({ ...workflowCreated, name: TEST_WORKFLOW_UPDATED_NAME });
    await getAllAndValidate(PARTIAL_UPDATED_NAME);
    await deleteWorkflow(workflowCreated._id);
  });
  describe('List Workflow Permutations', () => {
    it('should not return workflows with if not matching query', async () => {
      await createWorkflowAndValidate('XYZ');
      await createWorkflowAndValidate('XYZ');
      const listWorkflowResponse = await getAllAndValidate('ABC');
      expect(listWorkflowResponse.workflowSummaries).to.be.empty;
      expect(listWorkflowResponse.totalResults).to.be.equal(0);
    });
    it('should not return workflows if offset is bigger than the amount of available workflows', async () => {
      await create10Workflows();
      const listWorkflowResponse = await getAllAndValidate('', 11, 15);
      expect(listWorkflowResponse.workflowSummaries).to.be.empty;
      expect(listWorkflowResponse.totalResults).to.be.equal(10);
    });
    it('should return all results within range', async () => {
      await create10Workflows();
      const listWorkflowResponse = await getAllAndValidate('ABC', 0, 15);
      expect(listWorkflowResponse.workflowSummaries).to.have.lengthOf(10);
      expect(listWorkflowResponse.totalResults).to.be.equal(10);
    });

    it('should return  results without query', async () => {
      await create10Workflows();
      const listWorkflowResponse = await getAllAndValidate('', 0, 15);
      expect(listWorkflowResponse.workflowSummaries).to.have.lengthOf(10);
      expect(listWorkflowResponse.totalResults).to.be.equal(10);
    });

    it('page workflows without overlap', async () => {
      await create10Workflows();
      const listWorkflowResponse1 = await getAllAndValidate('', 0, 5);
      const listWorkflowResponse2 = await getAllAndValidate('', 5, 5);
      const idsDeduplicated = buildIdSet(listWorkflowResponse1, listWorkflowResponse2);
      expect(idsDeduplicated.size).to.be.equal(10);
    });
  });
});

async function createWorkflowAndValidate(nameSuffix: string = ''): Promise<WorkflowResponseDto> {
  const createWorkflowDto: CreateWorkflowDto = buildCreateWorkflowDto(nameSuffix);
  console.log(JSON.stringify(createWorkflowDto, null, 2));
  const { body, status } = await session.testAgent.post('/v2/workflows').send(createWorkflowDto);
  console.log(status);
  console.log(body);
  expect(body.data).to.be.ok;
  const createdWorkflow = body.data;
  const createdWorkflowWithoutUpdateDate = _.omit(createdWorkflow, 'updatedAt');

  expect(createdWorkflowWithoutUpdateDate).to.deep.equal(createWorkflowDto);

  return createdWorkflow;
}

function buildPreferences(): WorkflowChannelPreferences {
  return {
    workflow: {
      defaultValue: true,
      readOnly: false,
    },
    channels: {
      [ChannelTypeEnum.IN_APP]: {
        defaultValue: true,
        readOnly: false,
      },
      [ChannelTypeEnum.EMAIL]: {
        defaultValue: false,
        readOnly: true,
      },
      [ChannelTypeEnum.SMS]: {
        defaultValue: true,
        readOnly: false,
      },
      [ChannelTypeEnum.CHAT]: {
        defaultValue: false,
        readOnly: true,
      },
      [ChannelTypeEnum.PUSH]: {
        defaultValue: true,
        readOnly: false,
      },
    },
  };
}

function buildEmailStep() {
  return {
    name: 'Email Step',
    code: 'email-step',
    stepId: 'email-step',
    type: StepTypeEnum.EMAIL,
  };
}

function buildInAppStep() {
  return {
    name: 'In-App Step',
    code: 'in-app-step',
    stepId: 'in-app-step',
    type: StepTypeEnum.IN_APP,
  };
}

const TEST_WORKFLOW_NAME = 'Test Workflow Name';

function buildCreateWorkflowDto(nameSuffix: string): CreateWorkflowDto {
  return {
    name: TEST_WORKFLOW_NAME + nameSuffix,
    description: 'This is a test workflow',
    active: true,
    critical: false,
    tags: ['test'],
    workflowId: 'test-workflow-id',
    notificationGroupId: session.notificationGroups[0]._id,
    preferences: buildPreferences(),
    code: 'TEST_WORKFLOW',
    steps: [buildEmailStep(), buildInAppStep()],
  };
}

async function updateWorkflowNameAndValidate(workflow: WorkflowResponseDto) {
  const testResponse = await session.testAgent.put(`/v2/workflows/${workflow._id}`).send(workflow);

  expect(testResponse.body.data).to.be.ok;
  const updatedWorkflow = testResponse.body.data;
  expect(updatedWorkflow).to.deep.equal(workflow);
}
async function getWorkflowAndValidate(workflowCreated: WorkflowResponseDto) {
  const { body } = await session.testAgent.get(`/v2/workflows/${workflowCreated._id}`);

  expect(body.data).to.be.ok;
  const workflow = body.data;
  expect(workflow).to.deep.equal(workflowCreated);
}

async function getAllAndValidate(
  query: string = '',
  offset: number = 0,
  limit: number = 10
): Promise<ListWorkflowResponse> {
  const { body } = await session.testAgent.get(`/v2/workflows?query=${query}&offset=${offset}&limit=${limit}`);
  expect(body.data).to.be.ok;
  expect(body.data).to.be.an('array');

  return body.data;
}
async function deleteWorkflow(_id: string) {
  await session.testAgent.delete(`/v2/workflows/${_id}`);
  await session.testAgent.get(`/v2/workflows/${_id}`).expect(404);
}
function extractIDs(listWorkflowResponse1: ListWorkflowResponse) {
  return listWorkflowResponse1.workflowSummaries.map((workflow) => workflow._id);
}

function buildIdSet(listWorkflowResponse1: ListWorkflowResponse, listWorkflowResponse2: ListWorkflowResponse) {
  return new Set([...extractIDs(listWorkflowResponse1), ...extractIDs(listWorkflowResponse2)]);
}

async function create10Workflows() {
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < 10; i++) {
    await createWorkflowAndValidate(`-ABC${i}`);
  }
}
