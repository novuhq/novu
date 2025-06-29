import chai, { expect } from 'chai';
import chaiSubset from 'chai-subset';
import { UserSession } from '@novu/testing';
import { Novu } from '@novu/api';
import { NotificationTemplateRepository, EnvironmentRepository } from '@novu/dal';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  StepTypeEnum,
  ResourceOriginEnum,
  WorkflowCreationSourceEnum,
} from '@novu/api/models/components';
import { WorkflowResponseDto } from '@novu/api/src/models/components';
import { slugify } from '@novu/shared';
import { initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

chai.use(chaiSubset);

describe('Control Values Validation E2E - #novu-v2', () => {
  let session: UserSession;
  let apiClient: Novu;
  const notificationTemplateRepository = new NotificationTemplateRepository();
  const environmentRepository = new EnvironmentRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    apiClient = initNovuClassSdkInternalAuth(session);
  });

  async function updateWorkflow(id: string, workflow: UpdateWorkflowDto): Promise<WorkflowResponseDto> {
    const res = await apiClient.workflows.update(workflow, id);

    return res.result;
  }

  /**
   * Emulate external origin by directly updating the database
   */
  async function emulateExternalOrigin(_workflowId: string) {
    await notificationTemplateRepository.updateOne(
      {
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        _id: _workflowId,
      },
      {
        origin: ResourceOriginEnum.External,
      }
    );

    await environmentRepository.updateOne(
      {
        _id: session.environment._id,
      },
      {
        bridge: { url: `http://localhost:${process.env.PORT}/v1/environments/${session.environment._id}/bridge` },
      }
    );
  }

  describe('NOVU_CLOUD workflows', () => {
    it('should work with typed control values for email steps', async () => {
      const createWorkflowDto: CreateWorkflowDto = {
        source: WorkflowCreationSourceEnum.Editor,
        name: 'NOVU_CLOUD Email Test',
        workflowId: slugify('NOVU_CLOUD Email Test'),
        description: 'Test workflow for NOVU_CLOUD origin',
        active: true,
        steps: [
          {
            name: 'Email Test Step',
            type: StepTypeEnum.Email,
            controlValues: {
              subject: 'Valid email subject',
              body: 'Valid email body',
              disableOutputSanitization: false,
            },
          },
        ],
      };

      const workflow = await apiClient.workflows.create(createWorkflowDto);
      expect(workflow.result).to.be.ok;
      expect(workflow.result.origin).to.equal(ResourceOriginEnum.NovuCloud);
      expect(workflow.result.steps[0].controls.values).to.deep.include({
        subject: 'Valid email subject',
        disableOutputSanitization: false,
      });
    });

    it('should work with typed control values for in-app steps', async () => {
      const createWorkflowDto: CreateWorkflowDto = {
        source: WorkflowCreationSourceEnum.Editor,
        name: 'NOVU_CLOUD InApp Test',
        workflowId: slugify('NOVU_CLOUD InApp Test'),
        description: 'Test workflow for NOVU_CLOUD origin',
        active: true,
        steps: [
          {
            name: 'In-App Test Step',
            type: StepTypeEnum.InApp,
            controlValues: {
              subject: 'Valid in-app subject',
              body: 'Valid in-app body',
              avatar: 'https://example.com/avatar.png',
              primaryAction: {
                label: 'Click me',
                redirect: {
                  url: 'https://example.com',
                  target: '_blank',
                },
              },
            },
          },
        ],
      };

      const workflow = await apiClient.workflows.create(createWorkflowDto);
      expect(workflow.result).to.be.ok;
      expect(workflow.result.origin).to.equal(ResourceOriginEnum.NovuCloud);
      expect(workflow.result.steps[0].controls.values).to.deep.include({
        subject: 'Valid in-app subject',
        body: 'Valid in-app body',
        avatar: 'https://example.com/avatar.png',
      });
    });
  });

  describe('EXTERNAL workflows', () => {
    it('should accept flexible JSON objects in control values for email steps', async () => {
      const createWorkflowDto: CreateWorkflowDto = {
        source: WorkflowCreationSourceEnum.Editor,
        name: 'EXTERNAL Email Test',
        workflowId: slugify('EXTERNAL Email Test'),
        description: 'Test workflow for EXTERNAL origin',
        active: true,
        steps: [
          {
            name: 'Email Test Step',
            type: StepTypeEnum.Email,
            controlValues: {
              subject: 'Initial subject',
              body: 'Initial body',
            },
          },
        ],
      };

      const workflow = await apiClient.workflows.create(createWorkflowDto);
      expect(workflow.result).to.be.ok;

      // Set the workflow origin to EXTERNAL directly in the database
      await emulateExternalOrigin(workflow.result.id);

      // Update with flexible control values
      const updateDto: UpdateWorkflowDto = {
        name: workflow.result.name,
        workflowId: workflow.result.workflowId,
        origin: ResourceOriginEnum.External,
        preferences: { user: null },
        steps: [
          {
            name: 'Email Test Step',
            type: StepTypeEnum.Email,
            id: workflow.result.steps[0].id,
            controlValues: {
              // Flexible structure - not matching EmailControlDto exactly
              customSubject: 'External workflow subject',
              customBody: 'External workflow body',
              customField: 'This is allowed in external workflows',
              nestedObject: {
                key1: 'value1',
                key2: 42,
                key3: true,
              },
              arrayField: ['item1', 'item2', 'item3'],
              // Still include some standard fields to ensure compatibility
              subject: 'Standard subject field',
              body: 'Standard body field',
            },
          },
        ],
      };

      const updatedWorkflow = await updateWorkflow(workflow.result.id, updateDto);
      expect(updatedWorkflow).to.be.ok;
      expect(updatedWorkflow.origin).to.equal(ResourceOriginEnum.External);

      const controlValues = updatedWorkflow.steps[0].controls.values;
      expect(controlValues).to.have.property('customSubject');
      expect(controlValues).to.have.property('customBody');
      expect(controlValues).to.have.property('customField');
      expect(controlValues).to.have.property('nestedObject');
      expect(controlValues).to.have.property('arrayField');
      expect((controlValues as any).customSubject).to.equal('External workflow subject');
      expect((controlValues as any).nestedObject.key2).to.equal(42);
    });

    it('should accept completely arbitrary JSON structure for external workflows', async () => {
      const createWorkflowDto: CreateWorkflowDto = {
        source: WorkflowCreationSourceEnum.Editor,
        name: 'EXTERNAL Arbitrary Test',
        workflowId: slugify('EXTERNAL Arbitrary Test'),
        description: 'Test workflow with arbitrary JSON structure',
        active: true,
        steps: [
          {
            name: 'Custom Step',
            type: StepTypeEnum.Email,
            controlValues: {
              subject: 'Initial subject',
              body: 'Initial body',
            },
          },
        ],
      };

      const workflow = await apiClient.workflows.create(createWorkflowDto);
      expect(workflow.result).to.be.ok;

      // Set the workflow origin to EXTERNAL directly in the database
      await emulateExternalOrigin(workflow.result.id);

      // Update with arbitrary data
      const updateDto: UpdateWorkflowDto = {
        name: workflow.result.name,
        workflowId: workflow.result.workflowId,
        origin: ResourceOriginEnum.External,
        preferences: { user: null },
        steps: [
          {
            name: 'Custom Step',
            type: StepTypeEnum.Email,
            id: workflow.result.steps[0].id,
            controlValues: {
              // Completely arbitrary structure
              customFramework: {
                name: 'CustomNotificationFramework',
                version: '2.0.0',
                plugins: [
                  { name: 'validator', config: { strict: false } },
                  { name: 'renderer', config: { cache: true } },
                ],
              },
              userDefinedFields: {
                field1: 'string value',
                field2: 12345,
                field3: [1, 2, 3, 4, 5],
                field4: {
                  nested: {
                    deeply: {
                      value: 'deep nesting is allowed',
                    },
                  },
                },
              },
              flags: {
                enableFeatureA: true,
                enableFeatureB: false,
                experimentalFeatures: ['feature1', 'feature2'],
              },
              // Include minimal required fields for compatibility
              subject: 'Framework notification',
              body: 'Custom framework body',
            },
          },
        ],
      };

      const updatedWorkflow = await updateWorkflow(workflow.result.id, updateDto);
      expect(updatedWorkflow).to.be.ok;
      expect(updatedWorkflow.origin).to.equal(ResourceOriginEnum.External);

      const controlValues = updatedWorkflow.steps[0].controls.values;
      expect(controlValues).to.have.property('customFramework');
      expect(controlValues).to.have.property('userDefinedFields');
      expect(controlValues).to.have.property('flags');
      expect((controlValues as any).customFramework.name).to.equal('CustomNotificationFramework');
      expect((controlValues as any).flags.enableFeatureA).to.be.true;
      expect((controlValues as any).userDefinedFields.field4.nested.deeply.value).to.equal('deep nesting is allowed');
    });

    it('should handle mixed standard and custom fields for external workflows', async () => {
      const createWorkflowDto: CreateWorkflowDto = {
        source: WorkflowCreationSourceEnum.Editor,
        name: 'EXTERNAL Mixed Test',
        workflowId: slugify('EXTERNAL Mixed Test'),
        description: 'Test workflow with mixed field types',
        active: true,
        steps: [
          {
            name: 'Mixed Step',
            type: StepTypeEnum.InApp,
            controlValues: {
              subject: 'Initial subject',
              body: 'Initial body',
            },
          },
        ],
      };

      const workflow = await apiClient.workflows.create(createWorkflowDto);
      expect(workflow.result).to.be.ok;

      // Set the workflow origin to EXTERNAL directly in the database
      await emulateExternalOrigin(workflow.result.id);

      // Update with mixed fields
      const updateDto: UpdateWorkflowDto = {
        name: workflow.result.name,
        workflowId: workflow.result.workflowId,
        origin: ResourceOriginEnum.External,
        preferences: { user: null },
        steps: [
          {
            name: 'Mixed Step',
            type: StepTypeEnum.InApp,
            id: workflow.result.steps[0].id,
            controlValues: {
              // Standard in-app fields
              subject: 'Standard subject',
              body: 'Standard body',
              avatar: 'https://example.com/avatar.png',
              // Custom fields that wouldn't be in InAppControlDto
              customNotificationType: 'alert',
              customPriority: 'high',
              customMetadata: {
                source: 'external-system',
                timestamp: new Date().toISOString(),
                version: '1.0',
              },
              customActions: [
                { id: 'action1', label: 'Custom Action 1', type: 'button' },
                { id: 'action2', label: 'Custom Action 2', type: 'link' },
              ],
            },
          },
        ],
      };

      const updatedWorkflow = await updateWorkflow(workflow.result.id, updateDto);
      expect(updatedWorkflow).to.be.ok;
      expect(updatedWorkflow.origin).to.equal(ResourceOriginEnum.External);

      const controlValues = updatedWorkflow.steps[0].controls.values;
      // Standard fields should be present
      expect(controlValues).to.have.property('subject');
      expect(controlValues).to.have.property('body');
      expect(controlValues).to.have.property('avatar');
      // Custom fields should also be present
      expect(controlValues).to.have.property('customNotificationType');
      expect(controlValues).to.have.property('customPriority');
      expect(controlValues).to.have.property('customMetadata');
      expect(controlValues).to.have.property('customActions');

      expect((controlValues as any).customNotificationType).to.equal('alert');
      expect((controlValues as any).customMetadata.source).to.equal('external-system');
      expect((controlValues as any).customActions).to.have.length(2);
    });
  });

  describe('Origin transition scenarios', () => {
    it('should handle transition from NOVU_CLOUD to EXTERNAL workflow', async () => {
      // Create a NOVU_CLOUD workflow with typed control values
      const createWorkflowDto: CreateWorkflowDto = {
        source: WorkflowCreationSourceEnum.Editor,
        name: 'Transition Test',
        workflowId: slugify('Transition Test'),
        description: 'Test workflow for origin transition',
        active: true,
        steps: [
          {
            name: 'Email Step',
            type: StepTypeEnum.Email,
            controlValues: {
              subject: 'NOVU_CLOUD subject',
              body: 'NOVU_CLOUD body',
              disableOutputSanitization: false,
            },
          },
        ],
      };

      const workflow = await apiClient.workflows.create(createWorkflowDto);
      expect(workflow.result).to.be.ok;
      expect(workflow.result.origin).to.equal(ResourceOriginEnum.NovuCloud);

      // Set the workflow origin to EXTERNAL directly in the database
      await emulateExternalOrigin(workflow.result.id);

      // Update with flexible control values
      const updateDto: UpdateWorkflowDto = {
        name: workflow.result.name,
        workflowId: workflow.result.workflowId,
        origin: ResourceOriginEnum.External,
        preferences: { user: null },
        steps: [
          {
            name: 'Email Step',
            type: StepTypeEnum.Email,
            id: workflow.result.steps[0].id,
            controlValues: {
              // Mix of original typed fields and new flexible fields
              subject: 'Updated subject',
              body: 'Updated body',
              disableOutputSanitization: false,
              // New custom fields that are now allowed
              customField: 'This is now allowed',
              metadata: {
                migrated: true,
                originalOrigin: 'NOVU_CLOUD',
                migrationDate: new Date().toISOString(),
              },
              externalConfig: {
                templateEngine: 'handlebars',
                features: ['responsive', 'dark-mode'],
              },
            },
          },
        ],
      };

      const updatedWorkflow = await updateWorkflow(workflow.result.id, updateDto);
      expect(updatedWorkflow).to.be.ok;
      expect(updatedWorkflow.origin).to.equal(ResourceOriginEnum.External);

      const controlValues = updatedWorkflow.steps[0].controls.values;
      // Original typed fields should still be present
      expect(controlValues).to.deep.include({
        subject: 'Updated subject',
        body: 'Updated body',
        disableOutputSanitization: false,
      });
      // New custom fields should also be present
      expect(controlValues).to.have.property('customField');
      expect(controlValues).to.have.property('metadata');
      expect(controlValues).to.have.property('externalConfig');
      expect((controlValues as any).customField).to.equal('This is now allowed');
      expect((controlValues as any).metadata.migrated).to.be.true;
      expect((controlValues as any).externalConfig.templateEngine).to.equal('handlebars');
    });
  });
});
