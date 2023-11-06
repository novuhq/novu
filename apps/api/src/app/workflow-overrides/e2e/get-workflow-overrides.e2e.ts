import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { WorkflowOverrideService } from '@novu/testing';
import { NotificationGroupRepository, NotificationTemplateRepository } from '@novu/dal';

describe('Get workflows overrides - /workflow-overrides/workflows/:workflowId (GET)', async () => {
  let session: UserSession;
  const notificationTemplateRepository = new NotificationTemplateRepository();
  const notificationGroupRepository = new NotificationGroupRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should return all workflows override by workflow id', async () => {
    const workflowOverrideService = new WorkflowOverrideService({
      organizationId: session.organization._id,
      environmentId: session.environment._id,
    });

    const groups = await notificationGroupRepository.find({
      _environmentId: session.environment._id,
    });

    const workflow = await notificationTemplateRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      name: 'test api template',
      description: 'This is a test description',
      tags: ['test-tag-api'],
      notificationGroupId: groups[0]._id,
      steps: [],
      triggers: [{ identifier: 'test-trigger-api' }],
    });

    const noOverrides = (await session.testAgent.get(`/v1/workflow-overrides/workflows/${workflow._id}`)).body.data;

    expect(noOverrides.length).to.equal(0);

    await workflowOverrideService.createWorkflowOverride({ _workflowId: workflow._id });
    await workflowOverrideService.createWorkflowOverride({ _workflowId: workflow._id });
    await workflowOverrideService.createWorkflowOverride({ _workflowId: workflow._id });

    const data = (await session.testAgent.get(`/v1/workflow-overrides/workflows/${workflow._id}`)).body.data;

    expect(data.length).to.equal(3);

    const paginatedData = (
      await session.testAgent.get(`/v1/workflow-overrides/workflows/${workflow._id}?page=1&limit=2`)
    ).body.data;

    expect(paginatedData.length).to.equal(1);
  });

  it('should return all workflows override by workflow id with pagination', async () => {
    const workflowOverrideService = new WorkflowOverrideService({
      organizationId: session.organization._id,
      environmentId: session.environment._id,
    });

    const groups = await notificationGroupRepository.find({
      _environmentId: session.environment._id,
    });

    const workflow = await notificationTemplateRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      name: 'test api template',
      description: 'This is a test description',
      tags: ['test-tag-api'],
      notificationGroupId: groups[0]._id,
      steps: [],
      triggers: [{ identifier: 'test-trigger-api' }],
    });

    await workflowOverrideService.createWorkflowOverride({ _workflowId: workflow._id });
    await workflowOverrideService.createWorkflowOverride({ _workflowId: workflow._id });
    await workflowOverrideService.createWorkflowOverride({ _workflowId: workflow._id });

    const page1 = (await session.testAgent.get(`/v1/workflow-overrides/workflows/${workflow._id}?limit=2`)).body;

    expect(page1.data.length).to.equal(2);
    expect(page1.hasMore).to.equal(true);

    const page2 = (await session.testAgent.get(`/v1/workflow-overrides/workflows/${workflow._id}?page=1&limit=2`)).body;

    expect(page2.data.length).to.equal(1);
    expect(page2.hasMore).to.equal(false);
  });
});
