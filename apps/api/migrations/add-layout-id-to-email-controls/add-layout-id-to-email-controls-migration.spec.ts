import { MessageTemplateRepository } from '@novu/dal';
import { StepTypeEnum, UiComponentEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { run } from './add-layout-id-to-email-controls-migration';

describe('Add Layout ID to Email Controls Migration #novu-v2', () => {
  let session: UserSession;
  const messageTemplateRepository = new MessageTemplateRepository();
  const workflows = ['test', 'test2'];

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should add layoutId to email templates without it', async () => {
    for (const workflow of workflows) {
      const response = await session.testAgent.post(`/v2/workflows`).send({
        __source: WorkflowCreationSourceEnum.DASHBOARD,
        name: workflow,
        workflowId: workflow,
        steps: [
          {
            name: 'email',
            type: StepTypeEnum.EMAIL,
            controlValues: {
              body: '',
              subject: '',
            },
          },
        ],
      });
      const steps = response.body.data.steps;
      await messageTemplateRepository.update(
        { _id: steps[0]._id, _environmentId: session.environment._id, _organizationId: session.organization._id },
        {
          $unset: {
            'controls.schema.properties.layoutId': '',
            'controls.uiSchema.properties.layoutId': '',
          },
        }
      );
      const messageTemplate = await messageTemplateRepository.findOne({
        _id: steps[0]._id,
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
      });
      expect(messageTemplate?.controls?.schema?.properties?.layoutId).not.to.exist;
      expect(messageTemplate?.controls?.uiSchema?.properties?.layoutId).not.to.exist;
    }

    await run();

    for (const workflow of workflows) {
      const response = await session.testAgent.get(`/v2/workflows/${workflow}`);
      const workflow1 = response.body.data;

      expect(workflow1.steps[0].controls?.dataSchema?.properties?.layoutId).to.exist;
      expect(workflow1.steps[0].controls?.dataSchema?.properties?.layoutId?.type).to.deep.equal(['string', 'null']);
      expect(workflow1.steps[0].controls?.dataSchema?.properties?.body).to.exist;
      expect(workflow1.steps[0].controls?.dataSchema?.properties?.subject).to.exist;
      expect(workflow1.steps[0].controls?.dataSchema?.properties?.editorType).to.exist;

      expect(workflow1.steps[0].controls?.uiSchema?.properties?.layoutId).to.exist;
      expect(workflow1.steps[0].controls?.uiSchema?.properties?.layoutId?.component).to.equal(
        UiComponentEnum.LAYOUT_SELECT
      );
      expect(workflow1.steps[0].controls?.uiSchema?.properties?.body).to.exist;
      expect(workflow1.steps[0].controls?.uiSchema?.properties?.subject).to.exist;
      expect(workflow1.steps[0].controls?.uiSchema?.properties?.editorType).to.exist;
    }
  });

  it('should skip templates that already have layoutId', async () => {
    for (const workflow of workflows) {
      await session.testAgent.post(`/v2/workflows`).send({
        __source: WorkflowCreationSourceEnum.DASHBOARD,
        name: workflow,
        workflowId: workflow,
        steps: [
          {
            name: 'email',
            type: StepTypeEnum.EMAIL,
            controlValues: {
              body: '',
              subject: '',
            },
          },
        ],
      });
    }

    await run();

    for (const workflow of workflows) {
      const response = await session.testAgent.get(`/v2/workflows/${workflow}`);
      const workflow1 = response.body.data;

      expect(workflow1.steps[0].controls?.dataSchema?.properties?.layoutId).to.exist;
      expect(workflow1.steps[0].controls?.dataSchema?.properties?.layoutId?.type).to.deep.equal(['string', 'null']);
      expect(workflow1.steps[0].controls?.dataSchema?.properties?.body).to.exist;
      expect(workflow1.steps[0].controls?.dataSchema?.properties?.subject).to.exist;
      expect(workflow1.steps[0].controls?.dataSchema?.properties?.editorType).to.exist;

      expect(workflow1.steps[0].controls?.uiSchema?.properties?.layoutId).to.exist;
      expect(workflow1.steps[0].controls?.uiSchema?.properties?.layoutId?.component).to.equal(
        UiComponentEnum.LAYOUT_SELECT
      );
      expect(workflow1.steps[0].controls?.uiSchema?.properties?.body).to.exist;
      expect(workflow1.steps[0].controls?.uiSchema?.properties?.subject).to.exist;
      expect(workflow1.steps[0].controls?.uiSchema?.properties?.editorType).to.exist;
    }
  });
});
