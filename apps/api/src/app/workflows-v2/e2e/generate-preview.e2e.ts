import { expect } from 'chai';
import { beforeEach } from 'mocha';
import { randomUUID } from 'node:crypto';
import {
  slugify,
  createWorkflowClient,
  CreateWorkflowDto,
  WorkflowCreationSourceEnum,
  WorkflowResponseDto,
  StepTypeEnum,
  RedirectTargetEnum,
  WorkflowOriginEnum,
  ChannelTypeEnum,
  EmailRenderOutput,
  GeneratePreviewRequestDto,
  GeneratePreviewResponseDto,
  HttpError,
  NovuRestResult,
  UpdateWorkflowDto,
  CronExpressionEnum,
} from '@novu/shared';
import { UserSession } from '@novu/testing';
import { EnvironmentRepository, NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { EmailControlType } from '@novu/application-generic';
import { fullCodeSnippet, previewPayloadExample } from '../maily-test-data';
import { buildWorkflow } from '../workflow.controller.e2e';

const TEST_WORKFLOW_NAME = 'Test Workflow Name';
const SUBJECT_TEST_PAYLOAD = '{{payload.subject.test.payload}}';
const PLACEHOLDER_SUBJECT_INAPP = '{{payload.subject}}';
const PLACEHOLDER_SUBJECT_INAPP_PAYLOAD_VALUE = 'this is the replacement text for the placeholder';

describe('Workflow Step Preview - POST /:workflowId/step/:stepId/preview #novu-v2', () => {
  let session: UserSession;
  let workflowsClient: ReturnType<typeof createWorkflowClient>;
  const notificationTemplateRepository = new NotificationTemplateRepository();
  const environmentRepository = new EnvironmentRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    workflowsClient = createWorkflowClient(session.serverUrl, {
      Authorization: session.token,
      'Novu-Environment-Id': session.environment._id,
    });
  });

  it('should generate preview for in-app init page - no variables example in dto body, stored empty payload schema', async () => {
    const workflow = await createWorkflow({
      payloadSchema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {},
      },
    });

    const stepId = workflow.steps[0]._id;
    const controlValues = {
      subject: 'Welcome {{subscriber.firstName}}',
      body: 'Hello {{subscriber.firstName}} {{subscriber.lastName}}, Welcome to {{payload.organizationName | upcase}}!',
    };
    const previewPayload = {
      // empty previewPayload
    };
    const { status, body } = await session.testAgent.post(`/v2/workflows/${workflow._id}/step/${stepId}/preview`).send({
      controlValues,
      previewPayload,
    });

    expect(status).to.equal(201);
    expect(body).to.deep.equal({
      data: {
        result: {
          preview: {
            subject: 'Welcome firstName',
            // cspell:disable-next-line
            body: 'Hello firstName lastName, Welcome to ORGANIZATIONNAME!',
          },
          type: 'in_app',
        },
        previewPayloadExample: {
          subscriber: {
            firstName: 'firstName',
            lastName: 'lastName',
          },
          payload: {
            organizationName: 'organizationName',
          },
        },
      },
    });
  });

  it('should generate preview for in-app init page - no variables example in dto body', async () => {
    const workflow = await createWorkflow();

    const stepId = workflow.steps[0]._id;
    const controlValues = {
      subject: `{{subscriber.firstName}} Hello, World! `,
      body: `Hello, World! {{payload.placeholder.body}} {{payload.placeholder.random}}`,
      avatar: 'https://www.example.com/avatar.png',
      primaryAction: {
        label: '{{payload.primaryUrlLabel}}',
        redirect: {
          target: RedirectTargetEnum.BLANK,
          url: '/home/primary-action',
        },
      },
      secondaryAction: {
        label: 'Secondary Action',
        redirect: {
          target: RedirectTargetEnum.BLANK,
          url: '/home/secondary-action',
        },
      },
      data: {
        key: 'value',
      },
      redirect: {
        target: RedirectTargetEnum.BLANK,
        url: 'https://www.example.com/redirect',
      },
    };
    const previewPayload = {
      // empty previewPayload
    };
    const { status, body } = await session.testAgent.post(`/v2/workflows/${workflow._id}/step/${stepId}/preview`).send({
      controlValues,
      previewPayload,
    });

    expect(status).to.equal(201);
    expect(body.data).to.deep.equal({
      result: {
        preview: {
          subject: 'firstName Hello, World! ',
          body: 'Hello, World! body random',
          avatar: 'https://www.example.com/avatar.png',
          primaryAction: {
            label: 'primaryUrlLabel',
            redirect: {
              url: '/home/primary-action',
              target: '_blank',
            },
          },
          secondaryAction: {
            label: 'Secondary Action',
            redirect: {
              url: '/home/secondary-action',
              target: '_blank',
            },
          },
          redirect: {
            url: 'https://www.example.com/redirect',
            target: '_blank',
          },
          data: {
            key: 'value',
          },
        },
        type: 'in_app',
      },
      previewPayloadExample: {
        subscriber: {
          firstName: 'firstName',
        },
        payload: {
          placeholder: {
            body: 'body',
            random: 'random',
          },
          primaryUrlLabel: 'primaryUrlLabel',
        },
      },
    });
  });

  it('should generate preview for in-app step', async () => {
    const workflow = await createWorkflow();

    const stepId = workflow.steps[0]._id;
    const controlValues = {
      subject: `{{subscriber.firstName}} Hello, World! `,
      body: `Hello, World! {{payload.placeholder.body}}`,
      avatar: 'https://www.example.com/avatar.png',
      primaryAction: {
        label: '{{payload.primaryUrlLabel}}',
        redirect: {
          target: RedirectTargetEnum.BLANK,
          url: '/home/primary-action',
        },
      },
      secondaryAction: {
        label: 'Secondary Action',
        redirect: {
          target: RedirectTargetEnum.BLANK,
          url: '/home/secondary-action',
        },
      },
      data: {
        key: 'value',
      },
      redirect: {
        target: RedirectTargetEnum.BLANK,
        url: 'https://www.example.com/redirect',
      },
    };
    const previewPayload = {
      subscriber: {
        firstName: 'John',
      },
      payload: {
        placeholder: {
          body: 'This is a body',
        },
        primaryUrlLabel: 'https://example.com',
      },
    };
    const { status, body } = await session.testAgent.post(`/v2/workflows/${workflow._id}/step/${stepId}/preview`).send({
      controlValues,
      previewPayload,
    });

    expect(status).to.equal(201);
    expect(body.data).to.deep.equal({
      result: {
        preview: {
          subject: 'John Hello, World! ',
          body: 'Hello, World! This is a body',
          avatar: 'https://www.example.com/avatar.png',
          primaryAction: {
            label: 'https://example.com',
            redirect: {
              url: '/home/primary-action',
              target: '_blank',
            },
          },
          secondaryAction: {
            label: 'Secondary Action',
            redirect: {
              url: '/home/secondary-action',
              target: '_blank',
            },
          },
          redirect: {
            url: 'https://www.example.com/redirect',
            target: '_blank',
          },
          data: {
            key: 'value',
          },
        },
        type: 'in_app',
      },
      previewPayloadExample: {
        subscriber: {
          firstName: 'John',
        },
        payload: {
          placeholder: {
            body: 'This is a body',
          },
          primaryUrlLabel: 'https://example.com',
        },
      },
    });
  });

  it('should generate preview for in-app step, based on stored payload schema', async () => {
    const payloadSchema = {
      type: 'object',
      properties: {
        placeholder: {
          type: 'object',
          properties: {
            body: {
              type: 'string',
              default: 'Default body text',
            },
            random: {
              type: 'string',
            },
          },
        },
        primaryUrlLabel: {
          type: 'string',
          default: 'Click here',
        },
        organizationName: {
          type: 'string',
          default: 'Pokemon Organization',
        },
      },
    };
    const workflow = await createWorkflow({ payloadSchema });
    await emulateExternalOrigin(workflow._id);

    const stepId = workflow.steps[0]._id;
    const controlValues = {
      subject: `{{subscriber.firstName}} Hello, World! `,
      body: `Hello, World! {{payload.placeholder.body}} {{payload.placeholder.random}}`,
      avatar: 'https://www.example.com/avatar.png',
      primaryAction: {
        label: '{{payload.primaryUrlLabel}}',
        redirect: {
          target: RedirectTargetEnum.BLANK,
          url: '/home/primary-action',
        },
      },
      secondaryAction: {
        label: 'Secondary Action',
        redirect: {
          target: RedirectTargetEnum.BLANK,
          url: '/home/secondary-action',
        },
      },
      data: {
        key: 'value',
      },
      redirect: {
        target: RedirectTargetEnum.BLANK,
        url: 'https://www.example.com/redirect',
      },
    };
    const clientVariablesExample = {
      subscriber: {
        firstName: 'First Name',
      },
      payload: {
        primaryUrlLabel: 'New Click Here',
        placeholder: {
          random: 'random',
        },
      },
    };
    const { status, body } = await session.testAgent.post(`/v2/workflows/${workflow._id}/step/${stepId}/preview`).send({
      controlValues,
      previewPayload: clientVariablesExample,
    });

    expect(status).to.equal(201);
    expect(body.data).to.deep.equal({
      result: {
        preview: {
          subject: 'First Name Hello, World! ',
          body: 'Hello, World! Default body text random',
          avatar: 'https://www.example.com/avatar.png',
          primaryAction: {
            label: 'New Click Here',
            redirect: {
              url: '/home/primary-action',
              target: '_blank',
            },
          },
          secondaryAction: {
            label: 'Secondary Action',
            redirect: {
              url: '/home/secondary-action',
              target: '_blank',
            },
          },
          redirect: {
            url: 'https://www.example.com/redirect',
            target: '_blank',
          },
          data: {
            key: 'value',
          },
        },
        type: 'in_app',
      },
      previewPayloadExample: {
        subscriber: {
          firstName: 'First Name',
        },
        payload: {
          placeholder: {
            body: 'Default body text',
            random: 'random',
          },
          primaryUrlLabel: 'New Click Here',
          organizationName: 'Pokemon Organization',
        },
      },
    });
  });

  it('should gracefully handle undefined variables that are not present in payload schema', async () => {
    const pay = {
      type: 'object',
      properties: {
        /*
         * orderId: {
         *   type: 'string',
         * },
         */
        lastName: {
          type: 'string',
        },
        organizationName: {
          type: 'string',
        },
      },
    };
    const workflow = await createWorkflow({ payloadSchema: pay });
    await emulateExternalOrigin(workflow._id);

    const stepId = workflow.steps[0]._id;
    const controlValues = {
      subject: 'Welcome {{payload.firstName}}',
      body: 'Hello {{payload.firstName}}, your order #{{payload.orderId}} is ready!',
    };
    const response = await session.testAgent.post(`/v2/workflows/${workflow._id}/step/${stepId}/preview`).send({
      controlValues,
      previewPayload: {
        payload: {
          firstName: 'John',
          // orderId is missing
        },
      },
    });

    expect(response.status).to.equal(201);
    expect(response.body.data).to.deep.equal({
      result: {
        preview: {
          subject: 'Welcome John',
          // missing orderId will be replaced with placeholder "{{payload.orderId}}"
          body: 'Hello John, your order #orderId is ready!',
        },
        type: 'in_app',
      },
      previewPayloadExample: {
        payload: {
          lastName: '{{payload.lastName}}',
          organizationName: '{{payload.organizationName}}',
          firstName: 'John',
          orderId: 'orderId',
        },
      },
    });

    const response2 = await session.testAgent.post(`/v2/workflows/${workflow._id}/step/${stepId}/preview`).send({
      controlValues,
      previewPayload: {
        payload: {
          firstName: 'John',
          orderId: '123456', // orderId is will override the variable example that driven by workflow payload schema
        },
      },
    });

    expect(response2.status).to.equal(201);
    expect(response2.body.data).to.deep.equal({
      result: {
        preview: {
          subject: 'Welcome John',
          body: 'Hello John, your order #123456 is ready!', // orderId is not defined in the payload schema
        },
        type: 'in_app',
      },
      previewPayloadExample: {
        payload: {
          lastName: '{{payload.lastName}}',
          organizationName: '{{payload.organizationName}}',
          orderId: '123456',
          firstName: 'John',
        },
      },
    });
  });

  it('should return 201 for non-existent workflow', async () => {
    const pay = {
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
        },
        lastName: {
          type: 'string',
        },
        organizationName: {
          type: 'string',
        },
      },
    };
    const workflow = await createWorkflow({ payloadSchema: pay });

    const nonExistentWorkflowId = 'non-existent-id';
    const stepId = workflow.steps[0]._id;

    const response = await session.testAgent
      .post(`/v2/workflows/${nonExistentWorkflowId}/step/${stepId}/preview`)
      .send({
        controlValues: {},
      });

    expect(response.status).to.equal(201);
    expect(response.body.data).to.deep.equal({
      result: {
        preview: {},
      },
      previewPayloadExample: {},
    });
  });

  it('should return 201 for non-existent step', async () => {
    const pay = {
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
        },
        lastName: {
          type: 'string',
        },
        organizationName: {
          type: 'string',
        },
      },
    };
    const workflow = await createWorkflow({ payloadSchema: pay });
    const nonExistentStepId = 'non-existent-step-id';

    const response = await session.testAgent
      .post(`/v2/workflows/${workflow._id}/step/${nonExistentStepId}/preview`)
      .send({
        controlValues: {},
      });

    expect(response.status).to.equal(201);
    expect(response.body.data).to.deep.equal({
      result: {
        preview: {},
      },
      previewPayloadExample: {},
    });
  });

  it('should generate preview for the email step with digest eventCount and events variables and filters used', async () => {
    process.env.IS_ENHANCED_DIGEST_ENABLED = 'true';
    const createWorkflowDto: CreateWorkflowDto = {
      __source: WorkflowCreationSourceEnum.EDITOR,
      name: TEST_WORKFLOW_NAME,
      workflowId: `${slugify(TEST_WORKFLOW_NAME)}`,
      description: 'This is a test workflow',
      active: true,
      steps: [
        {
          name: 'Digest Step',
          type: StepTypeEnum.DIGEST,
        },
        {
          name: 'Email Step',
          type: StepTypeEnum.EMAIL,
        },
      ],
    };

    const res = await workflowsClient.createWorkflow(createWorkflowDto);
    const workflow = res.value;
    if (!workflow) {
      throw new Error('Workflow not created');
    }

    const stepId = workflow.steps[1]._id;
    const controlValues = {
      body: '{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"variable","attrs":{"id":"steps.digest-step.eventCount | pluralize: \'event\', \'\'","label":null,"fallback":null,"required":false}},{"type":"text","text":" "}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"variable","attrs":{"id":"steps.digest-step.events | toSentence: \'payload.name\', 2, \'other\'","label":null,"fallback":null,"required":false}},{"type":"text","text":" "}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null}}]}',
      subject: 'digest step variables',
    };
    const previewPayload = {
      steps: {
        'digest-step': {
          events: [
            {
              payload: {
                name: 'John',
              },
            },
            {
              payload: {
                name: 'Jane',
              },
            },
            {
              payload: {
                name: 'Joe',
              },
            },
          ],
        },
      },
    };
    const { status, body } = await session.testAgent.post(`/v2/workflows/${workflow._id}/step/${stepId}/preview`).send({
      controlValues,
      previewPayload,
    });
    const { data } = body;

    expect(status).to.equal(201);
    expect(data.result.preview.subject).to.equal('digest step variables');
    expect(data.result.preview.body).to.contain('3 events');
    expect(data.result.preview.body).to.contain('John, Jane, and 1 other');
    expect(data.previewPayloadExample).to.deep.equal(previewPayload);
    process.env.IS_ENHANCED_DIGEST_ENABLED = 'false';
  });

  describe('Hydration testing', () => {
    it.skip(` should hydrate previous step in iterator email --> digest`, async () => {
      const { workflowId, emailStepDatabaseId, digestStepId } = await createWorkflowWithEmailLookingAtDigestResult();
      const requestDto = {
        controlValues: getTestControlValues(digestStepId)[StepTypeEnum.EMAIL],
        previewPayload: { payload: { subject: PLACEHOLDER_SUBJECT_INAPP_PAYLOAD_VALUE } },
      };
      const previewResponseDto = await generatePreview(
        workflowsClient,
        workflowId,
        emailStepDatabaseId,
        requestDto,
        'testing steps'
      );
      expect(previewResponseDto.result!.preview).to.exist;
      expect(previewResponseDto.previewPayloadExample).to.exist;
      expect(previewResponseDto.previewPayloadExample?.steps?.[digestStepId]).to.be.ok;
      if (previewResponseDto.result!.type !== ChannelTypeEnum.EMAIL) {
        throw new Error('Expected email');
      }
      const preview = previewResponseDto.result!.preview.body;
      expect(previewResponseDto.result!.preview.body).to.contain('{{item.payload.country}}');
    });

    it(` should hydrate previous step in iterator sms looking at inApp`, async () => {
      const { workflowId, smsDatabaseStepId, inAppStepId } = await createWorkflowWithSmsLookingAtInAppResult();
      const requestDto = buildDtoNoPayload(StepTypeEnum.SMS, inAppStepId);
      const previewResponseDto = await generatePreview(
        workflowsClient,
        workflowId,
        smsDatabaseStepId,
        requestDto,
        'testing steps'
      );
      expect(previewResponseDto.result!.preview).to.exist;
      expect(previewResponseDto.previewPayloadExample).to.exist;
      expect(previewResponseDto.previewPayloadExample?.steps).to.be.ok;
      if (previewResponseDto.result?.type === 'sms' && previewResponseDto.result?.preview.body) {
        expect(previewResponseDto.result!.preview.body).to.contain(`[[seen]]`);
      }
    });
  });

  it(`IN_APP :should match the body in the preview response`, async () => {
    const { stepDatabaseId, workflowId, stepId } = await createWorkflowAndReturnId(
      workflowsClient,
      StepTypeEnum.IN_APP
    );
    const controlValues = buildInAppControlValues();
    const requestDto = {
      controlValues,
      previewPayload: { payload: { subject: PLACEHOLDER_SUBJECT_INAPP_PAYLOAD_VALUE } },
    };
    const previewResponseDto = await generatePreview(
      workflowsClient,
      workflowId,
      stepDatabaseId,
      requestDto,
      StepTypeEnum.IN_APP
    );
    expect(previewResponseDto.result!.preview).to.exist;
    controlValues.subject = controlValues.subject!.replace(
      PLACEHOLDER_SUBJECT_INAPP,
      PLACEHOLDER_SUBJECT_INAPP_PAYLOAD_VALUE
    );
    if (previewResponseDto.result?.type !== 'in_app') {
      throw new Error('should have a in-app preview ');
    }
    expect(previewResponseDto.result.preview.subject).to.deep.equal(
      'firstName Hello, World! this is the replacement text for the placeholder'
    );
  });

  describe('Happy Path, no payload, expected same response as requested', () => {
    // TODO: this test is not working as expected
    it('in_app: should match the body in the preview response', async () => {
      const previewResponseDto = await createWorkflowAndPreview(StepTypeEnum.IN_APP, 'InApp');

      expect(previewResponseDto.result).to.exist;
      if (!previewResponseDto.result) {
        throw new Error('missing preview');
      }
      if (previewResponseDto.result!.type !== 'in_app') {
        throw new Error('should be in app preview type');
      }
      const inApp = getTestControlValues().in_app;
      const previewRequestWithoutTheRedirect = {
        ...inApp,
        subject: 'firstName Hello, World! subject',
        body: 'Hello, World! body',
        primaryAction: { label: 'primaryUrlLabel' },
      };
      expect(previewResponseDto.result!.preview).to.deep.equal(previewRequestWithoutTheRedirect);
    });

    it('sms: should match the body in the preview response', async () => {
      const previewResponseDto = await createWorkflowAndPreview(StepTypeEnum.SMS, 'SMS');

      expect(previewResponseDto.result!.preview).to.exist;
      expect(previewResponseDto.previewPayloadExample).to.exist;
      expect(previewResponseDto.previewPayloadExample.subscriber, 'Expecting to find subscriber in the payload').to
        .exist;

      expect(previewResponseDto.result!.preview).to.deep.equal({ body: ' Hello, World! firstName' });
    });

    it('push: should match the body in the preview response', async () => {
      const previewResponseDto = await createWorkflowAndPreview(StepTypeEnum.PUSH, 'Push');

      expect(previewResponseDto.result!.preview).to.exist;
      expect(previewResponseDto.previewPayloadExample).to.exist;
      expect(previewResponseDto.previewPayloadExample.subscriber, 'Expecting to find subscriber in the payload').to
        .exist;

      expect(previewResponseDto.result!.preview).to.deep.equal({
        subject: 'Hello, World!',
        body: 'Hello, World! firstName',
      });
    });

    it('chat: should match the body in the preview response', async () => {
      const previewResponseDto = await createWorkflowAndPreview(StepTypeEnum.CHAT, 'Chat');

      expect(previewResponseDto.result!.preview).to.exist;
      expect(previewResponseDto.previewPayloadExample).to.exist;
      expect(previewResponseDto.previewPayloadExample.subscriber, 'Expecting to find subscriber in the payload').to
        .exist;

      expect(previewResponseDto.result!.preview).to.deep.equal({ body: 'Hello, World! firstName' });
    });

    it('email: should match the body in the preview response', async () => {
      const previewResponseDto = await createWorkflowAndPreview(StepTypeEnum.EMAIL, 'Email');
      const preview = previewResponseDto.result.preview as EmailRenderOutput;

      expect(previewResponseDto.result.type).to.equal(StepTypeEnum.EMAIL);

      expect(preview).to.exist;
      expect(preview.body).to.exist;
      expect(preview.subject).to.exist;
      expect(preview.body).to.contain(previewPayloadExample().payload.body);
      expect(preview.subject).to.contain(`Hello, World! payload`);
      expect(previewResponseDto.previewPayloadExample).to.exist;
      expect(previewResponseDto.previewPayloadExample).to.deep.equal(previewPayloadExample());
    });

    async function createWorkflowAndPreview(type: StepTypeEnum, description: string) {
      const { stepDatabaseId, workflowId } = await createWorkflowAndReturnId(workflowsClient, type);
      const requestDto = buildDtoNoPayload(type);

      return await generatePreview(workflowsClient, workflowId, stepDatabaseId, requestDto, description);
    }
  });

  describe('payload sanitation', () => {
    it('Should produce a correct payload when pipe is used etc {{payload.variable | upper}}', async () => {
      const { stepDatabaseId, workflowId } = await createWorkflowAndReturnId(workflowsClient, StepTypeEnum.SMS);
      const requestDto = {
        controlValues: {
          body: 'This is a legal placeholder with a pipe [{{payload.variableName | upcase}}the pipe should show in the preview]',
        },
      };
      const previewResponseDto = await generatePreview(
        workflowsClient,
        workflowId,
        stepDatabaseId,
        requestDto,
        'email'
      );
      expect(previewResponseDto.result!.preview).to.exist;
      if (previewResponseDto.result!.type !== 'sms') {
        throw new Error('Expected sms');
      }
      expect(previewResponseDto.result!.preview.body).to.contain('VARIABLENAME');
      expect(previewResponseDto.previewPayloadExample).to.exist;
      expect(previewResponseDto?.previewPayloadExample?.payload?.variableName).to.equal('variableName');
    });

    it('Should not fail if inApp is providing partial URL in redirect', async () => {
      const steps = [{ name: 'IN_APP_STEP_SHOULD_NOT_FAIL', type: StepTypeEnum.IN_APP }];
      const createDto = buildWorkflow({ steps });
      const novuRestResult = await workflowsClient.createWorkflow(createDto);
      if (!novuRestResult.isSuccessResult()) {
        throw new Error('should create workflow');
      }
      const controlValues = {
        subject: `{{subscriber.firstName}} Hello, World! ${PLACEHOLDER_SUBJECT_INAPP}`,
        body: `Hello, World! {{payload.placeholder.body}}`,
        avatar: 'https://www.example.com/avatar.png',
        primaryAction: {
          label: '{{payload.secondaryUrl}}',
          redirect: {
            target: RedirectTargetEnum.BLANK,
          },
        },
        secondaryAction: null,
        redirect: {
          target: RedirectTargetEnum.BLANK,
          url: '   ',
        },
      };
      const workflowSlug = novuRestResult.value?.slug;
      const stepSlug = novuRestResult.value?.steps[0].slug;
      const stepDataDto = await updateWorkflow(workflowSlug, {
        ...novuRestResult.value,
        steps: [
          {
            ...novuRestResult.value.steps[0],
            controlValues,
          },
        ],
      });
      const generatePreviewResponseDto = await generatePreview(
        workflowsClient,
        workflowSlug,
        stepSlug,
        { controlValues },
        ''
      );
      if (generatePreviewResponseDto.result?.type === ChannelTypeEnum.IN_APP) {
        expect(generatePreviewResponseDto.result.preview.body).to.equal(
          {
            subject: `{{subscriber.firstName}} Hello, World! ${PLACEHOLDER_SUBJECT_INAPP}`,
            body: `Hello, World! body`,
            avatar: 'https://www.example.com/avatar.png',
            primaryAction: {
              label: '{{payload.secondaryUrl}}',
              redirect: {
                target: RedirectTargetEnum.BLANK,
              },
            },
            secondaryAction: null,
            redirect: {
              target: RedirectTargetEnum.BLANK,
              url: '   ',
            },
          }.body
        );
      }
    });

    it('Should not fail if inApp url ref is a placeholder without payload', async () => {
      const steps = [{ name: 'IN_APP_STEP_SHOULD_NOT_FAIL', type: StepTypeEnum.IN_APP }];
      const createDto = buildWorkflow({ steps });
      const novuRestResult = await workflowsClient.createWorkflow(createDto);
      if (!novuRestResult.isSuccessResult()) {
        throw new Error('should create workflow');
      }
      const workflowSlug = novuRestResult.value?.slug;
      const stepSlug = novuRestResult.value?.steps[0].slug;
      const stepDataDto = await updateWorkflow(workflowSlug, {
        ...novuRestResult.value,
        steps: [
          {
            ...novuRestResult.value.steps[0],
            ...buildInAppControlValueWithAPlaceholderInTheUrl(),
          },
        ],
      });
      const generatePreviewResponseDto = await generatePreview(
        workflowsClient,
        workflowSlug,
        stepSlug,
        { controlValues: buildInAppControlValueWithAPlaceholderInTheUrl() },
        ''
      );

      if (generatePreviewResponseDto.result?.type === ChannelTypeEnum.IN_APP) {
        expect(generatePreviewResponseDto.result.preview.body).to.equal('Hello, World! body');
      }
    });
  });

  describe('Missing Required ControlValues', () => {
    const channelTypes = [{ type: StepTypeEnum.IN_APP, description: 'InApp' }];

    channelTypes.forEach(({ type, description }) => {
      // TODO: We need to get back to the drawing board on this one to make the preview action of the framework more forgiving
      it(`[${type}] will generate gracefully the preview if the control values are missing`, async () => {
        const { stepDatabaseId, workflowId, stepId } = await createWorkflowAndReturnId(workflowsClient, type);
        const requestDto = buildDtoWithMissingControlValues(type, stepId);

        const previewResponseDto = await generatePreview(
          workflowsClient,
          workflowId,
          stepDatabaseId,
          requestDto,
          description
        );

        expect(previewResponseDto.result).to.not.eql({ preview: {} });
      });
    });
  });

  async function updateWorkflow(id: string, workflow: UpdateWorkflowDto): Promise<WorkflowResponseDto> {
    const res = await workflowsClient.updateWorkflow(id, workflow);
    if (!res.isSuccessResult()) {
      throw new Error(res.error!.responseText);
    }

    return res.value;
  }

  async function createWorkflowWithEmailLookingAtDigestResult() {
    const createWorkflowDto: CreateWorkflowDto = {
      tags: [],
      __source: WorkflowCreationSourceEnum.EDITOR,
      name: 'John',
      workflowId: `john:${randomUUID()}`,
      description: 'This is a test workflow',
      active: true,
      steps: [
        {
          name: 'DigestStep',
          type: StepTypeEnum.DIGEST,
        },
        {
          name: 'Email Test Step',
          type: StepTypeEnum.EMAIL,
        },
      ],
    };
    const workflowResult = await workflowsClient.createWorkflow(createWorkflowDto);
    if (!workflowResult.isSuccessResult()) {
      throw new Error(`Failed to create workflow ${JSON.stringify(workflowResult.error)}`);
    }

    return {
      workflowId: workflowResult.value._id,
      emailStepDatabaseId: workflowResult.value.steps[1]._id,
      digestStepId: workflowResult.value.steps[0].stepId,
    };
  }
  async function createWorkflowWithSmsLookingAtInAppResult() {
    const createWorkflowDto: CreateWorkflowDto = {
      tags: [],
      __source: WorkflowCreationSourceEnum.EDITOR,
      name: 'John',
      workflowId: `john:${randomUUID()}`,
      description: 'This is a test workflow',
      active: true,
      steps: [
        {
          name: 'InAppStep',
          type: StepTypeEnum.IN_APP,
        },
        {
          name: 'SmsStep',
          type: StepTypeEnum.SMS,
        },
      ],
    };
    const workflowResult = await workflowsClient.createWorkflow(createWorkflowDto);
    if (!workflowResult.isSuccessResult()) {
      throw new Error(`Failed to create workflow ${JSON.stringify(workflowResult.error)}`);
    }

    return {
      workflowId: workflowResult.value._id,
      smsDatabaseStepId: workflowResult.value.steps[1]._id,
      inAppStepId: workflowResult.value.steps[0].stepId,
    };
  }

  async function createWorkflow(overrides: Partial<NotificationTemplateEntity> = {}): Promise<WorkflowResponseDto> {
    const createWorkflowDto: CreateWorkflowDto = {
      __source: WorkflowCreationSourceEnum.EDITOR,
      name: TEST_WORKFLOW_NAME,
      workflowId: `${slugify(TEST_WORKFLOW_NAME)}`,
      description: 'This is a test workflow',
      active: true,
      steps: [
        {
          name: 'In-App Test Step',
          type: StepTypeEnum.IN_APP,
        },
        {
          name: 'Email Test Step',
          type: StepTypeEnum.EMAIL,
        },
      ],
    };

    const res = await workflowsClient.createWorkflow(createWorkflowDto);
    if (!res.isSuccessResult()) {
      throw new Error(res.error!.responseText);
    }

    await notificationTemplateRepository.updateOne(
      {
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        _id: res.value._id,
      },
      {
        ...overrides,
      }
    );

    if (!res.value) {
      throw new Error('Workflow not found');
    }

    return res.value;
  }

  /**
   * Emulate external origin bridge with the local bridge
   */
  async function emulateExternalOrigin(_workflowId: string) {
    await notificationTemplateRepository.updateOne(
      {
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        _id: _workflowId,
      },
      {
        origin: WorkflowOriginEnum.EXTERNAL,
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
});

function buildDtoNoPayload(stepTypeEnum: StepTypeEnum, stepId?: string): GeneratePreviewRequestDto {
  return {
    controlValues: getTestControlValues(stepId)[stepTypeEnum],
  };
}

function buildEmailControlValuesPayload(): EmailControlType {
  return {
    subject: `Hello, World! ${SUBJECT_TEST_PAYLOAD}`,
    body: JSON.stringify(fullCodeSnippet()),
  };
}

function buildInAppControlValues() {
  return {
    subject: `{{subscriber.firstName}} Hello, World! ${PLACEHOLDER_SUBJECT_INAPP}`,
    body: `Hello, World! {{payload.placeholder.body}}`,
    avatar: 'https://www.example.com/avatar.png',
    primaryAction: {
      label: '{{payload.primaryUrlLabel}}',
      redirect: {
        target: RedirectTargetEnum.BLANK,
      },
    },
    secondaryAction: {
      label: 'Secondary Action',
      redirect: {
        target: RedirectTargetEnum.BLANK,
        url: '/home/secondary-action',
      },
    },
    data: {
      key: 'value',
    },
    redirect: {
      target: RedirectTargetEnum.BLANK,
      url: 'https://www.example.com/redirect',
    },
  };
}

function buildInAppControlValueWithAPlaceholderInTheUrl() {
  return {
    subject: `{{subscriber.firstName}} Hello, World! ${PLACEHOLDER_SUBJECT_INAPP}`,
    body: `Hello, World! {{payload.placeholder.body}}`,
    avatar: 'https://www.example.com/avatar.png',
    primaryAction: {
      label: '{{payload.secondaryUrlLabel}}',
      redirect: {
        url: '{{payload.secondaryUrl}}',
        target: RedirectTargetEnum.BLANK,
      },
    },
    secondaryAction: {
      label: 'Secondary Action',
      redirect: {
        target: RedirectTargetEnum.BLANK,
        url: '',
      },
    },
    redirect: {
      target: RedirectTargetEnum.BLANK,
      url: '   ',
    },
  };
}
function buildSmsControlValuesPayload(stepId: string | undefined) {
  return {
    body: `${stepId ? ` [[{{steps.${stepId}.seen}}]]` : ''} Hello, World! {{subscriber.firstName}}`,
  };
}

function buildPushControlValuesPayload() {
  return {
    subject: 'Hello, World!',
    body: 'Hello, World! {{subscriber.firstName}}',
  };
}

function buildChatControlValuesPayload() {
  return {
    body: 'Hello, World! {{subscriber.firstName}}',
  };
}
function buildDigestControlValuesPayload() {
  return {
    cron: CronExpressionEnum.EVERY_DAY_AT_8AM,
  };
}

export const getTestControlValues = (stepId?: string) => ({
  [StepTypeEnum.SMS]: buildSmsControlValuesPayload(stepId),
  [StepTypeEnum.EMAIL]: buildEmailControlValuesPayload(),
  [StepTypeEnum.PUSH]: buildPushControlValuesPayload(),
  [StepTypeEnum.CHAT]: buildChatControlValuesPayload(),
  [StepTypeEnum.IN_APP]: buildInAppControlValues(),
  [StepTypeEnum.DIGEST]: buildDigestControlValuesPayload(),
});

async function assertHttpError(
  description: string,
  novuRestResult: NovuRestResult<GeneratePreviewResponseDto, HttpError>,
  dto: GeneratePreviewRequestDto
) {
  if (novuRestResult.error) {
    return new Error(
      `${description}: Failed to generate preview: ${novuRestResult.error.message}payload: ${JSON.stringify(dto, null, 2)} `
    );
  }

  return new Error(`${description}: Failed to generate preview, bug in response error mapping `);
}

export async function createWorkflowAndReturnId(
  workflowsClient: ReturnType<typeof createWorkflowClient>,
  type: StepTypeEnum
) {
  const createWorkflowDto = buildWorkflow();
  createWorkflowDto.steps[0].type = type;
  const workflowResult = await workflowsClient.createWorkflow(createWorkflowDto);
  if (!workflowResult.isSuccessResult()) {
    throw new Error(`Failed to create workflow ${JSON.stringify(workflowResult.error)}`);
  }

  return {
    workflowId: workflowResult.value._id,
    stepDatabaseId: workflowResult.value.steps[0]._id,
    stepId: workflowResult.value.steps[0].stepId,
  };
}

export async function generatePreview(
  workflowsClient: ReturnType<typeof createWorkflowClient>,
  workflowId: string,
  stepDatabaseId: string,
  dto: GeneratePreviewRequestDto,
  description: string
): Promise<GeneratePreviewResponseDto> {
  const novuRestResult = await workflowsClient.generatePreview(workflowId, stepDatabaseId, dto);
  if (novuRestResult.isSuccessResult()) {
    return novuRestResult.value;
  }

  throw await assertHttpError(description, novuRestResult, dto);
}

function buildDtoWithMissingControlValues(stepTypeEnum: StepTypeEnum, stepId: string): GeneratePreviewRequestDto {
  const stepTypeToElement = getTestControlValues(stepId)[stepTypeEnum];
  if (stepTypeEnum === StepTypeEnum.EMAIL) {
    delete stepTypeToElement.subject;
  } else {
    delete stepTypeToElement.body;
  }

  return {
    controlValues: stepTypeToElement,
    previewPayload: { payload: { subject: PLACEHOLDER_SUBJECT_INAPP_PAYLOAD_VALUE } },
  };
}
