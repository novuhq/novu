import { Novu } from '@novu/api';
import { StepTypeEnum, UiComponentEnum, UiSchemaGroupEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { run } from './email-step-ui-schema-html-editor-migration';

describe('Update email step ui schema migration test #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;
  const workflows = ['test', 'test2'];

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

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
  });

  it('should update email step ui schema to html editor', async () => {
    // run the migration
    await run();

    for (const workflow of workflows) {
      const response = await session.testAgent.get(`/v2/workflows/${workflow}`);
      const workflow1 = response.body.data;

      expect(workflow1.steps[0].controls?.uiSchema?.group).to.equal(UiSchemaGroupEnum.EMAIL);
      expect(workflow1.steps[0].controls?.uiSchema?.properties?.body?.component).to.equal(UiComponentEnum.EMAIL_BODY);
      expect(workflow1.steps[0].controls?.uiSchema?.properties?.subject?.component).to.equal(
        UiComponentEnum.TEXT_INLINE_LABEL
      );
      expect(workflow1.steps[0].controls?.uiSchema?.properties?.skip?.component).to.equal(UiComponentEnum.QUERY_EDITOR);
      expect(workflow1.steps[0].controls?.uiSchema?.properties?.editorType?.component).to.equal(
        UiComponentEnum.EMAIL_EDITOR_SELECT
      );
      expect(workflow1.steps[0].controls?.uiSchema?.properties?.editorType?.placeholder).to.equal('block');
      expect(workflow1.steps[0].controls?.uiSchema?.properties?.disableOutputSanitization?.component).to.equal(
        UiComponentEnum.DISABLE_SANITIZATION_SWITCH
      );
      expect(workflow1.steps[0].controls?.uiSchema?.properties?.disableOutputSanitization?.placeholder).to.equal(false);
    }
  });
});
