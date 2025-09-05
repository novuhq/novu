import { Novu } from '@novu/api';
import {
  CreateLayoutDto,
  CreateWorkflowDto,
  EmailStepResponseDto,
  JSONSchemaDto,
  LayoutCreationSourceEnum,
  LayoutResponseDto,
  StepTypeEnum,
  UpdateWorkflowDto,
  WorkflowCreationSourceEnum,
  WorkflowResponseDto,
} from '@novu/api/models/components';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

interface ITestStepConfig {
  type: StepTypeEnum;
  controlValues: Record<string, string>;
}

describe('Upsert Workflow #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);
  });

  describe('POST /v2/workflows/:workflowId', () => {
    it('should throw error when workflowId is not a valid slug', async () => {
      try {
        await createWorkflow({
          name: 'Test Workflow',
          workflowId: '_test-workflow-123_',
          steps: [],
        });

        // Should not reach this point
        expect.fail('Expected BadRequestException to be thrown');
      } catch (error) {
        expect(error.statusCode).to.equal(422);
        expect(error.message).to.contain('Validation Error');
        expect(error.errors).to.exist;
        expect(error.errors.general.messages[0]).to.contain(
          'must be a valid slug format (lowercase letters, numbers, and hyphens only)'
        );
      }
    });

    it('should create a workflow with a preserved workflowId', async () => {
      const workflow = await createWorkflow({
        name: 'Test Workflow',
        workflowId: 'test-workflow-123',
        steps: [],
      });

      expect(workflow.name).to.equal('Test Workflow');
      expect(workflow.workflowId).to.equal('test-workflow-123');
    });
  });

  describe('PUT /v2/workflows/:workflowId', () => {
    describe('single step workflows', () => {
      it('when step is deleted it should not remove variable if it is used in another step', async () => {
        const workflow = await createWorkflow({
          name: 'Test Workflow',
          workflowId: `test-workflow-${Date.now()}`,
          source: WorkflowCreationSourceEnum.Editor,
          active: true,
          payloadSchema: {
            type: 'object',
            properties: {
              first_variable: { type: 'string' },
              second_variable: { type: 'string' },
            },
            required: [],
            additionalProperties: false,
          },
          steps: [
            {
              name: `IN_APP 1`,
              type: StepTypeEnum.InApp,
              controlValues: {
                body: '{{payload.first_variable}}',
              },
            },
            {
              name: `IN_APP 2`,
              type: StepTypeEnum.InApp,
              controlValues: {
                body: '{{payload.second_variable}}',
              },
            },
            {
              name: `CHAT 1`,
              type: StepTypeEnum.Chat,
              controlValues: {
                body: '{{payload.first_variable}}',
              },
            },
          ],
        });
        const chatStep = workflow.steps[2];
        const chatPayloadVariables = chatStep.variables.properties?.payload;

        expect(chatPayloadVariables).to.exist;
        expect((chatPayloadVariables as JSONSchemaDto)?.properties).to.have.property('first_variable');
        expect((chatPayloadVariables as JSONSchemaDto)?.properties).to.have.property('second_variable');

        // delete the first step
        const updatedWorkflow = await updateWorkflow(workflow.slug, {
          ...mapResponseToUpdateDto(workflow),
          steps: mapResponseToUpdateDto(workflow).steps.slice(1),
        });

        const updatedChatStep = updatedWorkflow.steps[0];
        const updatedChatPayloadVariables = updatedChatStep.variables.properties?.payload;
        expect(updatedChatPayloadVariables).to.exist;
        expect((updatedChatPayloadVariables as JSONSchemaDto)?.properties).to.have.property('first_variable');
        expect((updatedChatPayloadVariables as JSONSchemaDto)?.properties).to.have.property('second_variable');
      });
    });

    describe('email step layoutId functionality', () => {
      it('should skip layout rendering when converting Maily JSON to HTML with assigned layoutId', async () => {
        // First create a layout with distinctive HTML content
        const layout = await createLayout({
          name: 'Test Layout for skipLayoutRendering',
          layoutId: 'test-layout-skip-rendering',
          source: LayoutCreationSourceEnum.Dashboard,
        });

        const mailyJsonContent = JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'This is email content that should not include layout HTML.',
                },
              ],
            },
          ],
        });

        // Create workflow with email step that has layoutId assigned
        const workflow = await createWorkflow({
          name: 'Test Workflow with Layout',
          workflowId: `test-workflow-layout-${Date.now()}`,
          source: WorkflowCreationSourceEnum.Editor,
          active: true,
          steps: [
            {
              name: `Email Step with Layout`,
              type: StepTypeEnum.Email,
              controlValues: {
                subject: 'Test Email with Layout',
                body: mailyJsonContent,
                editorType: 'block',
                layoutId: layout.layoutId,
              },
            },
          ],
        });

        // Switch to HTML editor - this should trigger skipLayoutRendering
        const updatedWorkflow = await updateWorkflow(workflow.slug, {
          ...workflow,
          steps: [
            {
              ...workflow.steps[0],
              controlValues: {
                ...workflow.steps[0].controls.values,
                editorType: 'html',
              },
            },
          ],
        });

        const updatedEmailStep = updatedWorkflow.steps[0] as EmailStepResponseDto;

        expect(updatedEmailStep.controls.values.editorType).to.equal('html');
        expect(updatedEmailStep.controls.values.layoutId).to.equal(layout.layoutId);

        // The body should contain the converted HTML from Maily JSON
        expect(updatedEmailStep.controls.values.body).to.not.contain('<!DOCTYPE');
        expect(updatedEmailStep.controls.values.body).to.not.contain('<html');
        expect(updatedEmailStep.controls.values.body).to.contain(
          'This is email content that should not include layout HTML'
        );
      });

      it('should not use layoutId when null is provided', async () => {
        await createLayout({
          name: 'Test Layout',
          layoutId: 'test-layout',
          source: LayoutCreationSourceEnum.Dashboard,
        });

        const workflow = await createWorkflow({
          name: 'Test Email Workflow',
          workflowId: `test-email-workflow-${Date.now()}`,
          source: WorkflowCreationSourceEnum.Editor,
          active: true,
          steps: [
            {
              name: `Email Step`,
              type: StepTypeEnum.Email,
              controlValues: {
                subject: 'Test Subject',
                body: 'Test Body',
                layoutId: null,
              },
            },
          ],
        });

        const emailStep = workflow.steps[0] as EmailStepResponseDto;
        expect(emailStep.type).to.equal(StepTypeEnum.Email);

        expect(emailStep.controls.values.layoutId).to.equal(null);
      });

      it('should keep layoutId as undefined when not specified and there is no default layout', async () => {
        const workflow = await createWorkflow({
          name: 'Test Email Workflow',
          workflowId: `test-email-workflow-${Date.now()}`,
          source: WorkflowCreationSourceEnum.Editor,
          active: true,
          steps: [
            {
              name: `Email Step`,
              type: StepTypeEnum.Email,
              controlValues: {
                subject: 'Test Subject',
                body: 'Test Body',
              },
            },
          ],
        });

        const emailStep = workflow.steps[0] as EmailStepResponseDto;
        expect(emailStep.type).to.equal(StepTypeEnum.Email);
        expect(emailStep.controls.values.layoutId).to.be.undefined;
      });

      it('should keep layoutId as undefined when not specified and there is a default layout', async () => {
        await createLayout({
          name: 'Test Layout',
          layoutId: 'test-layout-id',
          source: LayoutCreationSourceEnum.Dashboard,
        });

        const workflow = await createWorkflow({
          name: 'Test Email Workflow',
          workflowId: `test-email-workflow-${Date.now()}`,
          source: WorkflowCreationSourceEnum.Editor,
          active: true,
          steps: [
            {
              name: `Email Step`,
              type: StepTypeEnum.Email,
              controlValues: {
                subject: 'Test Subject',
                body: 'Test Body',
              },
            },
          ],
        });

        const emailStep = workflow.steps[0] as EmailStepResponseDto;
        expect(emailStep.type).to.equal(StepTypeEnum.Email);
        expect(emailStep.controls.values.layoutId).to.be.undefined;
      });

      it('should throw error when creating email step with invalid layoutId', async () => {
        try {
          await createWorkflow({
            name: 'Test Email Workflow Invalid',
            workflowId: `test-email-workflow-invalid-${Date.now()}`,
            source: WorkflowCreationSourceEnum.Editor,
            active: true,
            steps: [
              {
                name: `Email Step`,
                type: StepTypeEnum.Email,
                controlValues: {
                  subject: 'Test Subject',
                  body: 'Test Body',
                  layoutId: 'non-existent-layout-id-12345',
                },
              },
            ],
          });

          // Should not reach this point
          expect.fail('Expected BadRequestException to be thrown');
        } catch (error) {
          expect(error.message).to.contain('Layout not found');
        }
      });

      it('should throw error when updating email step with invalid layoutId', async () => {
        try {
          const workflow = await createWorkflow({
            name: 'Test Email Workflow Update Invalid',
            workflowId: `test-email-workflow-update-invalid-${Date.now()}`,
            source: WorkflowCreationSourceEnum.Editor,
            active: true,
            steps: [
              {
                name: `Email Step`,
                type: StepTypeEnum.Email,
                controlValues: {
                  subject: 'Test Subject',
                  body: 'Test Body',
                },
              },
            ],
          });

          await updateWorkflow(workflow.slug, {
            ...mapResponseToUpdateDto(workflow),
            steps: [
              {
                ...mapResponseToUpdateDto(workflow).steps[0],
                type: StepTypeEnum.Email,
                controlValues: {
                  subject: 'Test Subject',
                  body: 'Test Body',
                  layoutId: 'invalid-layout-id-67890',
                },
              },
            ],
          });

          // Should not reach this point
          expect.fail('Expected BadRequestException to be thrown');
        } catch (error) {
          expect(error.message).to.contain('Layout not found for id');
        }
      });

      it('should allow updating layoutId to specific value', async () => {
        const layout = await createLayout({
          name: 'Custom Layout',
          layoutId: 'custom-layout',
          source: LayoutCreationSourceEnum.Dashboard,
        });

        const workflow = await createWorkflow({
          name: 'Test Email Workflow',
          workflowId: `test-email-workflow-${Date.now()}`,
          source: WorkflowCreationSourceEnum.Editor,
          active: true,
          steps: [
            {
              name: `Email Step`,
              type: StepTypeEnum.Email,
              controlValues: {
                subject: 'Test Subject',
                body: 'Test Body',
              },
            },
          ],
        });

        // Update the workflow with a specific layoutId
        const updatedWorkflow = await updateWorkflow(workflow.slug, {
          ...mapResponseToUpdateDto(workflow),
          steps: [
            {
              ...mapResponseToUpdateDto(workflow).steps[0],
              type: StepTypeEnum.Email,
              controlValues: {
                subject: 'Test Subject',
                body: 'Test Body',
                layoutId: layout.layoutId,
              },
            },
          ],
        });

        const emailStep = updatedWorkflow.steps[0] as EmailStepResponseDto;
        expect(emailStep.type).to.equal(StepTypeEnum.Email);
        expect(emailStep.controls.values.layoutId).to.equal(layout.layoutId);
      });

      it('should allow updating layoutId to undefined to remove layout', async () => {
        const layout = await createLayout({
          name: 'Custom Layout',
          layoutId: 'custom-layout',
          source: LayoutCreationSourceEnum.Dashboard,
        });

        const workflow = await createWorkflow({
          name: 'Test Email Workflow',
          workflowId: `test-email-workflow-${Date.now()}`,
          source: WorkflowCreationSourceEnum.Editor,
          active: true,
          steps: [
            {
              name: `Email Step`,
              type: StepTypeEnum.Email,
              controlValues: {
                subject: 'Test Subject',
                body: 'Test Body',
                layoutId: layout.layoutId,
              },
            },
          ],
        });

        // Update the workflow to remove layout
        const updatedWorkflow = await updateWorkflow(workflow.slug, {
          ...mapResponseToUpdateDto(workflow),
          steps: [
            {
              ...mapResponseToUpdateDto(workflow).steps[0],
              type: StepTypeEnum.Email,
              controlValues: {
                subject: 'Test Subject',
                body: 'Test Body',
                layoutId: undefined,
              },
            },
          ],
        });

        const emailStep = updatedWorkflow.steps[0] as EmailStepResponseDto;
        expect(emailStep.type).to.equal(StepTypeEnum.Email);
        expect(emailStep.controls.values.layoutId).to.be.undefined;
      });
    });

    it('when switching the editor type it should convert the body value', async () => {
      const workflow = await createWorkflow({
        name: 'Test Workflow',
        workflowId: `test-workflow-${Date.now()}`,
        source: WorkflowCreationSourceEnum.Editor,
        active: true,
        steps: [
          {
            name: `Email`,
            type: StepTypeEnum.Email,
            controlValues: {
              disableOutputSanitization: false,
              editorType: 'block',
              body: '{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"test"}]}]}',
              subject: 'subject',
            },
          },
        ],
      });

      const updatedWorkflow = await updateWorkflow(workflow.slug, {
        ...workflow,
        steps: [
          {
            ...workflow.steps[0],
            controlValues: {
              ...workflow.steps[0].controls.values,
              editorType: 'html',
            },
          },
        ],
      });

      const updatedEmailStep = updatedWorkflow.steps[0] as EmailStepResponseDto;

      expect(updatedEmailStep.controls.values.editorType).to.equal('html');
      expect(updatedEmailStep.controls.values.body).to.contain('<html');
      expect(updatedEmailStep.controls.values.body).to.contain('<body');
      expect(updatedEmailStep.controls.values.body).to.contain(`>
              test
            </p>`);
      expect(updatedEmailStep.controls.values.body).to.contain('</body>');
      expect(updatedEmailStep.controls.values.body).to.contain('</html>');

      const updatedWorkflow2 = await updateWorkflow(workflow.slug, {
        ...workflow,
        steps: [
          {
            ...workflow.steps[0],
            controlValues: {
              ...updatedEmailStep.controls.values,
              editorType: 'block',
            },
          },
        ],
      });

      const updatedEmailStep2 = updatedWorkflow2.steps[0] as EmailStepResponseDto;
      expect(updatedEmailStep2.controls.values.editorType).to.equal('block');
      expect(updatedEmailStep2.controls.values.body).to.equal('');
    });
  });

  async function createLayout(layout: CreateLayoutDto): Promise<LayoutResponseDto> {
    const { result: createLayoutBody } = await novuClient.layouts.create(layout);

    return createLayoutBody;
  }

  async function createWorkflow(workflow: CreateWorkflowDto): Promise<WorkflowResponseDto> {
    const { result: createWorkflowBody } = await novuClient.workflows.create(workflow);

    return createWorkflowBody;
  }

  async function updateWorkflow(workflowSlug: string, workflow: UpdateWorkflowDto): Promise<WorkflowResponseDto> {
    const { result: updateWorkflowBody } = await novuClient.workflows.update(workflow, workflowSlug);

    return updateWorkflowBody;
  }

  function mapResponseToUpdateDto(workflowResponse: WorkflowResponseDto): UpdateWorkflowDto {
    return {
      ...workflowResponse,
      steps: workflowResponse.steps.map((step) => ({
        id: step.id,
        type: step.type,
        name: step.name,
        controlValues: step.controls?.values || {},
      })),
    };
  }
});
