import {
  CreateWorkflowDto,
  DirectionEnum,
  WorkflowCreationSourceEnum,
  WorkflowResponseDto,
  WorkflowStatusEnum,
} from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('List Workflows - /workflows (GET) #novu-v2', function () {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  describe('Pagination and Search', () => {
    it('should correctly paginate workflows', async () => {
      const workflowIds: string[] = [];
      for (let i = 0; i < 15; i += 1) {
        const workflow = await createWorkflow(`Test Workflow ${i}`);
        workflowIds.push(workflow._id);
      }

      const firstPage = await session.testAgent.get('/v2/workflows').query({
        limit: 10,
        offset: 0,
      });

      expect(firstPage.body.data.workflows).to.have.length(10);
      expect(firstPage.body.data.totalCount).to.equal(15);

      const secondPage = await session.testAgent.get('/v2/workflows').query({
        limit: 10,
        offset: 10,
      });

      expect(secondPage.body.data.workflows).to.have.length(5);
      expect(secondPage.body.data.totalCount).to.equal(15);

      const firstPageIds = firstPage.body.data.workflows.map((workflow: WorkflowResponseDto) => workflow._id);
      const secondPageIds = secondPage.body.data.workflows.map((workflow: WorkflowResponseDto) => workflow._id);
      const uniqueIds = new Set([...firstPageIds, ...secondPageIds]);

      expect(uniqueIds.size).to.equal(15);
    });

    it('should correctly search workflows by name', async () => {
      const searchTerm = 'SEARCHABLE_WORKFLOW';

      // Create workflows with different names
      await createWorkflow(`${searchTerm}_1`);
      await createWorkflow(`${searchTerm}_2`);
      await createWorkflow('Different Workflow');

      const { body } = await session.testAgent.get('/v2/workflows').query({
        query: searchTerm,
      });

      expect(body.data.workflows).to.have.length(2);
      expect(body.data.workflows[0].name).to.include(searchTerm);
      expect(body.data.workflows[1].name).to.include(searchTerm);
    });
  });

  describe('Sorting', () => {
    it('should sort workflows by creation date in descending order by default', async () => {
      await createWorkflow('First Workflow');
      await delay(100); // Ensure different creation times
      await createWorkflow('Second Workflow');

      const { body } = await session.testAgent.get('/v2/workflows');

      expect(body.data.workflows[0].name).to.equal('Second Workflow');
      expect(body.data.workflows[1].name).to.equal('First Workflow');
    });

    it('should sort workflows by creation date in ascending order when specified', async () => {
      await createWorkflow('First Workflow');
      await delay(100); // Ensure different creation times
      await createWorkflow('Second Workflow');

      const { body } = await session.testAgent.get('/v2/workflows').query({
        orderDirection: DirectionEnum.ASC,
        orderBy: 'createdAt',
      });

      expect(body.data.workflows[0].name).to.equal('First Workflow');
      expect(body.data.workflows[1].name).to.equal('Second Workflow');
    });
  });

  describe('Response Structure', () => {
    it('should return correct workflow fields in response', async () => {
      const workflowName = 'Test Workflow Structure';
      const createdWorkflow = await createWorkflow(workflowName);

      const { body } = await session.testAgent.get('/v2/workflows');
      const returnedWorkflow = body.data.workflows[0];

      expect(returnedWorkflow).to.include({
        _id: createdWorkflow._id,
        name: workflowName,
        workflowId: createdWorkflow.workflowId,
        status: WorkflowStatusEnum.ACTIVE,
      });
      expect(returnedWorkflow.createdAt).to.be.a('string');
      expect(returnedWorkflow.updatedAt).to.be.a('string');
    });
  });

  async function createWorkflow(name: string): Promise<WorkflowResponseDto> {
    const createWorkflowDto: CreateWorkflowDto = {
      name,
      workflowId: name.toLowerCase().replace(/\s+/g, '-'),
      __source: WorkflowCreationSourceEnum.EDITOR,
      active: true,
      steps: [],
    };

    const { body } = await session.testAgent.post('/v2/workflows').send(createWorkflowDto);

    return body.data;
  }

  function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
});
