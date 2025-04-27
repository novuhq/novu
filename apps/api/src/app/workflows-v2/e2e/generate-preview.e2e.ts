import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { EnvironmentRepository, NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { Novu } from '@novu/api';
import { beforeEach } from 'mocha';
import { randomUUID } from 'node:crypto';
import {
  ChannelTypeEnum,
  CreateWorkflowDto,
  EmailRenderOutput,
  GeneratePreviewRequestDto,
  GeneratePreviewResponseDto,
  PreviewPayloadDto,
  RedirectTargetEnum,
  StepTypeEnum,
  UpdateWorkflowDto,
  WorkflowCreationSourceEnum,
  WorkflowOriginEnum,
  WorkflowResponseDto,
} from '@novu/api/models/components';
import { CronExpressionEnum, slugify } from '@novu/shared';
import { EmailControlType } from '@novu/application-generic';
import { initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';
import { buildWorkflow } from '../workflow.controller.e2e';
import { fullCodeSnippet, previewPayloadExample } from '../maily-test-data';

const TEST_WORKFLOW_NAME = 'Test Workflow Name';
const SUBJECT_TEST_PAYLOAD = '{{payload.subject.test.payload}}';
const PLACEHOLDER_SUBJECT_INAPP = '{{payload.subject}}';
const PLACEHOLDER_SUBJECT_INAPP_PAYLOAD_VALUE = 'this is the replacement text for the placeholder';

describe('Workflow Step Preview - POST /:workflowId/step/:stepId/preview #novu-v2', () => {
  let session: UserSession;
  const notificationTemplateRepository = new NotificationTemplateRepository();
  const environmentRepository = new EnvironmentRepository();
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);
  });

  it('should generate preview for in-app init page - no variables example in dto body, stored empty payload schema', async () => {
    const workflow = await createWorkflow({
      payloadSchema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {},
      },
    });

    const stepId = workflow.steps[0].id;
    const controlValues = {
      subject: 'Welcome {{subscriber.firstName}}',
      body: 'Hello {{subscriber.firstName}} {{subscriber.lastName}}, Welcome to {{payload.organizationName | upcase}}!',
    };
    const previewPayload = {
      // empty previewPayload
    };
    const { result } = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: {
        controlValues,
        previewPayload,
      },
      stepId,
      workflowId: workflow.id,
    });

    expect(result).to.deep.equal({
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
    });
  });

  it('should generate preview for in-app init page - no variables example in dto body', async () => {
    const workflow = await createWorkflow();

    const stepId = workflow.steps[0].id;
    const controlValues = {
      subject: `{{subscriber.firstName}} Hello, World! `,
      body: `Hello, World! {{payload.placeholder.body}} {{payload.placeholder.random}}`,
      avatar: 'https://www.example.com/avatar.png',
      primaryAction: {
        label: '{{payload.primaryUrlLabel}}',
        redirect: {
          target: RedirectTargetEnum.Blank,
          url: '/home/primary-action',
        },
      },
      secondaryAction: {
        label: 'Secondary Action',
        redirect: {
          target: RedirectTargetEnum.Blank,
          url: '/home/secondary-action',
        },
      },
      data: {
        key: 'value',
      },
      redirect: {
        target: RedirectTargetEnum.Blank,
        url: 'https://www.example.com/redirect',
      },
    };
    const previewPayload = {
      // empty previewPayload
    };
    const { result } = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: {
        controlValues,
        previewPayload,
      },
      stepId,
      workflowId: workflow.id,
    });

    expect(result).to.deep.equal({
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

    const stepId = workflow.steps[0].id;
    const controlValues = {
      subject: `{{subscriber.firstName}} Hello, World! `,
      body: `Hello, World! {{payload.placeholder.body}}`,
      avatar: 'https://www.example.com/avatar.png',
      primaryAction: {
        label: '{{payload.primaryUrlLabel}}',
        redirect: {
          target: RedirectTargetEnum.Blank,
          url: '/home/primary-action',
        },
      },
      secondaryAction: {
        label: 'Secondary Action',
        redirect: {
          target: RedirectTargetEnum.Blank,
          url: '/home/secondary-action',
        },
      },
      data: {
        key: 'value',
      },
      redirect: {
        target: RedirectTargetEnum.Blank,
        url: 'https://www.example.com/redirect',
      },
    };
    const previewPayload: PreviewPayloadDto = {
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

    const { result } = await novuClient.workflows.steps.generatePreview({
      workflowId: workflow.id,
      stepId,
      generatePreviewRequestDto: { controlValues, previewPayload },
    });

    expect(result).to.deep.equal({
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
    await emulateExternalOrigin(workflow.id);

    const stepId = workflow.steps[0].id;
    const controlValues = {
      subject: `{{subscriber.firstName}} Hello, World! `,
      body: `Hello, World! {{payload.placeholder.body}} {{payload.placeholder.random}}`,
      avatar: 'https://www.example.com/avatar.png',
      primaryAction: {
        label: '{{payload.primaryUrlLabel}}',
        redirect: {
          target: RedirectTargetEnum.Blank,
          url: '/home/primary-action',
        },
      },
      secondaryAction: {
        label: 'Secondary Action',
        redirect: {
          target: RedirectTargetEnum.Blank,
          url: '/home/secondary-action',
        },
      },
      data: {
        key: 'value',
      },
      redirect: {
        target: RedirectTargetEnum.Blank,
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
    const { result } = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: {
        controlValues,
        previewPayload: clientVariablesExample,
      },
      stepId,
      workflowId: workflow.id,
    });

    expect(result).to.deep.equal({
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
    await emulateExternalOrigin(workflow.id);

    const stepId = workflow.steps[0].id;
    const controlValues = {
      subject: 'Welcome {{payload.firstName}}',
      body: 'Hello {{payload.firstName}}, your order #{{payload.orderId}} is ready!',
    };
    const { result } = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: {
        controlValues,
        previewPayload: {
          payload: {
            firstName: 'John',
            // orderId is missing
          },
        },
      },
      stepId,
      workflowId: workflow.id,
    });

    expect(result).to.deep.equal({
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

    const { result: result2 } = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: {
        controlValues,
        previewPayload: {
          payload: {
            firstName: 'John',
            orderId: '123456', // orderId is will override the variable example that driven by workflow payload schema
          },
        },
      },
      stepId,
      workflowId: workflow.id,
    });

    expect(result2).to.deep.equal({
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
    const stepId = workflow.steps[0].id;
    const { result } = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: {
        controlValues: {},
      },
      stepId,
      workflowId: nonExistentWorkflowId,
    });

    expect(result).to.deep.equal({
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
    const { result } = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: {
        controlValues: {},
      },
      stepId: nonExistentStepId,
      workflowId: workflow.id,
    });

    expect(result).to.deep.equal({
      result: {
        preview: {},
      },
      previewPayloadExample: {},
    });
  });

  it('should generate preview for the email step with digest variables', async () => {
    // @ts-ignore
    process.env.IS_ENHANCED_DIGEST_ENABLED = 'true';
    const createWorkflowDto: CreateWorkflowDto = {
      source: WorkflowCreationSourceEnum.Editor,
      name: TEST_WORKFLOW_NAME,
      workflowId: `${slugify(TEST_WORKFLOW_NAME)}`,
      description: 'This is a test workflow',
      active: true,
      steps: [
        {
          name: 'Digest Step',
          type: StepTypeEnum.Digest,
        },
        {
          name: 'Email Step',
          type: StepTypeEnum.Email,
        },
      ],
    };

    const res = await novuClient.workflows.create(createWorkflowDto);
    const workflow = res.result;
    if (!workflow) {
      throw new Error('Workflow not created');
    }

    const stepId = workflow.steps[1].id;
    const resultWithEventsPayload = {
      steps: {
        'digest-step': {
          events: [
            {
              payload: {},
            },
            {
              payload: {},
            },
            {
              payload: {},
            },
          ],
        },
      },
    };
    const resultWithEventsPayloadFoo = {
      steps: {
        'digest-step': {
          events: [
            {
              payload: {
                foo: 'foo',
              },
            },
            {
              payload: {
                foo: 'foo',
              },
            },
            {
              payload: {
                foo: 'foo',
              },
            },
          ],
        },
      },
    };

    // testing the steps.digest-step.events.length variable
    const controlValues1 = {
      body: '{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"events length "},{"type":"variable","attrs":{"id":"steps.digest-step.events.length","label":null,"fallback":null,"required":false,"aliasFor":null}},{"type":"text","text":" "}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":" "}]}]}',
      subject: 'events length',
    };
    const previewResponse1 = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: { controlValues: controlValues1, previewPayload: {} },
      stepId,
      workflowId: workflow.id,
    });
    expect(previewResponse1.result.result.preview.body).to.contain('events length 3');
    expect(previewResponse1.result.previewPayloadExample).to.deep.equal(resultWithEventsPayload);

    // testing the steps.digest-step.eventCount variable
    const controlValues2 = {
      body: '{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"eventCount "},{"type":"variable","attrs":{"id":"steps.digest-step.eventCount","label":null,"fallback":null,"required":false,"aliasFor":null}},{"type":"text","text":" "}]}]}',
      subject: 'eventCount',
    };
    const previewResponse2 = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: { controlValues: controlValues2, previewPayload: {} },
      stepId,
      workflowId: workflow.id,
    });
    expect(previewResponse2.result.result.preview.body).to.contain('eventCount 3');
    expect(previewResponse2.result.previewPayloadExample).to.deep.equal(resultWithEventsPayload);

    // testing the steps.digest-step.events array and direct access to the first item
    const controlValues3 = {
      body: '{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"variable","attrs":{"id":"steps.digest-step.events","label":null,"fallback":null,"required":false,"aliasFor":null}},{"type":"text","text":" "}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"single variable: {{steps.digest-step.events[0].payload.foo}}"}]}]}',
      subject: 'events',
    };
    const previewResponse3 = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: { controlValues: controlValues3, previewPayload: {} },
      stepId,
      workflowId: workflow.id,
    });
    expect(previewResponse3.result.result.preview.body).to.contain(
      "[{'payload':{'foo':'foo'}},{'payload':{'foo':'foo'}},{'payload':{'foo':'foo'}}]"
    );
    expect(previewResponse3.result.result.preview.body).to.contain('single variable: foo');
    expect(previewResponse3.result.previewPayloadExample).to.deep.equal(resultWithEventsPayloadFoo);

    // testing the steps.digest-step.events[0].payload.foo variable
    const controlValues4 = {
      body: '{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"single variable: {{steps.digest-step.events[0].payload.foo}} "}]}]}',
      subject: 'events',
    };
    const previewResponse4 = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: { controlValues: controlValues4, previewPayload: {} },
      stepId,
      workflowId: workflow.id,
    });
    expect(previewResponse4.result.result.preview.body).to.contain('single variable: foo');
    expect(previewResponse4.result.previewPayloadExample).to.deep.equal(resultWithEventsPayloadFoo);

    // testing the countSummary and sentenceSummary variables
    const controlValues5 = {
      body: `{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"variable","attrs":{"id":"steps.digest-step.eventCount | pluralize: 'notification', 'notifications'","label":null,"fallback":null,"required":false,"aliasFor":null}},{"type":"text","text":" "}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"variable","attrs":{"id":"steps.digest-step.events | toSentence: 'payload.name', 2, 'other'","label":null,"fallback":null,"required":false,"aliasFor":null}},{"type":"text","text":" "}]}]}`,
      subject: 'countSummary and sentenceSummary',
    };
    const previewResponse5 = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: { controlValues: controlValues5, previewPayload: {} },
      stepId,
      workflowId: workflow.id,
    });
    expect(previewResponse5.result.result.preview.body).to.contain('3 notifications');
    expect(previewResponse5.result.result.preview.body).to.contain('name, name, and 1 other');
    expect(previewResponse5.result.previewPayloadExample).to.deep.equal({
      steps: {
        'digest-step': {
          events: [
            {
              payload: {
                name: 'name',
              },
            },
            {
              payload: {
                name: 'name',
              },
            },
            {
              payload: {
                name: 'name',
              },
            },
          ],
        },
      },
    });

    // testing the digest block with 3 variables combining current and full variable
    const controlValues6 = {
      body: `{"type":"doc","content":[{"type":"section","attrs":{"borderRadius":0,"backgroundColor":"#FFFFFF","align":"left","borderWidth":0,"borderColor":"#e2e2e2","paddingTop":0,"paddingRight":0,"paddingBottom":0,"paddingLeft":0,"marginTop":0,"marginRight":0,"marginBottom":0,"marginLeft":0,"showIfKey":null},"content":[{"type":"repeat","attrs":{"each":"steps.digest-step.events","isUpdatingKey":false,"showIfKey":null,"iterations":5},"content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"variable","attrs":{"id":"steps.digest-step.events.payload.foo.bar.first","label":null,"fallback":null,"required":false,"aliasFor":null}},{"type":"text","text":" "}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"variable","attrs":{"id":"steps.digest-step.events.payload.foo.bar.baz.second","label":null,"fallback":null,"required":false,"aliasFor":null}},{"type":"text","text":" "}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"variable","attrs":{"id":"current.payload.third","label":null,"fallback":null,"required":false,"aliasFor":"steps.digest-step.events.payload.third"}},{"type":"text","text":" "}]}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"variable","attrs":{"id":"steps.digest-step.eventCount | minus: 5 | pluralize: 'more comment', ''","label":null,"fallback":null,"required":false,"aliasFor":null}}]}]}]}`,
      subject: 'digest block',
    };
    const previewResponse6 = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: { controlValues: controlValues6, previewPayload: {} },
      stepId,
      workflowId: workflow.id,
    });
    const countOccurrences = (str: string, searchStr: string) => (str.match(new RegExp(searchStr, 'g')) || []).length;
    expect(countOccurrences(previewResponse6.result.result.preview.body, 'first')).to.equal(3);
    expect(countOccurrences(previewResponse6.result.result.preview.body, 'second')).to.equal(3);
    expect(countOccurrences(previewResponse6.result.result.preview.body, 'third')).to.equal(3);
    expect(previewResponse6.result.previewPayloadExample).to.deep.equal({
      steps: {
        'digest-step': {
          events: [
            {
              payload: {
                third: 'third',
                foo: {
                  bar: {
                    first: 'first',
                    baz: {
                      second: 'second',
                    },
                  },
                },
              },
            },
            {
              payload: {
                third: 'third',
                foo: {
                  bar: {
                    first: 'first',
                    baz: {
                      second: 'second',
                    },
                  },
                },
              },
            },
            {
              payload: {
                third: 'third',
                foo: {
                  bar: {
                    first: 'first',
                    baz: {
                      second: 'second',
                    },
                  },
                },
              },
            },
          ],
        },
      },
    });

    // @ts-ignore
    process.env.IS_ENHANCED_DIGEST_ENABLED = 'false';
  });

  describe('Hydration testing', () => {
    it.skip(` should hydrate previous step in iterator email --> digest`, async () => {
      const { workflowId, emailStepDatabaseId, digestStepId } = await createWorkflowWithEmailLookingAtDigestResult();
      const requestDto = {
        controlValues: getTestControlValues(digestStepId)[StepTypeEnum.Email],
        previewPayload: { payload: { subject: PLACEHOLDER_SUBJECT_INAPP_PAYLOAD_VALUE } },
      };
      const previewResponseDto = await generatePreview(novuClient, workflowId, emailStepDatabaseId, requestDto);
      expect(previewResponseDto.result!.preview).to.exist;
      expect(previewResponseDto.previewPayloadExample).to.exist;
      expect(previewResponseDto.previewPayloadExample?.steps?.[digestStepId]).to.be.ok;
      if (previewResponseDto.result!.type !== ChannelTypeEnum.Email) {
        throw new Error('Expected email');
      }
      const preview = previewResponseDto.result!.preview.body;
      expect(previewResponseDto.result!.preview.body).to.contain('{{item.payload.country}}');
    });

    it(` should hydrate previous step in iterator sms looking at inApp`, async () => {
      const { workflowId, smsDatabaseStepId, inAppStepId } = await createWorkflowWithSmsLookingAtInAppResult();
      const requestDto = buildDtoNoPayload(StepTypeEnum.Sms, inAppStepId);
      const previewResponseDto = await generatePreview(novuClient, workflowId, smsDatabaseStepId, requestDto);
      expect(previewResponseDto.result!.preview).to.exist;
      expect(previewResponseDto.previewPayloadExample).to.exist;
      expect(previewResponseDto.previewPayloadExample?.steps).to.be.ok;
      if (previewResponseDto.result?.type === 'sms' && previewResponseDto.result?.preview.body) {
        expect(previewResponseDto.result!.preview.body).to.contain(`[[seen]]`);
      }
    });
  });

  it(`IN_APP :should match the body in the preview response`, async () => {
    const { stepDatabaseId, workflowId, stepId } = await createWorkflowAndReturnId(novuClient, StepTypeEnum.InApp);
    const controlValues = buildInAppControlValues();
    const requestDto = {
      controlValues,
      previewPayload: { payload: { subject: PLACEHOLDER_SUBJECT_INAPP_PAYLOAD_VALUE } },
    };
    const previewResponseDto = await generatePreview(novuClient, workflowId, stepDatabaseId, requestDto);
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
      const previewResponseDto = await createWorkflowAndPreview(StepTypeEnum.InApp, 'InApp');

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
      const previewResponseDto = await createWorkflowAndPreview(StepTypeEnum.Sms, 'SMS');

      expect(previewResponseDto.result!.preview).to.exist;
      expect(previewResponseDto.previewPayloadExample).to.exist;
      expect(previewResponseDto.previewPayloadExample.subscriber, 'Expecting to find subscriber in the payload').to
        .exist;

      expect(previewResponseDto.result!.preview).to.deep.equal({ body: ' Hello, World! firstName' });
    });

    it('push: should match the body in the preview response', async () => {
      const previewResponseDto = await createWorkflowAndPreview(StepTypeEnum.Push, 'Push');

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
      const previewResponseDto = await createWorkflowAndPreview(StepTypeEnum.Chat, 'Chat');

      expect(previewResponseDto.result!.preview).to.exist;
      expect(previewResponseDto.previewPayloadExample).to.exist;
      expect(previewResponseDto.previewPayloadExample.subscriber, 'Expecting to find subscriber in the payload').to
        .exist;

      expect(previewResponseDto.result!.preview).to.deep.equal({ body: 'Hello, World! firstName' });
    });

    it('email: should match the body in the preview response', async () => {
      const previewResponseDto = await createWorkflowAndPreview(StepTypeEnum.Email, 'Email');
      const preview = previewResponseDto.result.preview as EmailRenderOutput;

      expect(previewResponseDto.result.type).to.equal(StepTypeEnum.Email);

      expect(preview).to.exist;
      expect(preview.body).to.exist;
      expect(preview.subject).to.exist;
      expect(preview.body).to.contain(previewPayloadExample().payload.body);
      expect(preview.subject).to.contain(`Hello, World! payload`);
      expect(previewResponseDto.previewPayloadExample).to.exist;
      expect(previewResponseDto.previewPayloadExample).to.deep.equal(previewPayloadExample());
    });

    async function createWorkflowAndPreview(type: StepTypeEnum, description: string) {
      const { stepDatabaseId, workflowId } = await createWorkflowAndReturnId(novuClient, type);
      const requestDto = buildDtoNoPayload(type);

      return await generatePreview(novuClient, workflowId, stepDatabaseId, requestDto);
    }
  });

  describe('payload sanitation', () => {
    it('Should produce a correct payload when pipe is used etc {{payload.variable | upper}}', async () => {
      const { stepDatabaseId, workflowId } = await createWorkflowAndReturnId(novuClient, StepTypeEnum.Sms);
      const requestDto = {
        controlValues: {
          body: 'This is a legal placeholder with a pipe [{{payload.variableName | upcase}}the pipe should show in the preview]',
        },
      };
      const previewResponseDto = await generatePreview(novuClient, workflowId, stepDatabaseId, requestDto);
      expect(previewResponseDto.result!.preview).to.exist;
      if (previewResponseDto.result!.type !== 'sms') {
        throw new Error('Expected sms');
      }
      expect(previewResponseDto.result!.preview.body).to.contain('VARIABLENAME');
      expect(previewResponseDto.previewPayloadExample).to.exist;
      expect(previewResponseDto?.previewPayloadExample?.payload?.variableName).to.equal('variableName');
    });

    it('Should not fail if inApp is providing partial URL in redirect', async () => {
      const steps = [{ name: 'IN_APP_STEP_SHOULD_NOT_FAIL', type: StepTypeEnum.InApp }];
      const createDto = buildWorkflow({ steps });
      const novuRestResult = await novuClient.workflows.create(createDto);
      const controlValues = {
        subject: `{{subscriber.firstName}} Hello, World! ${PLACEHOLDER_SUBJECT_INAPP}`,
        body: `Hello, World! {{payload.placeholder.body}}`,
        avatar: 'https://www.example.com/avatar.png',
        primaryAction: {
          label: '{{payload.secondaryUrl}}',
          redirect: {
            target: RedirectTargetEnum.Blank,
          },
        },
        secondaryAction: null,
        redirect: {
          target: RedirectTargetEnum.Blank,
          url: '   ',
        },
      };
      const workflowSlug = novuRestResult.result?.slug;
      const stepSlug = novuRestResult.result?.steps[0].slug;
      const stepDataDto = await updateWorkflow(workflowSlug, {
        ...novuRestResult.result,
        steps: [
          {
            ...novuRestResult.result.steps[0],
            controlValues,
          },
        ],
      });
      const generatePreviewResponseDto = await generatePreview(novuClient, workflowSlug, stepSlug, {
        controlValues,
      });
      if (generatePreviewResponseDto.result?.type === ChannelTypeEnum.InApp) {
        expect(generatePreviewResponseDto.result.preview.body).to.equal(
          {
            subject: `{{subscriber.firstName}} Hello, World! ${PLACEHOLDER_SUBJECT_INAPP}`,
            body: `Hello, World! body`,
            avatar: 'https://www.example.com/avatar.png',
            primaryAction: {
              label: '{{payload.secondaryUrl}}',
              redirect: {
                target: RedirectTargetEnum.Blank,
              },
            },
            secondaryAction: null,
            redirect: {
              target: RedirectTargetEnum.Blank,
              url: '   ',
            },
          }.body
        );
      }
    });

    it('Should not fail if inApp url ref is a placeholder without payload', async () => {
      const steps = [{ name: 'IN_APP_STEP_SHOULD_NOT_FAIL', type: StepTypeEnum.InApp }];
      const createDto = buildWorkflow({ steps });
      const novuRestResult = await novuClient.workflows.create(createDto);
      const workflowSlug = novuRestResult.result?.slug;
      const stepSlug = novuRestResult.result?.steps[0].slug;
      const stepDataDto = await updateWorkflow(workflowSlug, {
        ...novuRestResult.result,
        steps: [
          {
            ...novuRestResult.result.steps[0],
            ...buildInAppControlValueWithAPlaceholderInTheUrl(),
          },
        ],
      });
      const generatePreviewResponseDto = await generatePreview(novuClient, workflowSlug, stepSlug, {
        controlValues: buildInAppControlValueWithAPlaceholderInTheUrl(),
      });

      if (generatePreviewResponseDto.result?.type === ChannelTypeEnum.InApp) {
        expect(generatePreviewResponseDto.result.preview.body).to.equal('Hello, World! body');
      }
    });
  });

  describe('Missing Required ControlValues', () => {
    const channelTypes = [{ type: StepTypeEnum.InApp, description: 'InApp' }];

    channelTypes.forEach(({ type, description }) => {
      // TODO: We need to get back to the drawing board on this one to make the preview action of the framework more forgiving
      it(`[${type}] will generate gracefully the preview if the control values are missing`, async () => {
        const { stepDatabaseId, workflowId, stepId } = await createWorkflowAndReturnId(novuClient, type);
        const requestDto = buildDtoWithMissingControlValues(type, stepId);

        const previewResponseDto = await generatePreview(novuClient, workflowId, stepDatabaseId, requestDto);

        expect(previewResponseDto.result).to.not.eql({ preview: {} });
      });
    });
  });

  async function updateWorkflow(id: string, workflow: UpdateWorkflowDto): Promise<WorkflowResponseDto> {
    const res = await novuClient.workflows.update(workflow, id);

    return res.result;
  }

  async function createWorkflowWithEmailLookingAtDigestResult() {
    const createWorkflowDto: CreateWorkflowDto = {
      tags: [],
      source: WorkflowCreationSourceEnum.Editor,
      name: 'John',
      workflowId: `john:${randomUUID()}`,
      description: 'This is a test workflow',
      active: true,
      steps: [
        {
          name: 'DigestStep',
          type: StepTypeEnum.Digest,
        },
        {
          name: 'Email Test Step',
          type: StepTypeEnum.Email,
        },
      ],
    };
    const workflowResult = await novuClient.workflows.create(createWorkflowDto);

    return {
      workflowId: workflowResult.result.id,
      emailStepDatabaseId: workflowResult.result.steps[1].id,
      digestStepId: workflowResult.result.steps[0].stepId,
    };
  }
  async function createWorkflowWithSmsLookingAtInAppResult() {
    const createWorkflowDto: CreateWorkflowDto = {
      tags: [],
      source: WorkflowCreationSourceEnum.Editor,
      name: 'John',
      workflowId: `john:${randomUUID()}`,
      description: 'This is a test workflow',
      active: true,
      steps: [
        {
          name: 'InAppStep',
          type: StepTypeEnum.InApp,
        },
        {
          name: 'SmsStep',
          type: StepTypeEnum.Sms,
        },
      ],
    };
    const workflowResult = await novuClient.workflows.create(createWorkflowDto);

    return {
      workflowId: workflowResult.result.id,
      smsDatabaseStepId: workflowResult.result.steps[1].id,
      inAppStepId: workflowResult.result.steps[0].stepId,
    };
  }

  async function createWorkflow(overrides: Partial<NotificationTemplateEntity> = {}): Promise<WorkflowResponseDto> {
    const createWorkflowDto: CreateWorkflowDto = {
      source: WorkflowCreationSourceEnum.Editor,
      name: TEST_WORKFLOW_NAME,
      workflowId: `${slugify(TEST_WORKFLOW_NAME)}`,
      description: 'This is a test workflow',
      active: true,
      steps: [
        {
          name: 'In-App Test Step',
          type: StepTypeEnum.InApp,
        },
        {
          name: 'Email Test Step',
          type: StepTypeEnum.Email,
        },
      ],
    };

    const res = await novuClient.workflows.create(createWorkflowDto);

    await notificationTemplateRepository.updateOne(
      {
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        _id: res.result.id,
      },
      {
        ...overrides,
      }
    );

    return res.result;
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
        origin: WorkflowOriginEnum.External,
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
        target: RedirectTargetEnum.Blank,
      },
    },
    secondaryAction: {
      label: 'Secondary Action',
      redirect: {
        target: RedirectTargetEnum.Blank,
        url: '/home/secondary-action',
      },
    },
    data: {
      key: 'value',
    },
    redirect: {
      target: RedirectTargetEnum.Blank,
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
        target: RedirectTargetEnum.Blank,
      },
    },
    secondaryAction: {
      label: 'Secondary Action',
      redirect: {
        target: RedirectTargetEnum.Blank,
        url: '',
      },
    },
    redirect: {
      target: RedirectTargetEnum.Blank,
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
  [StepTypeEnum.Sms]: buildSmsControlValuesPayload(stepId),
  [StepTypeEnum.Email]: buildEmailControlValuesPayload(),
  [StepTypeEnum.Push]: buildPushControlValuesPayload(),
  [StepTypeEnum.Chat]: buildChatControlValuesPayload(),
  [StepTypeEnum.InApp]: buildInAppControlValues(),
  [StepTypeEnum.Digest]: buildDigestControlValuesPayload(),
});

