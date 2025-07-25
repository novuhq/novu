import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { EnvironmentRepository, NotificationTemplateRepository } from '@novu/dal';
import { StepTypeEnum, ResourceOriginEnum, ResourceTypeEnum } from '@novu/shared';
import { Novu } from '@novu/api';
import { CreateWorkflowDto, WorkflowCreationSourceEnum, WorkflowResponseDto } from '@novu/api/models/components';
import { initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';
import { LayoutCreationSourceEnum } from '../../layouts-v2/types';

describe('Environment Diff - /v2/environments/:targetEnvironmentId/diff (POST) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  const environmentRepository = new EnvironmentRepository();
  const workflowRepository = new NotificationTemplateRepository();

  beforeEach(async () => {
    // @ts-ignore
    process.env.IS_LAYOUTS_PAGE_ACTIVE = 'true';
    // @ts-ignore
    process.env.IS_HTML_EDITOR_ENABLED = 'true';
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);
  });

  afterEach(async () => {
    // @ts-ignore
    process.env.IS_LAYOUTS_PAGE_ACTIVE = 'false';
    // @ts-ignore
    process.env.IS_HTML_EDITOR_ENABLED = 'false';
  });

  async function getProductionEnvironment() {
    const prodEnv = await environmentRepository.findOne({
      _parentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    if (!prodEnv) {
      throw new Error('Production environment not found');
    }

    return prodEnv;
  }

  async function createWorkflow(workflow: CreateWorkflowDto): Promise<WorkflowResponseDto> {
    const { result: createWorkflowBody } = await novuClient.workflows.create(workflow);

    return createWorkflowBody;
  }

  describe('Error Handling', () => {
    it('should return 400 when source and target environments are the same', async () => {
      const { body } = await session.testAgent
        .post(`/v2/environments/${session.environment._id}/diff`)
        .send({
          sourceEnvironmentId: session.environment._id,
        })
        .expect(400);

      expect(body.message).to.equal('Source and target environments cannot be the same');
    });

    it('should return 400 when source environment is invalid', async () => {
      const prodEnv = await getProductionEnvironment();

      const { body } = await session.testAgent
        .post(`/v2/environments/${prodEnv._id}/diff`)
        .send({
          sourceEnvironmentId: 'invalid-id',
        })
        .expect(400);

      expect(body.message).to.contain('Invalid environment ID format');
    });

    it('should return 400 when target environment is invalid', async () => {
      const { body } = await session.testAgent
        .post(`/v2/environments/invalid-id/diff`)
        .send({
          sourceEnvironmentId: session.environment._id,
        })
        .expect(400);

      expect(body.message).to.contain('Invalid environment ID format');
    });

    it('should return 400 when source environment does not exist', async () => {
      const prodEnv = await getProductionEnvironment();

      const { body } = await session.testAgent
        .post(`/v2/environments/${prodEnv._id}/diff`)
        .send({
          sourceEnvironmentId: '507f1f77bcf86cd799439011',
        })
        .expect(400);

      expect(body.message).to.equal('Source environment not found');
    });

    it('should return 400 when target environment does not exist', async () => {
      const { body } = await session.testAgent
        .post(`/v2/environments/507f1f77bcf86cd799439011/diff`)
        .send({
          sourceEnvironmentId: session.environment._id,
        })
        .expect(400);

      expect(body.message).to.equal('Target environment not found');
    });
  });

  describe('Workflow Diff Tests', () => {
    it('should return empty diff when environments are identical', async () => {
      const prodEnv = await getProductionEnvironment();

      const { body } = await session.testAgent
        .post(`/v2/environments/${prodEnv._id}/diff`)
        .send({
          sourceEnvironmentId: session.environment._id,
        })
        .expect(200);

      expect(body.data.sourceEnvironmentId).to.equal(session.environment._id);
      expect(body.data.targetEnvironmentId).to.equal(prodEnv._id);
      expect(body.data.resources).to.be.an('array');
      expect(body.data.summary.totalEntities).to.equal(0);
      expect(body.data.summary.totalChanges).to.equal(0);
      expect(body.data.summary.hasChanges).to.equal(false);
    });

    it('should use development environment as default source when sourceEnvironmentId is not provided', async () => {
      const prodEnv = await getProductionEnvironment();

      // Create a workflow in the development environment using the SDK
      const workflowData = {
        name: 'Test Workflow for Diff',
        workflowId: 'test-workflow-diff',
        description: 'This is a test workflow for diff',
        active: true,
        steps: [
          {
            name: 'Email Step',
            type: 'email' as const,
            controlValues: {
              subject: 'Test Subject',
              body: 'Test email content',
            },
          },
        ],
        source: WorkflowCreationSourceEnum.Editor,
      };

      const { result: workflow } = await novuClient.workflows.create(workflowData);

      // Wait a bit for the workflow to be fully created
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 100);
      });

      // Test diff without providing sourceEnvironmentId - should default to development
      const { body } = await session.testAgent
        .post(`/v2/environments/${prodEnv._id}/diff`)
        .send({}) // No sourceEnvironmentId provided
        .expect(200);

      expect(body.data.sourceEnvironmentId).to.equal(session.environment._id); // Should default to dev environment
      expect(body.data.targetEnvironmentId).to.equal(prodEnv._id);
      expect(body.data.resources).to.be.an('array');
      expect(body.data.summary.totalEntities).to.equal(1); // Should find the workflow we created
      expect(body.data.summary.hasChanges).to.equal(true); // Should show changes since prod is empty
    });

    describe('Layout-Workflow Dependencies', () => {
      beforeEach(async () => {
        const prodEnv = await getProductionEnvironment();

        const defaultLayout = {
          layoutId: 'default-layout',
          name: 'Default Layout',
          source: LayoutCreationSourceEnum.DASHBOARD,
        };

        await novuClient.layouts.create(defaultLayout);
        await session.testAgent
          .post(`/v2/environments/${prodEnv._id}/publish`)
          .send({
            sourceEnvironmentId: session.environment._id,
            dryRun: false,
          })
          .expect(200);
      });
      it('should handle layout-workflow dependencies properly in diff when layout is removed after publishing', async () => {
        const prodEnv = await getProductionEnvironment();

        // Step 1: Create a new layout in development environment
        const layoutData = {
          layoutId: 'test-layout-dependency',
          name: 'Test Layout for Dependencies',
          source: LayoutCreationSourceEnum.DASHBOARD,
        };

        const { result: layout } = await novuClient.layouts.create(layoutData);

        const workflowData = {
          name: 'Test Workflow with Layout Dependency',
          workflowId: 'test-workflow-with-layout-dependency',
          description: 'Workflow that depends on the test layout',
          active: true,
          steps: [
            {
              name: 'Email Step with Layout',
              type: 'email' as const,
              controlValues: {
                subject: 'Test Subject with Layout',
                body: 'Test email content with layout',
                layoutId: layout.layoutId,
              },
            },
          ],
          source: WorkflowCreationSourceEnum.Editor,
        };

        await novuClient.workflows.create(workflowData);

        // Step 3: Publish both layout and workflow to production
        await session.testAgent
          .post(`/v2/environments/${prodEnv._id}/publish`)
          .send({
            sourceEnvironmentId: session.environment._id,
            dryRun: false,
          })
          .expect(200);

        await novuClient.layouts.delete(layout.layoutId);

        const diffResult = await session.testAgent
          .post(`/v2/environments/${prodEnv._id}/diff`)
          .send({
            sourceEnvironmentId: session.environment._id,
          })
          .expect(200);

        // Find the workflow and layout in the diff results
        const workflowResource = diffResult.body.data.resources.find(
          (resource: any) => resource.resourceType === 'workflow'
        );
        const layoutResource = diffResult.body.data.resources.find(
          (resource: any) => resource.resourceType === 'layout'
        );

        expect(workflowResource).to.exist;
        expect(workflowResource.targetResource?.name).to.equal('Test Workflow with Layout Dependency');
        // Workflow should not have dependencies - it can function without the specific layout
        expect(workflowResource.dependencies).to.not.exist;

        expect(layoutResource).to.exist;
        expect(layoutResource.targetResource?.name).to.equal('Test Layout for Dependencies');
        expect(layoutResource.sourceResource).to.be.null; // Layout was deleted from source

        /*
         * Verify dependencies are properly identified - the layout should be blocked from deletion
         * because it's still being used by workflows in the target environment
         */
        expect(layoutResource.dependencies).to.be.an('array');
        expect(layoutResource.dependencies.length).to.be.greaterThan(0);

        const workflowDependency = layoutResource.dependencies.find((dep: any) => dep.resourceType === 'workflow');

        expect(workflowDependency.resourceName).to.equal('Test Workflow with Layout Dependency');
        expect(workflowDependency.isBlocking).to.equal(true);
        expect(workflowDependency.reason).to.be.equal('LAYOUT_REQUIRED_FOR_WORKFLOW');
      });

      it('should show workflow blocked by layout dependency when both are new resources', async () => {
        const prodEnv = await getProductionEnvironment();

        // Step 1: Create a new layout in development environment
        const layoutData = {
          layoutId: 'new-layout-for-blocking-test',
          name: 'New Layout for Blocking Test',
          source: LayoutCreationSourceEnum.DASHBOARD,
        };

        const { result: layout } = await novuClient.layouts.create(layoutData);

        // Step 2: Create a workflow that depends on the new layout
        const workflowData: CreateWorkflowDto = {
          name: 'New Workflow with New Layout Dependency',
          workflowId: 'new-workflow-with-new-layout-dependency',
          description: 'New workflow that depends on a new layout',
          active: true,
          steps: [
            {
              name: 'Email Step with New Layout',
              type: 'email' as const,
              controlValues: {
                subject: 'Test Subject with New Layout',
                body: 'Test email content with new layout',
                layoutId: layout.layoutId,
              },
            },
          ],
          source: WorkflowCreationSourceEnum.Editor,
        };

        await novuClient.workflows.create(workflowData);

        // Step 3: Get diff between dev and prod (both resources are new)
        const diffResult = await session.testAgent
          .post(`/v2/environments/${prodEnv._id}/diff`)
          .send({
            sourceEnvironmentId: session.environment._id,
          })
          .expect(200);

        // Find the workflow and layout in the diff results
        const workflowResource = diffResult.body.data.resources.find(
          (resource) =>
            resource.resourceType === 'workflow' &&
            resource.sourceResource?.id === 'new-workflow-with-new-layout-dependency'
        );
        const layoutResource = diffResult.body.data.resources.find(
          (resource) =>
            resource.resourceType === 'layout' && resource.sourceResource?.id === 'new-layout-for-blocking-test'
        );

        expect(workflowResource).to.exist;
        expect(workflowResource.sourceResource?.name).to.equal('New Workflow with New Layout Dependency');
        expect(workflowResource.targetResource).to.be.null; // New in source, doesn't exist in target

        expect(layoutResource).to.exist;
        expect(layoutResource.sourceResource?.name).to.equal('New Layout for Blocking Test');
        expect(layoutResource.targetResource).to.be.null; // New in source, doesn't exist in target

        // Verify workflow has dependency on the layout
        expect(workflowResource.dependencies).to.be.an('array');
        expect(workflowResource.dependencies.length).to.be.greaterThan(0);

        const layoutDependency = workflowResource.dependencies.find(
          (dep) => dep.resourceType === 'layout' && dep.resourceId === layout.layoutId
        );

        expect(layoutDependency).to.exist;
        expect(layoutDependency.resourceName).to.equal('New Layout for Blocking Test');
        expect(layoutDependency.isBlocking).to.equal(true);
        expect(layoutDependency.reason).to.equal('LAYOUT_REQUIRED_FOR_WORKFLOW');
      });
    });
  });
});
