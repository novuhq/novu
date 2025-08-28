import { Novu } from '@novu/api';
import {
  CreateWorkflowDto,
  DirectionEnum,
  WorkflowCreationSourceEnum,
  WorkflowResponseDto,
  WorkflowResponseDtoSortField,
  WorkflowStatusEnum,
} from '@novu/api/models/components';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('List Workflows - /workflows (GET) #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);
  });

  describe('Pagination and Search', () => {
    it('should correctly paginate workflows', async () => {
      const workflowIds: string[] = [];
      for (let i = 0; i < 15; i += 1) {
        const workflow = await createWorkflow(`Test Workflow ${i}`);
        workflowIds.push(workflow.id);
      }

      const { result: firstPage } = await novuClient.workflows.list({ limit: 10, offset: 0 });

      expect(firstPage.workflows).to.have.length(10);
      expect(firstPage.totalCount).to.equal(15);

      const { result: secondPage } = await novuClient.workflows.list({ limit: 10, offset: 10 });

      expect(secondPage.workflows).to.have.length(5);
      expect(secondPage.totalCount).to.equal(15);

      const firstPageIds = firstPage.workflows.map((workflow) => workflow.id);
      const secondPageIds = secondPage.workflows.map((workflow) => workflow.id);
      const uniqueIds = new Set([...firstPageIds, ...secondPageIds]);

      expect(uniqueIds.size).to.equal(15);
    });

    it('should correctly search workflows by name', async () => {
      const searchTerm = 'SEARCHABLE-WORKFLOW';

      // Create workflows with different names
      await createWorkflow(`${searchTerm}-1`);
      await createWorkflow(`${searchTerm}-2`);
      await createWorkflow('Different Workflow');

      const { result } = await novuClient.workflows.list({ query: searchTerm });

      expect(result.workflows).to.have.length(2);
      expect(result.workflows[0].name).to.include(searchTerm);
      expect(result.workflows[1].name).to.include(searchTerm);
    });
  });

  describe('Sorting', () => {
    it('should sort workflows by creation date in descending order by default', async () => {
      await createWorkflow('First Workflow');
      await delay(100); // Ensure different creation times
      await createWorkflow('Second Workflow');

      const { result } = await novuClient.workflows.list({});

      expect(result.workflows[0].name).to.equal('Second Workflow');
      expect(result.workflows[1].name).to.equal('First Workflow');
    });

    it('should sort workflows by creation date in ascending order when specified', async () => {
      await createWorkflow('First Workflow');
      await delay(100); // Ensure different creation times
      await createWorkflow('Second Workflow');

      const { result } = await novuClient.workflows.list({
        orderDirection: DirectionEnum.Asc,
        orderBy: WorkflowResponseDtoSortField.Name,
      });

      expect(result.workflows[0].name).to.equal('First Workflow');
      expect(result.workflows[1].name).to.equal('Second Workflow');
    });
  });

  describe('Response Structure', () => {
    it('should return correct workflow fields in response', async () => {
      const workflowName = 'Test Workflow Structure';
      const createdWorkflow = await createWorkflow(workflowName);

      const { result } = await novuClient.workflows.list({});
      const { result: topics } = await novuClient.topics.list({});
      console.log(topics);
      const returnedWorkflow = result.workflows[0];

      expect(returnedWorkflow).to.include({
        id: createdWorkflow.id,
        name: workflowName,
        workflowId: createdWorkflow.workflowId,
        status: WorkflowStatusEnum.Active,
      });
      expect(returnedWorkflow.createdAt).to.be.a('string');
      expect(returnedWorkflow.updatedAt).to.be.a('string');
    });
  });

  async function createWorkflow(name: string): Promise<WorkflowResponseDto> {
    const createWorkflowDto: CreateWorkflowDto = {
      name,
      workflowId: name.toLowerCase().replace(/\s+/g, '-'),
      source: WorkflowCreationSourceEnum.Editor,
      active: true,
      steps: [],
    };

    const { result } = await novuClient.workflows.create(createWorkflowDto);

    return result;
  }

  function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
});
