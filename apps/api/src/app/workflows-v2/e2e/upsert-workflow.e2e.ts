import { randomUUID } from 'node:crypto';
import { Novu } from '@novu/api';
import {
  CreateLayoutDto,
  CreateWorkflowDto,
  EmailStepResponseDto,
  InAppControlDto,
  LayoutCreationSourceEnum,
  LayoutResponseDto,
  UpdateWorkflowDto,
  WorkflowCreationSourceEnum,
  WorkflowResponseDto,
} from '@novu/api/models/components';
import { ControlValuesRepository } from '@novu/dal';
import { ContentIssueEnum, ControlValuesLevelEnum, StepTypeEnum, ToolProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { JSONSchemaDto } from '../../shared/dtos/json-schema.dto';
import { initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

interface ITestStepConfig {
  type: StepTypeEnum;
  controlValues: Record<string, string>;
}

describe('Upsert Workflow #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;
  const controlValuesRepository = new ControlValuesRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);
  });

  async function createToolWorkflow(options: {
    name: string;
    workflowId: string;
    includeEmail?: boolean;
  }): Promise<WorkflowResponseDto> {
    const steps: Array<Record<string, unknown>> = [
      {
        name: 'Tool Step',
        type: StepTypeEnum.TOOL,
        controlValues: {
          body: 'default alert',
        },
        providerOverrides: {
          [ToolProviderIdEnum.PagerDuty]: { severity: 'info' },
        },
      },
    ];

    if (options.includeEmail) {
      steps.push({
        name: 'Email Step',
        type: StepTypeEnum.EMAIL,
        controlValues: {
          subject: 'hello',
          body: 'world',
        },
      });
    }

    const createResponse = await session.testAgent.post('/v2/workflows').send({
      __source: WorkflowCreationSourceEnum.Editor,
      name: options.name,
      workflowId: options.workflowId,
      active: true,
      steps,
    });

    expect(createResponse.status).to.equal(201);

    return createResponse.body.data;
  }

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
          'must be a valid slug format (letters, numbers, hyphens, dot and underscores only)'
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

    it('should create a workflow and preserve stepId', async () => {
      const workflow = await createWorkflow({
        name: 'Test Workflow',
        workflowId: 'test-workflow-123',
        steps: [
          {
            name: 'Test Step',
            stepId: 'test-step-123',
            type: StepTypeEnum.IN_APP,
            controlValues: {
              body: 'Test Body',
            },
          },
        ],
      });

      expect(workflow.name).to.equal('Test Workflow');
      expect(workflow.workflowId).to.equal('test-workflow-123');
      expect(workflow.steps.length).to.equal(1);
      expect(workflow.steps[0].id).to.exist;
      expect(workflow.steps[0].type).to.equal(StepTypeEnum.IN_APP);
      expect(workflow.steps[0].stepId).to.equal('test-step-123');
      expect(workflow.steps[0].controls).to.exist;
      expect(workflow.steps[0].controls.values).to.exist;
      expect((workflow.steps[0].controls.values as InAppControlDto).body).to.equal('Test Body');
    });
  });

  describe('tool step providerOverrides', () => {
    it('should persist providerOverrides as a step sibling and keep them out of controlValues', async () => {
      // Raw HTTP — @novu/api SDK may lag behind tool / providerOverrides DTO changes.
      const createResponse = await session.testAgent.post('/v2/workflows').send({
        __source: WorkflowCreationSourceEnum.Editor,
        name: 'Tool Provider Overrides Workflow',
        workflowId: `tool-provider-overrides-${randomUUID()}`,
        active: true,
        steps: [
          {
            name: 'Tool Step',
            type: StepTypeEnum.TOOL,
            controlValues: {
              body: 'default alert',
            },
            providerOverrides: {
              [ToolProviderIdEnum.PagerDuty]: {
                severity: 'warning',
                summary: 'db down',
              },
              [ToolProviderIdEnum.Opsgenie]: {
                priority: 'P2',
              },
            },
          },
        ],
      });

      expect(createResponse.status).to.equal(201);

      const workflow = createResponse.body.data;
      const step = workflow.steps[0];

      expect(step.controls.values.providerOverrides).to.equal(undefined);
      expect(step.controls.values.body).to.equal('default alert');
      expect(step.providerOverrides).to.deep.equal({
        [ToolProviderIdEnum.PagerDuty]: {
          severity: 'warning',
          summary: 'db down',
        },
        [ToolProviderIdEnum.Opsgenie]: {
          priority: 'P2',
        },
      });

      const getResponse = await session.testAgent.get(`/v2/workflows/${workflow._id}`);
      expect(getResponse.status).to.equal(200);
      expect(getResponse.body.data.steps[0].providerOverrides).to.deep.equal(step.providerOverrides);
      expect(getResponse.body.data.steps[0].controls.values.providerOverrides).to.equal(undefined);
    });

    it('should surface unsupported override keys as namespaced step issues', async () => {
      const createResponse = await session.testAgent.post('/v2/workflows').send({
        __source: WorkflowCreationSourceEnum.Editor,
        name: 'Tool Provider Override Issues Workflow',
        workflowId: `tool-provider-override-issues-${randomUUID()}`,
        active: true,
        steps: [
          {
            name: 'Tool Step',
            type: StepTypeEnum.TOOL,
            controlValues: {
              body: 'default alert',
            },
            providerOverrides: {
              [ToolProviderIdEnum.Opsgenie]: {
                message: 'ok',
                notARealKey: true,
              },
            },
          },
        ],
      });

      expect(createResponse.status).to.equal(201);

      const issuePath = `providerOverrides.${ToolProviderIdEnum.Opsgenie}.notARealKey`;
      const issues = createResponse.body.data.steps[0].issues?.controls?.[issuePath];
      expect(issues).to.exist;
      expect(issues[0].issueType).to.equal(ContentIssueEnum.UNSUPPORTED_PROPERTY);
    });

    it('should delete all provider override docs when providerOverrides is null', async () => {
      const createResponse = await session.testAgent.post('/v2/workflows').send({
        __source: WorkflowCreationSourceEnum.Editor,
        name: 'Tool Provider Override Delete Workflow',
        workflowId: `tool-provider-override-delete-${randomUUID()}`,
        active: true,
        steps: [
          {
            name: 'Tool Step',
            type: StepTypeEnum.TOOL,
            controlValues: {
              body: 'default alert',
            },
            providerOverrides: {
              [ToolProviderIdEnum.PagerDuty]: { severity: 'info' },
            },
          },
        ],
      });

      expect(createResponse.status).to.equal(201);
      const workflow = createResponse.body.data;
      const step = workflow.steps[0];
      expect(step.providerOverrides?.[ToolProviderIdEnum.PagerDuty]).to.deep.equal({ severity: 'info' });

      const updateResponse = await session.testAgent.put(`/v2/workflows/${workflow._id}`).send({
        ...workflow,
        steps: [
          {
            _id: step._id,
            stepId: step.stepId,
            name: step.name,
            type: step.type,
            controlValues: step.controls.values,
            providerOverrides: null,
          },
        ],
      });

      expect(updateResponse.status).to.equal(200);
      expect(updateResponse.body.data.steps[0].providerOverrides).to.not.exist;
    });

    it('should delete a tool step from the workflow', async () => {
      const workflow = await createToolWorkflow({
        name: 'Tool Step Delete Workflow',
        workflowId: `tool-step-delete-${randomUUID()}`,
        includeEmail: true,
      });
      expect(workflow.steps).to.have.length(2);

      const emailStep = workflow.steps.find((s) => s.type === StepTypeEnum.EMAIL);
      expect(emailStep).to.exist;

      const updateResponse = await session.testAgent.put(`/v2/workflows/${workflow._id}`).send({
        ...workflow,
        steps: [
          {
            _id: emailStep!._id,
            stepId: emailStep!.stepId,
            name: emailStep!.name,
            type: emailStep!.type,
            controlValues: emailStep!.controls.values,
          },
        ],
      });

      expect(updateResponse.status).to.equal(200);
      expect(updateResponse.body.data.steps).to.have.length(1);
      expect(updateResponse.body.data.steps[0].type).to.equal(StepTypeEnum.EMAIL);
      expect(updateResponse.body.data.steps[0].controls.values.subject).to.equal('hello');
      expect(updateResponse.body.data.steps[0].controls.values.body).to.equal('world');
    });

    it('should delete a tool step when it is the only step', async () => {
      const workflow = await createToolWorkflow({
        name: 'Solo Tool Step Delete Workflow',
        workflowId: `solo-tool-step-delete-${randomUUID()}`,
      });
      const toolStep = workflow.steps[0];
      expect(toolStep).to.exist;

      const overrideDocsBefore = await controlValuesRepository.find({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        _workflowId: workflow._id,
        _stepId: toolStep._id,
        level: ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS,
      });
      expect(overrideDocsBefore.length).to.be.greaterThan(0);

      const updateResponse = await session.testAgent.put(`/v2/workflows/${workflow._id}`).send({
        ...workflow,
        steps: [],
      });

      expect(updateResponse.status).to.equal(200);
      expect(updateResponse.body.data.steps).to.have.length(0);

      const overrideDocsAfter = await controlValuesRepository.find({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        _workflowId: workflow._id,
        _stepId: toolStep._id,
        level: ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS,
      });
      expect(overrideDocsAfter).to.have.length(0);
    });

    it('should keep provider overrides when omitted from the remaining tool step', async () => {
      const workflow = await createToolWorkflow({
        name: 'Keep Tool Step Workflow',
        workflowId: `keep-tool-step-${randomUUID()}`,
        includeEmail: true,
      });
      const toolStep = workflow.steps.find((s) => s.type === StepTypeEnum.TOOL);
      expect(toolStep).to.exist;

      // Dashboard delete omits providerOverrides on remaining steps (leave unchanged).
      const updateResponse = await session.testAgent.put(`/v2/workflows/${workflow._id}`).send({
        ...workflow,
        steps: [
          {
            _id: toolStep!._id,
            stepId: toolStep!.stepId,
            name: toolStep!.name,
            type: toolStep!.type,
            controlValues: toolStep!.controls.values,
          },
        ],
      });

      expect(updateResponse.status).to.equal(200);
      expect(updateResponse.body.data.steps).to.have.length(1);
      expect(updateResponse.body.data.steps[0].type).to.equal(StepTypeEnum.TOOL);
      expect(updateResponse.body.data.steps[0].providerOverrides?.[ToolProviderIdEnum.PagerDuty]).to.deep.equal({
        severity: 'info',
      });
    });

    it('should round-trip a tool step on PUT', async () => {
      const workflow = await createToolWorkflow({
        name: 'Round Trip Tool Workflow',
        workflowId: `round-trip-tool-${randomUUID()}`,
      });

      const updateResponse = await session.testAgent.put(`/v2/workflows/${workflow._id}`).send({
        ...workflow,
      });

      expect(updateResponse.status).to.equal(200);
      expect(updateResponse.body.data.steps[0].type).to.equal(StepTypeEnum.TOOL);
      expect(updateResponse.body.data.steps[0].providerOverrides?.[ToolProviderIdEnum.PagerDuty]).to.deep.equal({
        severity: 'info',
      });
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
              type: StepTypeEnum.IN_APP,
              controlValues: {
                body: '{{payload.first_variable}}',
              },
            },
            {
              name: `IN_APP 2`,
              type: StepTypeEnum.IN_APP,
              controlValues: {
                body: '{{payload.second_variable}}',
              },
            },
            {
              name: `CHAT 1`,
              type: StepTypeEnum.CHAT,
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
              type: StepTypeEnum.EMAIL,
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
        } as UpdateWorkflowDto);

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
              type: StepTypeEnum.EMAIL,
              controlValues: {
                subject: 'Test Subject',
                body: 'Test Body',
                layoutId: null,
              },
            },
          ],
        });

        const emailStep = workflow.steps[0] as EmailStepResponseDto;
        expect(emailStep.type).to.equal(StepTypeEnum.EMAIL);

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
              type: StepTypeEnum.EMAIL,
              controlValues: {
                subject: 'Test Subject',
                body: 'Test Body',
              },
            },
          ],
        });

        const emailStep = workflow.steps[0] as EmailStepResponseDto;
        expect(emailStep.type).to.equal(StepTypeEnum.EMAIL);
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
              type: StepTypeEnum.EMAIL,
              controlValues: {
                subject: 'Test Subject',
                body: 'Test Body',
              },
            },
          ],
        });

        const emailStep = workflow.steps[0] as EmailStepResponseDto;
        expect(emailStep.type).to.equal(StepTypeEnum.EMAIL);
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
                type: StepTypeEnum.EMAIL,
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
                type: StepTypeEnum.EMAIL,
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
                type: StepTypeEnum.EMAIL,
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
              type: StepTypeEnum.EMAIL,
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
              type: StepTypeEnum.EMAIL,
              controlValues: {
                subject: 'Test Subject',
                body: 'Test Body',
                layoutId: layout.layoutId,
              },
            },
          ],
        });

        const emailStep = updatedWorkflow.steps[0] as EmailStepResponseDto;
        expect(emailStep.type).to.equal(StepTypeEnum.EMAIL);
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
              type: StepTypeEnum.EMAIL,
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
              type: StepTypeEnum.EMAIL,
              controlValues: {
                subject: 'Test Subject',
                body: 'Test Body',
                layoutId: undefined,
              },
            },
          ],
        });

        const emailStep = updatedWorkflow.steps[0] as EmailStepResponseDto;
        expect(emailStep.type).to.equal(StepTypeEnum.EMAIL);
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
            type: StepTypeEnum.EMAIL,
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
      } as UpdateWorkflowDto);

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
      } as UpdateWorkflowDto);

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
    } as UpdateWorkflowDto;
  }
});
