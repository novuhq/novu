import { Novu } from '@novu/api';
import { CreateWorkflowDto, WorkflowCreationSourceEnum } from '@novu/api/models/components';
import { EnvironmentRepository, LocalizationResourceEnum } from '@novu/dal';
import { ApiServiceLevelEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { LayoutCreationSourceEnum } from '../../layouts-v2/types';
import { initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Environment Diff - /v2/environments/:targetEnvironmentId/diff (POST) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  const environmentRepository = new EnvironmentRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);
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

  describe('Workflow Diff Tests', () => {
    it('should return empty diff when environments are identical after creating and publishing a workflow', async () => {
      const prodEnv = await getProductionEnvironment();

      const workflowData = {
        name: 'Test Workflow for Empty Diff',
        workflowId: 'test-workflow-empty-diff',
        description: 'This is a test workflow to validate empty diff after publishing',
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

      await novuClient.workflows.create(workflowData);

      await session.testAgent
        .post(`/v2/environments/${prodEnv._id}/publish`)
        .send({
          sourceEnvironmentId: session.environment._id,
          dryRun: false,
        })
        .expect(200);

      const { body } = await session.testAgent
        .post(`/v2/environments/${prodEnv._id}/diff`)
        .send({
          sourceEnvironmentId: session.environment._id,
        })
        .expect(200);

      expect(body.data.sourceEnvironmentId).to.equal(session.environment._id);
      expect(body.data.targetEnvironmentId).to.equal(prodEnv._id);
      expect(body.data.resources).to.be.an('array');
      expect(body.data.resources.length).to.equal(0);
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
        await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

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
        await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.PRO);
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
        await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.PRO);
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

      it('should only show dependency on new layout when workflow changes layouts', async () => {
        const prodEnv = await getProductionEnvironment();

        // Create two layouts
        const oldLayout = await novuClient.layouts.create({
          layoutId: 'old-layout',
          name: 'Old Layout',
          source: LayoutCreationSourceEnum.DASHBOARD,
        });

        const newLayout = await novuClient.layouts.create({
          layoutId: 'new-layout',
          name: 'New Layout',
          source: LayoutCreationSourceEnum.DASHBOARD,
        });

        // Create workflow with old layout
        const workflow = await novuClient.workflows.create({
          name: 'Test Workflow Layout Change',
          workflowId: 'test-workflow-layout-change',
          active: true,
          steps: [
            {
              name: 'Email Step',
              type: 'email' as const,
              controlValues: {
                subject: 'Test',
                body: 'Test',
                layoutId: oldLayout.result.layoutId,
              },
            },
          ],
          source: WorkflowCreationSourceEnum.Editor,
        });

        // Publish to prod
        await session.testAgent
          .post(`/v2/environments/${prodEnv._id}/publish`)
          .send({ sourceEnvironmentId: session.environment._id, dryRun: false })
          .expect(200);

        // Update workflow to use new layout
        await novuClient.workflows.update(
          {
            ...workflow.result,
            steps: [
              {
                name: 'Email Step',
                type: 'email' as const,
                controlValues: {
                  subject: 'Test',
                  body: 'Test',
                  layoutId: newLayout.result.layoutId,
                },
              },
            ],
          },
          workflow.result.workflowId
        );

        // Check diff - should only show dependency on new layout
        const { body } = await session.testAgent
          .post(`/v2/environments/${prodEnv._id}/diff`)
          .send({ sourceEnvironmentId: session.environment._id })
          .expect(200);

        const workflowResource = body.data.resources.find(
          (resource) =>
            resource.resourceType === 'workflow' && resource.sourceResource?.id === 'test-workflow-layout-change'
        );

        expect(workflowResource.dependencies).to.have.length(1);
        expect(workflowResource.dependencies[0].resourceId).to.equal('new-layout');
      });
    });
  });

  describe('Localization Group Diff Tests', () => {
    beforeEach(async () => {
      // Enable translation feature for testing
      (process.env as any).IS_TRANSLATION_ENABLED = 'true';
      // Set organization service level to business to avoid payment required errors
      await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);
    });

    afterEach(() => {
      // Disable translation feature after each test
      (process.env as any).IS_TRANSLATION_ENABLED = 'false';
    });

    it('should detect localization group modifications when translation content changes', async () => {
      const prodEnv = await getProductionEnvironment();

      // Create a workflow with translations enabled
      const workflowData = {
        name: 'Test Workflow with Translations',
        workflowId: 'test-workflow-translations',
        description: 'Test workflow for localization diff',
        active: true,
        isTranslationEnabled: true,
        steps: [
          {
            name: 'In-App Step',
            type: 'in_app' as const,
            controlValues: {
              body: 'Original content',
            },
          },
        ],
        source: WorkflowCreationSourceEnum.Editor,
      };

      const { result: workflow } = await novuClient.workflows.create(workflowData);

      // Create initial translation in development environment
      const initialTranslation = {
        resourceId: workflow.workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          'welcome.title': 'Welcome',
          'welcome.message': 'Hello there!',
          'button.submit': 'Submit',
        },
      };

      await session.testAgent.post('/v2/translations').send(initialTranslation).expect(200);

      // Publish to production environment
      await session.testAgent
        .post(`/v2/environments/${prodEnv._id}/publish`)
        .send({
          sourceEnvironmentId: session.environment._id,
          dryRun: false,
        })
        .expect(200);

      // Modify translation content in development environment
      const modifiedTranslation = {
        resourceId: workflow.workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: 'en_US',
        content: {
          'welcome.title': 'Welcome Updated',
          'welcome.message': 'Hello there! Updated message.',
          'button.submit': 'Submit Now',
          'new.key': 'New content added',
        },
      };

      await session.testAgent.post('/v2/translations').send(modifiedTranslation).expect(200);

      const { body } = await session.testAgent
        .post(`/v2/environments/${prodEnv._id}/diff`)
        .send({
          sourceEnvironmentId: session.environment._id,
        })
        .expect(200);

      // Find localization group resource in diff
      const localizationGroupResource = body.data.resources.find((resource) => resource.resourceType === 'workflow');

      expect(localizationGroupResource).to.exist;
      expect(localizationGroupResource.sourceResource).to.exist;
      expect(localizationGroupResource.targetResource).to.exist;
      expect(localizationGroupResource.summary.modified).to.be.greaterThan(0);

      // Verify changes array contains the modification
      expect(localizationGroupResource.changes).to.be.an('array');
      expect(localizationGroupResource.changes.length).to.be.greaterThan(0);

      const change = localizationGroupResource.changes[0];
      expect(change.resourceType).to.equal('localization_group');
      expect(change.action).to.equal('modified');
      expect(change.diffs).to.exist;
      expect(change.diffs.new.translations.en_US).to.deep.equal(modifiedTranslation.content);
      expect(change.diffs.previous.translations.en_US).to.deep.equal(initialTranslation.content);
    });

    it('should detect localization group when new locale is added', async () => {
      const prodEnv = await getProductionEnvironment();

      // Create a workflow with translations enabled
      const workflowData = {
        name: 'Test Workflow Locale Addition',
        workflowId: 'test-workflow-locale-addition',
        active: true,
        isTranslationEnabled: true,
        steps: [
          {
            name: 'In-App Step',
            type: 'in_app' as const,
            controlValues: {
              body: 'Test content',
            },
          },
        ],
        source: WorkflowCreationSourceEnum.Editor,
      };

      const { result: workflow } = await novuClient.workflows.create(workflowData);

      // Create initial English translation
      await session.testAgent
        .post('/v2/translations')
        .send({
          resourceId: workflow.workflowId,
          resourceType: LocalizationResourceEnum.WORKFLOW,
          locale: 'en_US',
          content: {
            'welcome.title': 'Welcome',
            'welcome.message': 'Hello!',
          },
        })
        .expect(200);

      // Publish to production
      await session.testAgent
        .post(`/v2/environments/${prodEnv._id}/publish`)
        .send({
          sourceEnvironmentId: session.environment._id,
          dryRun: false,
        })
        .expect(200);

      // Add Spanish translation in development
      await session.testAgent
        .post('/v2/translations')
        .send({
          resourceId: workflow.workflowId,
          resourceType: LocalizationResourceEnum.WORKFLOW,
          locale: 'es_ES',
          content: {
            'welcome.title': 'Bienvenido',
            'welcome.message': '¡Hola!',
          },
        })
        .expect(200);

      // Get diff
      const { body } = await session.testAgent
        .post(`/v2/environments/${prodEnv._id}/diff`)
        .send({
          sourceEnvironmentId: session.environment._id,
        })
        .expect(200);

      // Find localization group resource
      const localizationGroupResource = body.data.resources.find((resource) => resource.resourceType === 'workflow');

      expect(localizationGroupResource).to.exist;
      expect(localizationGroupResource.summary.modified).to.be.greaterThan(0);

      // Verify new locale is detected in changes
      const change = localizationGroupResource.changes[0];
      expect(change.diffs.new.locales).to.include('es_ES');
      expect(change.diffs.new.translations.es_ES).to.exist;
      expect(change.diffs.previous.locales).to.not.include('es_ES');
    });
  });
});