export async function createWorkflowAndReturnId(workflowsClient: Novu, type: StepTypeEnum) {
  const createWorkflowDto = buildWorkflow();
  createWorkflowDto.steps[0].type = type;
  const workflowResult = await workflowsClient.workflows.create(createWorkflowDto);

  return {
    workflowId: workflowResult.result.id,
    stepDatabaseId: workflowResult.result.steps[0].id,
    stepId: workflowResult.result.steps[0].stepId,
  };
}

export async function generatePreview(
  workflowsClient: Novu,
  workflowId: string,
  stepDatabaseId: string,
  dto: GeneratePreviewRequestDto
): Promise<GeneratePreviewResponseDto> {
  return (
    await workflowsClient.workflows.steps.generatePreview({
      workflowId,
      stepId: stepDatabaseId,
      generatePreviewRequestDto: dto,
    })
  ).result;
}

function buildDtoWithMissingControlValues(stepTypeEnum: StepTypeEnum, stepId: string): GeneratePreviewRequestDto {
  const stepTypeToElement = getTestControlValues(stepId)[stepTypeEnum];
  if (stepTypeEnum === StepTypeEnum.Email) {
    delete stepTypeToElement.subject;
  } else {
    delete stepTypeToElement.body;
  }

  return {
    controlValues: stepTypeToElement,
    previewPayload: { payload: { subject: PLACEHOLDER_SUBJECT_INAPP_PAYLOAD_VALUE } },
  };
}
