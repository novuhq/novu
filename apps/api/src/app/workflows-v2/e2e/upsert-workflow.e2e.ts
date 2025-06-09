import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import {
  CreateWorkflowDto,
  JSONSchemaDto,
  StepTypeEnum,
  UpdateWorkflowDto,
  WorkflowCreationSourceEnum,
  WorkflowResponseDto,
} from '@novu/api/models/components';
import { Novu } from '@novu/api';
import { initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

interface ITestStepConfig {
  type: StepTypeEnum;
  controlValues: Record<string, string>;
}

describe('Upsert Workflow #novu-v2', function () {
  let session: UserSession;
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);
  });

  describe('PUT /v2/workflows/:workflowId', () => {
    describe('single step workflows', () => {
      it('when step is deleted it should also remove the associated variables', async () => {
        const workflow = await createWorkflow({
          name: 'Test Workflow',
          workflowId: `test-workflow-${Date.now()}`,
          source: WorkflowCreationSourceEnum.Editor,
          active: true,
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
                body: 'chat body',
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
        expect((updatedChatPayloadVariables as JSONSchemaDto)?.properties).not.to.have.property('first_variable');
        expect((updatedChatPayloadVariables as JSONSchemaDto)?.properties).to.have.property('second_variable');
      });

      it('when step is deleted it should not remove variable if it is used in another step', async () => {
        const workflow = await createWorkflow({
          name: 'Test Workflow',
          workflowId: `test-workflow-${Date.now()}`,
          source: WorkflowCreationSourceEnum.Editor,
          active: true,
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

      it('when all steps are removed it should remove all associated variables', async () => {
        const workflow = await createWorkflow({
          name: 'Test Workflow',
          workflowId: `test-workflow-${Date.now()}`,
          source: WorkflowCreationSourceEnum.Editor,
          active: true,
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
                body: 'test',
              },
            },
          ],
        });
        const chatStep = workflow.steps[2];
        const chatPayloadVariables = chatStep.variables.properties?.payload;

        expect(chatPayloadVariables).to.exist;
        expect((chatPayloadVariables as JSONSchemaDto)?.properties).to.have.property('first_variable');
        expect((chatPayloadVariables as JSONSchemaDto)?.properties).to.have.property('second_variable');

        // delete all previous steps
        const updatedWorkflow = await updateWorkflow(workflow.slug, {
          ...mapResponseToUpdateDto(workflow),
          steps: [mapResponseToUpdateDto(workflow).steps[2]],
        });

        const updatedChatStep = updatedWorkflow.steps[0];
        const updatedChatPayloadVariables = updatedChatStep.variables.properties?.payload;
        expect(updatedChatPayloadVariables).to.exist;
        expect((updatedChatPayloadVariables as JSONSchemaDto)?.properties).not.to.have.property('first_variable');
        expect((updatedChatPayloadVariables as JSONSchemaDto)?.properties).not.to.have.property('second_variable');
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

      const updatedEmailStep = updatedWorkflow.steps[0];
      expect(updatedEmailStep.controls.values.editorType).to.equal('html');
      expect(updatedEmailStep.controls.values.body).to.contain('<!DOCTYPE');
      expect(updatedEmailStep.controls.values.body).to.contain('<html');
      expect(updatedEmailStep.controls.values.body).to.contain('<body');
      expect(updatedEmailStep.controls.values.body).to.contain('>test</p>');
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

      const updatedEmailStep2 = updatedWorkflow2.steps[0];
      expect(updatedEmailStep2.controls.values.editorType).to.equal('block');
      expect(updatedEmailStep2.controls.values.body).to.equal('');
    });
  });

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
