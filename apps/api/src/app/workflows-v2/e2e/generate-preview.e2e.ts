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
  StepTypeEnum,
  UpdateWorkflowDto,
  UpdateWorkflowDtoSteps,
  WorkflowCreationSourceEnum,
  ResourceOriginEnum,
  WorkflowResponseDto,
} from '@novu/api/models/components';
import { CronExpressionEnum, RedirectTargetEnum, slugify } from '@novu/shared';
import { EmailControlType } from '@novu/application-generic';
import { initNovuClassSdkInternalAuth } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';
import { buildWorkflow } from '../workflow.controller.e2e';
import { fullCodeSnippet, previewPayloadExample } from '../maily-test-data';
import { DEFAULT_ARRAY_ELEMENTS } from '../../shared/usecases/create-variables-object/create-variables-object.usecase';

const TEST_WORKFLOW_NAME = 'Test Workflow Name';
const SUBJECT_TEST_PAYLOAD = '{{payload.subject.test.payload}}';
const PLACEHOLDER_SUBJECT_INAPP = '{{payload.subject}}';
const PLACEHOLDER_SUBJECT_INAPP_PAYLOAD_VALUE = 'this is the replacement text for the placeholder';

describe('Workflow Step Preview - POST /:workflowId/step/:stepId/preview #novu-v2', async () => {
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
    await emulateExternalOrigin(workflow.id);

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
      schema: {
        additionalProperties: false,
        properties: {
          payload: {
            $schema: 'http://json-schema.org/draft-07/schema#',
            properties: {},
            type: 'object',
          },
          subscriber: {
            additionalProperties: true,
            properties: {
              avatar: {
                type: 'string',
              },
              data: {
                additionalProperties: true,
                type: 'object',
              },
              email: {
                format: 'email',
                type: 'string',
              },
              firstName: {
                type: 'string',
              },
              lastName: {
                type: 'string',
              },
              locale: {
                type: 'string',
              },
              phone: {
                type: 'string',
              },
              subscriberId: {
                type: 'string',
              },
            },
            type: 'object',
          },
          steps: {
            type: 'object',
            description: 'Steps data from previous workflow executions',
            additionalProperties: {
              type: 'object',
              properties: {
                eventCount: {
                  type: 'number',
                },
                events: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      payload: {
                        type: 'object',
                        additionalProperties: true,
                      },
                    },
                    additionalProperties: true,
                  },
                },
              },
              additionalProperties: true,
            },
          },
        },
        type: 'object',
      },
      result: {
        preview: {
          subject: 'Welcome John',
          body: 'Hello John Doe, Welcome to !',
        },
        type: 'in_app',
      },
      previewPayloadExample: {
        subscriber: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'user@example.com',
          phone: '+1234567890',
          avatar: 'https://example.com/avatar.png',
          locale: 'en-US',
          data: {},
        },
        payload: {},
        steps: {},
      },
    });
  });

  it('should generate preview for in-app init page - no variables example in dto body', async () => {
    const workflow = await createWorkflow();
    await emulateExternalOrigin(workflow.id);

    const stepId = workflow.steps[0].id;
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
    const { result } = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: {
        controlValues,
        previewPayload,
      },
      stepId,
      workflowId: workflow.id,
    });

    expect(result).to.deep.equal({
      schema: null,
      result: {
        preview: {
          subject: 'John Hello, World! ',
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
          firstName: 'John',
          lastName: 'Doe',
          email: 'user@example.com',
          phone: '+1234567890',
          avatar: 'https://example.com/avatar.png',
          locale: 'en-US',
          data: {},
        },
        payload: {
          placeholder: {
            body: 'body',
            random: 'random',
          },
          primaryUrlLabel: 'primaryUrlLabel',
        },
        steps: {},
      },
    });
  });

  it('should generate preview for in-app step', async () => {
    const workflow = await createWorkflow();
    await emulateExternalOrigin(workflow.id);

    const stepId = workflow.steps[0].id;
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
      schema: null,
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
          lastName: 'Doe',
          email: 'user@example.com',
          phone: '+1234567890',
          avatar: 'https://example.com/avatar.png',
          locale: 'en-US',
          data: {},
        },
        payload: {
          placeholder: {
            body: 'This is a body',
          },
          primaryUrlLabel: 'https://example.com',
        },
        steps: {},
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
      schema: {
        additionalProperties: false,
        properties: {
          payload: {
            properties: {
              organizationName: {
                default: 'Pokemon Organization',
                type: 'string',
              },
              placeholder: {
                properties: {
                  body: {
                    default: 'Default body text',
                    type: 'string',
                  },
                  random: {
                    type: 'string',
                  },
                },
                type: 'object',
              },
              primaryUrlLabel: {
                default: 'Click here',
                type: 'string',
              },
            },
            type: 'object',
          },
          subscriber: {
            additionalProperties: true,
            properties: {
              avatar: {
                type: 'string',
              },
              data: {
                additionalProperties: true,
                type: 'object',
              },
              email: {
                format: 'email',
                type: 'string',
              },
              firstName: {
                type: 'string',
              },
              lastName: {
                type: 'string',
              },
              locale: {
                type: 'string',
              },
              phone: {
                type: 'string',
              },
              subscriberId: {
                type: 'string',
              },
            },
            type: 'object',
          },
          steps: {
            type: 'object',
            description: 'Steps data from previous workflow executions',
            additionalProperties: {
              type: 'object',
              properties: {
                eventCount: {
                  type: 'number',
                },
                events: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      payload: {
                        type: 'object',
                        additionalProperties: true,
                      },
                    },
                    additionalProperties: true,
                  },
                },
              },
              additionalProperties: true,
            },
          },
        },
        type: 'object',
      },
      previewPayloadExample: {
        subscriber: {
          firstName: 'First Name',
          lastName: 'Doe',
          email: 'user@example.com',
          phone: '+1234567890',
          avatar: 'https://example.com/avatar.png',
          locale: 'en-US',
          data: {},
        },
        payload: {
          placeholder: {
            body: 'Default body text',
            random: 'random',
          },
          primaryUrlLabel: 'New Click Here',
          organizationName: 'Pokemon Organization',
        },
        steps: {},
      },
    });
  });

  it('should gracefully handle undefined variables that are not present in payload schema', async () => {
    const payloadSchema = {
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
    const workflow = await createWorkflow({ payloadSchema });
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
          body: 'Hello John, your order # is ready!',
        },
        type: 'in_app',
      },
      schema: {
        additionalProperties: false,
        properties: {
          payload: {
            properties: {
              lastName: {
                type: 'string',
              },
              organizationName: {
                type: 'string',
              },
            },
            type: 'object',
          },
          subscriber: {
            additionalProperties: true,
            properties: {
              avatar: {
                type: 'string',
              },
              data: {
                additionalProperties: true,
                type: 'object',
              },
              email: {
                format: 'email',
                type: 'string',
              },
              firstName: {
                type: 'string',
              },
              lastName: {
                type: 'string',
              },
              locale: {
                type: 'string',
              },
              phone: {
                type: 'string',
              },
              subscriberId: {
                type: 'string',
              },
            },
            type: 'object',
          },
          steps: {
            type: 'object',
            description: 'Steps data from previous workflow executions',
            additionalProperties: {
              type: 'object',
              properties: {
                eventCount: {
                  type: 'number',
                },
                events: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      payload: {
                        type: 'object',
                        additionalProperties: true,
                      },
                    },
                    additionalProperties: true,
                  },
                },
              },
              additionalProperties: true,
            },
          },
        },
        type: 'object',
      },
      previewPayloadExample: {
        subscriber: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'user@example.com',
          phone: '+1234567890',
          avatar: 'https://example.com/avatar.png',
          locale: 'en-US',
          data: {},
        },
        payload: {
          lastName: '{{payload.lastName}}',
          organizationName: '{{payload.organizationName}}',
          firstName: 'John',
        },
        steps: {},
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
      schema: {
        additionalProperties: false,
        properties: {
          payload: {
            properties: {
              lastName: {
                type: 'string',
              },
              organizationName: {
                type: 'string',
              },
            },
            type: 'object',
          },
          subscriber: {
            additionalProperties: true,
            properties: {
              avatar: {
                type: 'string',
              },
              data: {
                additionalProperties: true,
                type: 'object',
              },
              email: {
                format: 'email',
                type: 'string',
              },
              firstName: {
                type: 'string',
              },
              lastName: {
                type: 'string',
              },
              locale: {
                type: 'string',
              },
              phone: {
                type: 'string',
              },
              subscriberId: {
                type: 'string',
              },
            },
            type: 'object',
          },
          steps: {
            type: 'object',
            description: 'Steps data from previous workflow executions',
            additionalProperties: {
              type: 'object',
              properties: {
                eventCount: {
                  type: 'number',
                },
                events: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      payload: {
                        type: 'object',
                        additionalProperties: true,
                      },
                    },
                    additionalProperties: true,
                  },
                },
              },
              additionalProperties: true,
            },
          },
        },
        type: 'object',
      },
      previewPayloadExample: {
        subscriber: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'user@example.com',
          phone: '+1234567890',
          avatar: 'https://example.com/avatar.png',
          locale: 'en-US',
          data: {},
        },
        payload: {
          lastName: '{{payload.lastName}}',
          organizationName: '{{payload.organizationName}}',
          orderId: '123456',
          firstName: 'John',
        },
        steps: {},
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
      schema: null,
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
      schema: null,
      result: {
        preview: {},
      },
      previewPayloadExample: {},
    });
  });

  it('should generate preview for email step with subscriber variables', async () => {
    const createWorkflowDto: CreateWorkflowDto = {
      tags: [],
      source: WorkflowCreationSourceEnum.Editor,
      name: 'Email Test Workflow',
      workflowId: `email-test-workflow-${randomUUID()}`,
      description: 'This is a test workflow',
      active: true,
      steps: [
        {
          name: 'Email Test Step',
          type: StepTypeEnum.Email,
          controlValues: {
            subject: 'Test Email Subject',
            body: 'Hello, {{subscriber.firstName}}!',
            disableOutputSanitization: false,
          },
        },
      ],
    };
    const { result: workflow } = await novuClient.workflows.create(createWorkflowDto);
    const stepId = workflow.steps[0].id;
    const controlValues = {
      subject: 'Test Email Subject',
      body: 'Hello, {{subscriber.firstName}}!',
      disableOutputSanitization: false,
    };
    const previewPayload: PreviewPayloadDto = {
      subscriber: {
        firstName: 'John',
      },
    };

    const { result } = await novuClient.workflows.steps.generatePreview({
      workflowId: workflow.id,
      stepId,
      generatePreviewRequestDto: { controlValues, previewPayload },
    });

    expect(result.result.preview.subject).to.contain('Test Email Subject');
    expect(result.result.preview.body).to.contain('Hello, John!');
  });

  it('should generate preview for the email step with digest variables', async () => {
    const { workflowId, emailStepDatabaseId } = await createWorkflowWithEmailLookingAtDigestResult();

    // Helper function to validate digest event structure
    const validateDigestEvents = (events: any[], expectedPayload: any) => {
      expect(events).to.have.length(DEFAULT_ARRAY_ELEMENTS);
      events.forEach((event) => {
        expect(event).to.have.property('id').that.is.a('string');
        expect(event).to.have.property('time').that.is.a('string');
        expect(event).to.have.property('payload').that.deep.equals(expectedPayload);
      });
    };

    // testing the steps.digest-step.events.length variable
    const controlValues1 = {
      body: '{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"events length "},{"type":"variable","attrs":{"id":"steps.digest-step.events.length","label":null,"fallback":null,"required":false,"aliasFor":null}},{"type":"text","text":" "}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":" "}]}]}',
      subject: 'events length',
    };
    const previewResponse1 = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: { controlValues: controlValues1, previewPayload: {} },
      stepId: emailStepDatabaseId,
      workflowId,
    });
    expect(previewResponse1.result.result.preview.body).to.contain(`events length ${DEFAULT_ARRAY_ELEMENTS}`);
    validateDigestEvents(previewResponse1.result.previewPayloadExample.steps?.['digest-step'].events, {});

    // testing the steps.digest-step.eventCount variable
    const controlValues2 = {
      body: '{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"eventCount "},{"type":"variable","attrs":{"id":"steps.digest-step.eventCount","label":null,"fallback":null,"required":false,"aliasFor":null}},{"type":"text","text":" "}]}]}',
      subject: 'eventCount',
    };
    const previewResponse2 = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: { controlValues: controlValues2, previewPayload: {} },
      stepId: emailStepDatabaseId,
      workflowId,
    });
    expect(previewResponse2.result.result.preview.body).to.contain(`eventCount ${DEFAULT_ARRAY_ELEMENTS}`);
    validateDigestEvents(previewResponse2.result.previewPayloadExample.steps?.['digest-step'].events, {});

    // testing the steps.digest-step.events array and direct access to the first item
    const controlValues3 = {
      body: '{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"variable","attrs":{"id":"steps.digest-step.events","label":null,"fallback":null,"required":false,"aliasFor":null}},{"type":"text","text":" "}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"single variable: {{steps.digest-step.events[0].payload.foo}}"}]}]}',
      subject: 'events',
    };
    const previewResponse3 = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: { controlValues: controlValues3, previewPayload: {} },
      stepId: emailStepDatabaseId,
      workflowId,
    });
    // Check that the body contains the digest events array structure without asserting exact times
    expect(previewResponse3.result.result.preview.body).to.contain("'id':'example-id-1'");
    expect(previewResponse3.result.result.preview.body).to.contain("'payload':{'foo':'foo'}");
    expect(previewResponse3.result.result.preview.body).to.contain("'time':");
    // Count the number of events in the rendered output
    const eventMatches = previewResponse3.result.result.preview.body.match(/'id':'example-id-\d+'/g);
    expect(eventMatches).to.have.length(DEFAULT_ARRAY_ELEMENTS);
    expect(previewResponse3.result.result.preview.body).to.contain('single variable: foo');
    validateDigestEvents(previewResponse3.result.previewPayloadExample.steps?.['digest-step'].events, { foo: 'foo' });

    // testing the steps.digest-step.events[0].payload.foo variable
    const controlValues4 = {
      body: '{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"single variable: {{steps.digest-step.events[0].payload.foo}} "}]}]}',
      subject: 'events',
    };
    const previewResponse4 = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: { controlValues: controlValues4, previewPayload: {} },
      stepId: emailStepDatabaseId,
      workflowId,
    });
    expect(previewResponse4.result.result.preview.body).to.contain('single variable: foo');
    validateDigestEvents(previewResponse4.result.previewPayloadExample.steps?.['digest-step'].events, { foo: 'foo' });

    // testing the countSummary and sentenceSummary variables
    const controlValues5 = {
      body: `{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"variable","attrs":{"id":"steps.digest-step.eventCount | pluralize: 'notification', 'notifications'","label":null,"fallback":null,"required":false,"aliasFor":null}},{"type":"text","text":" "}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"variable","attrs":{"id":"steps.digest-step.events | toSentence: 'payload.name', 2, 'other'","label":null,"fallback":null,"required":false,"aliasFor":null}},{"type":"text","text":" "}]}]}`,
      subject: 'countSummary and sentenceSummary',
    };
    const previewResponse5 = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: { controlValues: controlValues5, previewPayload: {} },
      stepId: emailStepDatabaseId,
      workflowId,
    });
    expect(previewResponse5.result.result.preview.body).to.contain(`${DEFAULT_ARRAY_ELEMENTS} notifications`);
    expect(previewResponse5.result.result.preview.body).to.contain(
      `name, name, and ${DEFAULT_ARRAY_ELEMENTS - 2} other`
    );
    validateDigestEvents(previewResponse5.result.previewPayloadExample.steps?.['digest-step'].events, { name: 'name' });

    // testing the digest block with 3 variables combining current and full variable
    const controlValues6 = {
      body: `{"type":"doc","content":[{"type":"section","attrs":{"borderRadius":0,"backgroundColor":"#FFFFFF","align":"left","borderWidth":0,"borderColor":"#e2e2e2","paddingTop":0,"paddingRight":0,"paddingBottom":0,"paddingLeft":0,"marginTop":0,"marginRight":0,"marginBottom":0,"marginLeft":0,"showIfKey":null},"content":[{"type":"repeat","attrs":{"each":"steps.digest-step.events","isUpdatingKey":false,"showIfKey":null,"iterations":5},"content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"variable","attrs":{"id":"steps.digest-step.events.payload.foo.bar.first","label":null,"fallback":null,"required":false,"aliasFor":null}},{"type":"text","text":" "}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"variable","attrs":{"id":"steps.digest-step.events.payload.foo.bar.baz.second","label":null,"fallback":null,"required":false,"aliasFor":null}},{"type":"text","text":" "}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"variable","attrs":{"id":"current.payload.third","label":null,"fallback":null,"required":false,"aliasFor":"steps.digest-step.events.payload.third"}},{"type":"text","text":" "}]}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"variable","attrs":{"id":"steps.digest-step.eventCount | minus: 5 | pluralize: 'more comment', ''","label":null,"fallback":null,"required":false,"aliasFor":null}}]}]}]}`,
      subject: 'digest block',
    };
    const previewResponse6 = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: { controlValues: controlValues6, previewPayload: {} },
      stepId: emailStepDatabaseId,
      workflowId,
    });
    const countOccurrences = (str: string, searchStr: string) => (str.match(new RegExp(searchStr, 'g')) || []).length;
    expect(countOccurrences(previewResponse6.result.result.preview.body, 'first')).to.equal(DEFAULT_ARRAY_ELEMENTS);
    expect(countOccurrences(previewResponse6.result.result.preview.body, 'second')).to.equal(DEFAULT_ARRAY_ELEMENTS);
    expect(countOccurrences(previewResponse6.result.result.preview.body, 'third')).to.equal(DEFAULT_ARRAY_ELEMENTS);
    validateDigestEvents(previewResponse6.result.previewPayloadExample.steps?.['digest-step'].events, {
      third: 'third',
      foo: {
        bar: {
          first: 'first',
          baz: {
            second: 'second',
          },
        },
      },
    });
  });

  it('should allow using the current and the payload variables in the repeat block with the list items and buttons', async () => {
    const { workflowId, emailStepDatabaseId } = await createWorkflowWithEmailLookingAtDigestResult();

    const controlValues = {
      body: '{"type":"doc","content":[{"type":"repeat","attrs":{"each":"payload.items","isUpdatingKey":false,"showIfKey":null,"iterations":0},"content":[{"type":"bulletList","content":[{"type":"listItem","attrs":{"color":null},"content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"variable","attrs":{"id":"payload.items.foo","label":null,"fallback":null,"required":false,"aliasFor":null}},{"type":"text","text":" "}]}]}]},{"type":"button","attrs":{"text":"current.bar","isTextVariable":true,"url":"","isUrlVariable":false,"alignment":"left","variant":"filled","borderRadius":"smooth","buttonColor":"#000000","textColor":"#ffffff","showIfKey":null,"paddingTop":10,"paddingRight":32,"paddingBottom":10,"paddingLeft":32,"width":"auto","aliasFor":"payload.items.bar"}}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null}},{"type":"button","attrs":{"text":"payload.baz","isTextVariable":true,"url":"","isUrlVariable":false,"alignment":"left","variant":"filled","borderRadius":"smooth","buttonColor":"#000000","textColor":"#ffffff","showIfKey":null,"paddingTop":10,"paddingRight":32,"paddingBottom":10,"paddingLeft":32,"width":"auto","aliasFor":null}}]}',
      subject: 'repeat block current variable and payload variable',
    };
    const previewResponse = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: { controlValues, previewPayload: {} },
      stepId: emailStepDatabaseId,
      workflowId,
    });
    const countOccurrences = (str: string, searchStr: string) => (str.match(new RegExp(searchStr, 'g')) || []).length;
    expect(countOccurrences(previewResponse.result.result.preview.body, 'foo')).to.equal(DEFAULT_ARRAY_ELEMENTS);
    expect(countOccurrences(previewResponse.result.result.preview.body, 'bar')).to.equal(DEFAULT_ARRAY_ELEMENTS);
    expect(previewResponse.result.result.preview.body).to.contain('baz');

    // Validate the structure without hardcoded timestamps
    const actualPayload = previewResponse.result.previewPayloadExample;
    expect(actualPayload.subscriber).to.deep.equal({
      firstName: 'John',
      lastName: 'Doe',
      email: 'user@example.com',
      phone: '+1234567890',
      avatar: 'https://example.com/avatar.png',
      locale: 'en-US',
      data: {},
    });
    expect(actualPayload.payload).to.deep.equal({
      items: [
        {
          foo: 'foo',
          bar: 'bar',
        },
        {
          foo: 'foo',
          bar: 'bar',
        },
        {
          foo: 'foo',
          bar: 'bar',
        },
      ],
      baz: 'baz',
    });

    // Validate digest step structure without hardcoded timestamps
    expect(actualPayload.steps).to.exist;
    expect(actualPayload.steps).to.have.property('digest-step');
    expect(actualPayload.steps!['digest-step']).to.have.property('eventCount', 3);
    expect(actualPayload.steps!['digest-step']).to.have.property('events');
    expect(actualPayload.steps!['digest-step'].events).to.have.length(3);

    // Validate each event has the required structure without checking exact timestamps
    actualPayload.steps!['digest-step'].events.forEach((event, index) => {
      expect(event).to.have.property('id', `example-id-${index + 1}`);
      expect(event).to.have.property('time').that.is.a('string');
      expect(event).to.have.property('payload').that.deep.equals({});
      // Validate that time is a valid ISO string
      expect(new Date(event.time)).to.be.a('date');
    });
  });

  it('should allow using the static text and variables as a link on the email editor components', async () => {
    const { workflowId, emailStepDatabaseId } = await createWorkflowWithEmailLookingAtDigestResult();

    const controlValues = {
      body: '{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"Just the paragraph"}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"payload.paragraph_link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":true,"aliasFor":null}},{"type":"underline"}],"text":"Paragraph variable link"}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"https://paragraph.static.link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":false,"aliasFor":null}},{"type":"underline"}],"text":"Paragraph static link"}]},{"type":"heading","attrs":{"textAlign":null,"level":1,"showIfKey":null},"content":[{"type":"text","text":"Just the heading"}]},{"type":"heading","attrs":{"textAlign":null,"level":1,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"payload.heading_link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":true,"aliasFor":null}},{"type":"underline"}],"text":"Heading text link"}]},{"type":"heading","attrs":{"textAlign":null,"level":1,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"https://heading.static.link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":false,"aliasFor":null}},{"type":"underline"}],"text":"Heading static link"}]},{"type":"blockquote","content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"Just the blockquote"}]}]},{"type":"blockquote","content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"payload.blockquote_link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":true,"aliasFor":null}},{"type":"underline"}],"text":"Blockquote text link"}]}]},{"type":"blockquote","content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"https://blockquote.static.link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":false,"aliasFor":null}},{"type":"underline"}],"text":"Blockquote static link"}]}]},{"type":"bulletList","content":[{"type":"listItem","attrs":{"color":null},"content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"Just the bullet"}]}]},{"type":"listItem","attrs":{"color":null},"content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"payload.bullet_link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":true,"aliasFor":null}},{"type":"underline"}],"text":"Bullet text link"}]}]},{"type":"listItem","attrs":{"color":null},"content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"https://bullet.static.link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":false,"aliasFor":null}},{"type":"underline"}],"text":"Bullet static link"}]}]}]},{"type":"button","attrs":{"text":"Just the button","isTextVariable":false,"url":"","isUrlVariable":false,"alignment":"left","variant":"filled","borderRadius":"smooth","buttonColor":"#000000","textColor":"#ffffff","showIfKey":null,"paddingTop":10,"paddingRight":32,"paddingBottom":10,"paddingLeft":32,"width":"auto","aliasFor":null}},{"type":"button","attrs":{"text":"Button link","isTextVariable":false,"url":"payload.button_link","isUrlVariable":true,"alignment":"left","variant":"filled","borderRadius":"smooth","buttonColor":"#000000","textColor":"#ffffff","showIfKey":null,"paddingTop":10,"paddingRight":32,"paddingBottom":10,"paddingLeft":32,"width":"auto","aliasFor":null}},{"type":"button","attrs":{"text":"Button static link","isTextVariable":false,"url":"https://button.static.link","isUrlVariable":false,"alignment":"left","variant":"filled","borderRadius":"smooth","buttonColor":"#000000","textColor":"#ffffff","showIfKey":null,"paddingTop":10,"paddingRight":32,"paddingBottom":10,"paddingLeft":32,"width":"auto","aliasFor":null}},{"type":"image","attrs":{"src":"https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/header-hero-image.webp","alt":null,"title":null,"width":568,"height":153.79061371841155,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"borderRadius":0,"isSrcVariable":false,"aspectRatio":3.6933333333333334,"lockAspectRatio":true,"showIfKey":null,"aliasFor":null}},{"type":"image","attrs":{"src":"payload.image_variable","alt":null,"title":null,"width":"auto","height":"auto","alignment":"center","externalLink":null,"isExternalLinkVariable":false,"borderRadius":0,"isSrcVariable":true,"aspectRatio":null,"lockAspectRatio":true,"showIfKey":null,"aliasFor":null}},{"type":"image","attrs":{"src":"https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/header-hero-image.webp","alt":null,"title":null,"width":568,"height":153.79061371841155,"alignment":"center","externalLink":"payload.image_link","isExternalLinkVariable":true,"borderRadius":0,"isSrcVariable":false,"aspectRatio":3.6933333333333334,"lockAspectRatio":true,"showIfKey":null,"aliasFor":null}},{"type":"image","attrs":{"src":"https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/header-hero-image.webp","alt":null,"title":null,"width":568,"height":153.79061371841155,"alignment":"center","externalLink":"https://image.static.link","isExternalLinkVariable":false,"borderRadius":0,"isSrcVariable":false,"aspectRatio":3.6933333333333334,"lockAspectRatio":true,"showIfKey":null,"aliasFor":null}},{"type":"horizontalRule"},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"inlineImage","attrs":{"height":20,"width":20,"src":"https://maily.to/brand/logo.png","isSrcVariable":false,"alt":null,"title":null,"externalLink":null,"isExternalLinkVariable":false,"aliasFor":null}}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"inlineImage","attrs":{"height":20,"width":20,"src":"https://maily.to/brand/logo.png","isSrcVariable":false,"alt":null,"title":null,"externalLink":"payload.inline_image_link","isExternalLinkVariable":true,"aliasFor":null}}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"inlineImage","attrs":{"height":20,"width":20,"src":"https://maily.to/brand/logo.png","isSrcVariable":false,"alt":null,"title":null,"externalLink":"https://inline_image.static.link","isExternalLinkVariable":false,"aliasFor":null}}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"inlineImage","attrs":{"height":20,"width":20,"src":"payload.inline_image_url","isSrcVariable":true,"alt":null,"title":null,"externalLink":null,"isExternalLinkVariable":false,"aliasFor":null}}]},{"type":"orderedList","attrs":{"start":1},"content":[{"type":"listItem","attrs":{"color":null},"content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"Just the numbered list"}]}]},{"type":"listItem","attrs":{"color":null},"content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"payload.numbered_link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":true,"aliasFor":null}},{"type":"underline"}],"text":"Numbered text link"}]}]},{"type":"listItem","attrs":{"color":null},"content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"https://numbered.static.link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":false,"aliasFor":null}},{"type":"underline"}],"text":"Numbered static link"}]}]}]}]}',
      subject: 'all email editor components that support links',
    };
    const previewResponse = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: { controlValues, previewPayload: {} },
      stepId: emailStepDatabaseId,
      workflowId,
    });

    // paragraph
    expect(previewResponse.result.result.preview.body).to.contain('Just the paragraph');
    expect(previewResponse.result.result.preview.body).to.contain('Paragraph variable link');
    expect(previewResponse.result.result.preview.body).to.contain('href="paragraph_link"');
    expect(previewResponse.result.result.preview.body).to.contain('Paragraph static link');
    expect(previewResponse.result.result.preview.body).to.contain('href="https://paragraph.static.link"');

    // heading
    expect(previewResponse.result.result.preview.body).to.contain('Just the heading');
    expect(previewResponse.result.result.preview.body).to.contain('Heading text link');
    expect(previewResponse.result.result.preview.body).to.contain('href="heading_link"');
    expect(previewResponse.result.result.preview.body).to.contain('Heading static link');
    expect(previewResponse.result.result.preview.body).to.contain('href="https://heading.static.link"');

    // blockquote
    expect(previewResponse.result.result.preview.body).to.contain('Just the blockquote');
    expect(previewResponse.result.result.preview.body).to.contain('Blockquote text link');
    expect(previewResponse.result.result.preview.body).to.contain('href="blockquote_link"');
    expect(previewResponse.result.result.preview.body).to.contain('Blockquote static link');
    expect(previewResponse.result.result.preview.body).to.contain('href="https://blockquote.static.link"');

    // bullet
    expect(previewResponse.result.result.preview.body).to.contain('Just the bullet');
    expect(previewResponse.result.result.preview.body).to.contain('Bullet text link');
    expect(previewResponse.result.result.preview.body).to.contain('href="bullet_link"');
    expect(previewResponse.result.result.preview.body).to.contain('Bullet static link');
    expect(previewResponse.result.result.preview.body).to.contain('href="https://bullet.static.link"');

    // button
    expect(previewResponse.result.result.preview.body).to.contain('Just the button');
    expect(previewResponse.result.result.preview.body).to.contain('Button link');
    expect(previewResponse.result.result.preview.body).to.contain('href="button_link"');
    expect(previewResponse.result.result.preview.body).to.contain('Button static link');
    expect(previewResponse.result.result.preview.body).to.contain('href="https://button.static.link"');

    // image
    expect(previewResponse.result.result.preview.body).to.contain(
      '<img title="Image" alt="Image" src="https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/header-hero-image.webp"'
    );
    expect(previewResponse.result.result.preview.body).to.contain(
      '<img title="Image" alt="Image" src="image_variable"'
    );
    expect(previewResponse.result.result.preview.body).to.contain(
      '<a href="image_link" rel="noopener noreferrer" style="display:block;max-width:100%;text-decoration:none" target="_blank"><img title="Image" alt="Image" src="https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/header-hero-image.webp"'
    );
    expect(previewResponse.result.result.preview.body).to.contain(
      '<a href="https://image.static.link" rel="noopener noreferrer" style="display:block;max-width:100%;text-decoration:none" target="_blank"><img title="Image" alt="Image" src="https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/header-hero-image.webp"'
    );

    // inline image
    expect(previewResponse.result.result.preview.body).to.contain('<img src="https://maily.to/brand/logo.png"');
    expect(previewResponse.result.result.preview.body).to.contain(
      '<a href="inline_image_link" rel="noopener noreferrer" style="display:inline;text-decoration:none" target="_blank"><img src="https://maily.to/brand/logo.png"'
    );
    expect(previewResponse.result.result.preview.body).to.contain(
      '<a href="https://inline_image.static.link" rel="noopener noreferrer" style="display:inline;text-decoration:none" target="_blank"><img src="https://maily.to/brand/logo.png"'
    );
    expect(previewResponse.result.result.preview.body).to.contain('<img src="inline_image_url"');

    // numbered list
    expect(previewResponse.result.result.preview.body).to.contain('Just the numbered list');
    expect(previewResponse.result.result.preview.body).to.contain('Numbered text link');
    expect(previewResponse.result.result.preview.body).to.contain('numbered_link');
    expect(previewResponse.result.result.preview.body).to.contain('Numbered static link');
    expect(previewResponse.result.result.preview.body).to.contain('https://numbered.static.link');

    // Validate the structure without hardcoded timestamps
    const actualPayload = previewResponse.result.previewPayloadExample;
    expect(actualPayload.subscriber).to.deep.equal({
      firstName: 'John',
      lastName: 'Doe',
      email: 'user@example.com',
      phone: '+1234567890',
      avatar: 'https://example.com/avatar.png',
      locale: 'en-US',
      data: {},
    });
    expect(actualPayload.payload).to.deep.equal({
      paragraph_link: 'paragraph_link',
      heading_link: 'heading_link',
      blockquote_link: 'blockquote_link',
      bullet_link: 'bullet_link',
      button_link: 'button_link',
      image_variable: 'image_variable',
      image_link: 'image_link',
      inline_image_link: 'inline_image_link',
      inline_image_url: 'inline_image_url',
      numbered_link: 'numbered_link',
    });

    // Validate digest step structure without hardcoded timestamps
    expect(actualPayload.steps).to.exist;
    expect(actualPayload.steps).to.have.property('digest-step');
    expect(actualPayload.steps!['digest-step']).to.have.property('eventCount', 3);
    expect(actualPayload.steps!['digest-step']).to.have.property('events');
    expect(actualPayload.steps!['digest-step'].events).to.have.length(3);

    // Validate each event has the required structure without checking exact timestamps
    actualPayload.steps!['digest-step'].events.forEach((event, index) => {
      expect(event).to.have.property('id', `example-id-${index + 1}`);
      expect(event).to.have.property('time').that.is.a('string');
      expect(event).to.have.property('payload').that.deep.equals({});
      // Validate that time is a valid ISO string
      expect(new Date(event.time)).to.be.a('date');
    });

    const previewResponse2 = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: {
        controlValues,
        previewPayload: {
          payload: {
            paragraph_link: 'https://paragraph_link.com',
            heading_link: 'https://heading_link.com',
            blockquote_link: 'https://blockquote_link.com',
            bullet_link: 'https://bullet_link.com',
            button_link: 'https://button_link.com',
            image_variable: 'https://image_variable.com',
            image_link: 'https://image_link.com',
            inline_image_link: 'https://inline_image_link.com',
            inline_image_url: 'https://inline_image_url.com',
            numbered_link: 'https://numbered_link.com',
          },
        },
      },
      stepId: emailStepDatabaseId,
      workflowId,
    });

    expect(previewResponse2.result.result.preview.body).to.contain('href="https://paragraph_link.com"');
    expect(previewResponse2.result.result.preview.body).to.contain('href="https://heading_link.com"');
    expect(previewResponse2.result.result.preview.body).to.contain('href="https://blockquote_link.com"');
    expect(previewResponse2.result.result.preview.body).to.contain('href="https://bullet_link.com"');
    expect(previewResponse2.result.result.preview.body).to.contain('href="https://button_link.com"');
    expect(previewResponse2.result.result.preview.body).to.contain('src="https://image_variable.com"');
    expect(previewResponse2.result.result.preview.body).to.contain('href="https://image_link.com"');
    expect(previewResponse2.result.result.preview.body).to.contain('href="https://inline_image_link.com"');
    expect(previewResponse2.result.result.preview.body).to.contain('src="https://inline_image_url.com"');
    expect(previewResponse2.result.result.preview.body).to.contain('href="https://numbered_link.com"');
  });

  it('should allow using the static text, variables, current alias, as a link on the email editor components inside the repeat block', async () => {
    const { workflowId, emailStepDatabaseId } = await createWorkflowWithEmailLookingAtDigestResult();

    const controlValues = {
      body: '{"type":"doc","content":[{"type":"repeat","attrs":{"each":"payload.items","isUpdatingKey":false,"showIfKey":null,"iterations":0},"content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"Just the paragraph"}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"payload.items.paragraph_link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":true,"aliasFor":null}},{"type":"underline"}],"text":"Paragraph variable link"}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"current.paragraph_link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":true,"aliasFor":"payload.items.paragraph_link"}},{"type":"underline"}],"text":"Paragraph current variable link"}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"https://paragraph.static.link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":false,"aliasFor":null}},{"type":"underline"}],"text":"Paragraph static link"}]},{"type":"heading","attrs":{"textAlign":null,"level":1,"showIfKey":null},"content":[{"type":"text","text":"Just the heading"}]},{"type":"heading","attrs":{"textAlign":null,"level":1,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"payload.items.heading_link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":true,"aliasFor":null}},{"type":"underline"}],"text":"Heading variable link"}]},{"type":"heading","attrs":{"textAlign":null,"level":1,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"current.heading_link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":true,"aliasFor":"payload.items.heading_link"}},{"type":"underline"}],"text":"Heading current variable link"}]},{"type":"heading","attrs":{"textAlign":null,"level":1,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"https://heading.static.link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":false,"aliasFor":null}},{"type":"underline"}],"text":"Heading static link"}]},{"type":"blockquote","content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"Just the blockquote"}]}]},{"type":"blockquote","content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"payload.items.blockquote_link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":true,"aliasFor":null}},{"type":"underline"}],"text":"Blockquote variable link"}]}]},{"type":"blockquote","content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"current.blockquote_link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":true,"aliasFor":"payload.items.blockquote_link"}},{"type":"underline"}],"text":"Blockquote current variable link"}]}]},{"type":"blockquote","content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"https://blockquote.static.link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":false,"aliasFor":null}},{"type":"underline"}],"text":"Blockquote static link"}]}]},{"type":"bulletList","content":[{"type":"listItem","attrs":{"color":""},"content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"Just the bullet"}]}]},{"type":"listItem","attrs":{"color":""},"content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"payload.items.bullet_link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":true,"aliasFor":null}},{"type":"underline"}],"text":"Bullet variable link"}]}]},{"type":"listItem","attrs":{"color":""},"content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"current.bullet_link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":true,"aliasFor":"payload.items.bullet_link"}},{"type":"underline"}],"text":"Bullet current variable link"}]}]},{"type":"listItem","attrs":{"color":""},"content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"https://bullet.static.link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":false,"aliasFor":null}},{"type":"underline"}],"text":"Bullet static link"}]}]}]},{"type":"button","attrs":{"text":"Just the button","isTextVariable":false,"url":"","isUrlVariable":false,"alignment":"left","variant":"filled","borderRadius":"smooth","buttonColor":"#000000","textColor":"#ffffff","showIfKey":null,"paddingTop":10,"paddingRight":32,"paddingBottom":10,"paddingLeft":32,"width":"auto","aliasFor":null}},{"type":"button","attrs":{"text":"Button variable link","isTextVariable":false,"url":"payload.items.button_link","isUrlVariable":true,"alignment":"left","variant":"filled","borderRadius":"smooth","buttonColor":"#000000","textColor":"#ffffff","showIfKey":null,"paddingTop":10,"paddingRight":32,"paddingBottom":10,"paddingLeft":32,"width":"auto","aliasFor":null}},{"type":"button","attrs":{"text":"Button current variable link","isTextVariable":false,"url":"current.button_link","isUrlVariable":true,"alignment":"left","variant":"filled","borderRadius":"smooth","buttonColor":"#000000","textColor":"#ffffff","showIfKey":null,"paddingTop":10,"paddingRight":32,"paddingBottom":10,"paddingLeft":32,"width":"auto","aliasFor":"payload.items.button_link"}},{"type":"button","attrs":{"text":"Button static link","isTextVariable":false,"url":"https://button.static.link","isUrlVariable":false,"alignment":"left","variant":"filled","borderRadius":"smooth","buttonColor":"#000000","textColor":"#ffffff","showIfKey":null,"paddingTop":10,"paddingRight":32,"paddingBottom":10,"paddingLeft":32,"width":"auto","aliasFor":null}},{"type":"horizontalRule"},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"Just the image"}]},{"type":"image","attrs":{"src":"https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/header-hero-image.webp","alt":null,"title":null,"width":566,"height":153.24909747292418,"alignment":"center","externalLink":null,"isExternalLinkVariable":false,"borderRadius":0,"isSrcVariable":false,"aspectRatio":3.6933333333333334,"lockAspectRatio":true,"showIfKey":null,"aliasFor":null}},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"Image variable"}]},{"type":"image","attrs":{"src":"payload.items.image","alt":null,"title":null,"width":"auto","height":"auto","alignment":"center","externalLink":null,"isExternalLinkVariable":false,"borderRadius":0,"isSrcVariable":true,"aspectRatio":null,"lockAspectRatio":true,"showIfKey":null,"aliasFor":null}},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"Image current variable"}]},{"type":"image","attrs":{"src":"current.image","alt":null,"title":null,"width":"auto","height":"auto","alignment":"center","externalLink":null,"isExternalLinkVariable":false,"borderRadius":0,"isSrcVariable":true,"aspectRatio":null,"lockAspectRatio":true,"showIfKey":null,"aliasFor":"payload.items.image"}},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"Image link variable"}]},{"type":"image","attrs":{"src":"https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/header-hero-image.webp","alt":null,"title":null,"width":566,"height":153.24909747292418,"alignment":"center","externalLink":"payload.items.image_link","isExternalLinkVariable":true,"borderRadius":0,"isSrcVariable":false,"aspectRatio":3.6933333333333334,"lockAspectRatio":true,"showIfKey":null,"aliasFor":null}},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"Image current link variable"}]},{"type":"image","attrs":{"src":"https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/header-hero-image.webp","alt":null,"title":null,"width":566,"height":153.24909747292418,"alignment":"center","externalLink":"current.image_link","isExternalLinkVariable":true,"borderRadius":0,"isSrcVariable":false,"aspectRatio":3.6933333333333334,"lockAspectRatio":true,"showIfKey":null,"aliasFor":"payload.items.image_link"}},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"Image static link"}]},{"type":"image","attrs":{"src":"https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/header-hero-image.webp","alt":null,"title":null,"width":566,"height":153.24909747292418,"alignment":"center","externalLink":"https://image.static.link","isExternalLinkVariable":false,"borderRadius":0,"isSrcVariable":false,"aspectRatio":3.6933333333333334,"lockAspectRatio":true,"showIfKey":null,"aliasFor":null}},{"type":"horizontalRule"},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"Inline image"}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"inlineImage","attrs":{"height":20,"width":20,"src":"https://maily.to/brand/logo.png","isSrcVariable":false,"alt":null,"title":null,"externalLink":null,"isExternalLinkVariable":false,"aliasFor":null}}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"Inline image variable"}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"inlineImage","attrs":{"height":20,"width":20,"src":"payload.items.inline_image","isSrcVariable":true,"alt":null,"title":null,"externalLink":null,"isExternalLinkVariable":false,"aliasFor":null}}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"Inline image current variable"}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"inlineImage","attrs":{"height":20,"width":20,"src":"current.inline_image","isSrcVariable":true,"alt":null,"title":null,"externalLink":null,"isExternalLinkVariable":false,"aliasFor":"payload.items.inline_image"}}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"Inline image link variable"}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"inlineImage","attrs":{"height":20,"width":20,"src":"https://maily.to/brand/logo.png","isSrcVariable":false,"alt":null,"title":null,"externalLink":"payload.items.inline_image_link","isExternalLinkVariable":true,"aliasFor":null}}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"Inline image current link variable"}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"inlineImage","attrs":{"height":20,"width":20,"src":"https://maily.to/brand/logo.png","isSrcVariable":false,"alt":null,"title":null,"externalLink":"current.inline_image_link","isExternalLinkVariable":true,"aliasFor":"payload.items.inline_image_link"}}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"Inline image static link"}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"inlineImage","attrs":{"height":20,"width":20,"src":"https://maily.to/brand/logo.png","isSrcVariable":false,"alt":null,"title":null,"externalLink":"https://inline_image.static.link","isExternalLinkVariable":false,"aliasFor":null}}]},{"type":"horizontalRule"},{"type":"orderedList","attrs":{"start":1},"content":[{"type":"listItem","attrs":{"color":null},"content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"Just the numbered list"}]}]},{"type":"listItem","attrs":{"color":null},"content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"payload.items.numbered_link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":true,"aliasFor":null}},{"type":"underline"}],"text":"Numbered variable link"}]}]},{"type":"listItem","attrs":{"color":null},"content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"current.numbered_link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":true,"aliasFor":"payload.items.numbered_link"}},{"type":"underline"}],"text":"Numbered current variable link"}]}]},{"type":"listItem","attrs":{"color":null},"content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","marks":[{"type":"link","attrs":{"href":"https://numbered.static.link","target":"_blank","rel":"noopener noreferrer nofollow","class":null,"isUrlVariable":false,"aliasFor":null}},{"type":"underline"}],"text":"Numbered static link"}]}]}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null}}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null}}]}',
      subject: 'all email editor components that support links inside the repeat block',
    };
    const previewResponse = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: { controlValues, previewPayload: {} },
      stepId: emailStepDatabaseId,
      workflowId,
    });

    const countOccurrences = (str: string, searchStr: string) => (str.match(new RegExp(searchStr, 'g')) || []).length;

    // paragraph
    expect(previewResponse.result.result.preview.body).to.contain('Just the paragraph');
    expect(previewResponse.result.result.preview.body).to.contain('Paragraph variable link');
    expect(previewResponse.result.result.preview.body).to.contain('Paragraph current variable link');
    expect(countOccurrences(previewResponse.result.result.preview.body, 'href="paragraph_link"')).to.equal(
      DEFAULT_ARRAY_ELEMENTS * 2
    );
    expect(previewResponse.result.result.preview.body).to.contain('Paragraph static link');
    expect(previewResponse.result.result.preview.body).to.contain('href="https://paragraph.static.link"');

    // heading
    expect(previewResponse.result.result.preview.body).to.contain('Just the heading');
    expect(previewResponse.result.result.preview.body).to.contain('Heading variable link');
    expect(previewResponse.result.result.preview.body).to.contain('Heading current variable link');
    expect(countOccurrences(previewResponse.result.result.preview.body, 'href="heading_link"')).to.equal(
      DEFAULT_ARRAY_ELEMENTS * 2
    );
    expect(previewResponse.result.result.preview.body).to.contain('Heading static link');
    expect(previewResponse.result.result.preview.body).to.contain('href="https://heading.static.link"');

    // blockquote
    expect(previewResponse.result.result.preview.body).to.contain('Just the blockquote');
    expect(previewResponse.result.result.preview.body).to.contain('Blockquote variable link');
    expect(previewResponse.result.result.preview.body).to.contain('Blockquote current variable link');
    expect(countOccurrences(previewResponse.result.result.preview.body, 'href="blockquote_link"')).to.equal(
      DEFAULT_ARRAY_ELEMENTS * 2
    );
    expect(previewResponse.result.result.preview.body).to.contain('Blockquote static link');
    expect(previewResponse.result.result.preview.body).to.contain('href="https://blockquote.static.link"');

    // bullet
    expect(previewResponse.result.result.preview.body).to.contain('Just the bullet');
    expect(previewResponse.result.result.preview.body).to.contain('Bullet variable link');
    expect(previewResponse.result.result.preview.body).to.contain('Bullet current variable link');
    expect(countOccurrences(previewResponse.result.result.preview.body, 'href="bullet_link"')).to.equal(
      DEFAULT_ARRAY_ELEMENTS * 2
    );
    expect(previewResponse.result.result.preview.body).to.contain('Bullet static link');
    expect(previewResponse.result.result.preview.body).to.contain('href="https://bullet.static.link"');

    // button
    expect(previewResponse.result.result.preview.body).to.contain('Just the button');
    expect(previewResponse.result.result.preview.body).to.contain('Button variable link');
    expect(previewResponse.result.result.preview.body).to.contain('Button current variable link');
    expect(countOccurrences(previewResponse.result.result.preview.body, 'href="button_link"')).to.equal(
      DEFAULT_ARRAY_ELEMENTS * 2
    );
    expect(previewResponse.result.result.preview.body).to.contain('Button static link');
    expect(previewResponse.result.result.preview.body).to.contain('href="https://button.static.link"');

    // image
    expect(previewResponse.result.result.preview.body).to.contain(
      '<img title="Image" alt="Image" src="https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/header-hero-image.webp"'
    );
    // image current and payload variables should result in same components
    expect(
      countOccurrences(previewResponse.result.result.preview.body, '<img title="Image" alt="Image" src="image"')
    ).to.equal(DEFAULT_ARRAY_ELEMENTS * 2);
    expect(
      countOccurrences(
        previewResponse.result.result.preview.body,
        '<a href="image_link" rel="noopener noreferrer" style="display:block;max-width:100%;text-decoration:none" target="_blank"><img title="Image" alt="Image" src="https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/header-hero-image.webp"'
      )
    ).to.equal(DEFAULT_ARRAY_ELEMENTS * 2);
    expect(previewResponse.result.result.preview.body).to.contain(
      '<a href="https://image.static.link" rel="noopener noreferrer" style="display:block;max-width:100%;text-decoration:none" target="_blank"><img title="Image" alt="Image" src="https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/header-hero-image.webp"'
    );

    // inline image
    expect(previewResponse.result.result.preview.body).to.contain('<img src="https://maily.to/brand/logo.png"');
    expect(countOccurrences(previewResponse.result.result.preview.body, '<img src="inline_image"')).to.equal(
      DEFAULT_ARRAY_ELEMENTS * 2
    );
    expect(
      countOccurrences(
        previewResponse.result.result.preview.body,
        '<a href="inline_image_link" rel="noopener noreferrer" style="display:inline;text-decoration:none" target="_blank"><img src="https://maily.to/brand/logo.png"'
      )
    ).to.equal(DEFAULT_ARRAY_ELEMENTS * 2);
    expect(previewResponse.result.result.preview.body).to.contain(
      '<a href="https://inline_image.static.link" rel="noopener noreferrer" style="display:inline;text-decoration:none" target="_blank"><img src="https://maily.to/brand/logo.png"'
    );

    // numbered list
    expect(previewResponse.result.result.preview.body).to.contain('Just the numbered list');
    expect(previewResponse.result.result.preview.body).to.contain('Numbered variable link');
    expect(previewResponse.result.result.preview.body).to.contain('Numbered current variable link');
    expect(countOccurrences(previewResponse.result.result.preview.body, 'href="numbered_link"')).to.equal(
      DEFAULT_ARRAY_ELEMENTS * 2
    );
    expect(previewResponse.result.result.preview.body).to.contain('Numbered static link');
    expect(previewResponse.result.result.preview.body).to.contain('href="https://numbered.static.link"');

    // Validate the structure without hardcoded timestamps
    const actualPayload = previewResponse.result.previewPayloadExample;
    expect(actualPayload.subscriber).to.deep.equal({
      firstName: 'John',
      lastName: 'Doe',
      email: 'user@example.com',
      phone: '+1234567890',
      avatar: 'https://example.com/avatar.png',
      locale: 'en-US',
      data: {},
    });
    expect(actualPayload.payload).to.deep.equal({
      items: Array(DEFAULT_ARRAY_ELEMENTS).fill({
        paragraph_link: 'paragraph_link',
        heading_link: 'heading_link',
        blockquote_link: 'blockquote_link',
        bullet_link: 'bullet_link',
        button_link: 'button_link',
        image: 'image',
        image_link: 'image_link',
        inline_image: 'inline_image',
        inline_image_link: 'inline_image_link',
        numbered_link: 'numbered_link',
      }),
    });

    // Validate digest step structure without hardcoded timestamps
    expect(actualPayload.steps).to.exist;
    expect(actualPayload.steps).to.have.property('digest-step');
    expect(actualPayload.steps!['digest-step']).to.have.property('eventCount', 3);
    expect(actualPayload.steps!['digest-step']).to.have.property('events');
    expect(actualPayload.steps!['digest-step'].events).to.have.length(3);

    // Validate each event has the required structure without checking exact timestamps
    actualPayload.steps!['digest-step'].events.forEach((event, index) => {
      expect(event).to.have.property('id', `example-id-${index + 1}`);
      expect(event).to.have.property('time').that.is.a('string');
      expect(event).to.have.property('payload').that.deep.equals({});
      // Validate that time is a valid ISO string
      expect(new Date(event.time)).to.be.a('date');
    });

    const previewResponse2 = await novuClient.workflows.steps.generatePreview({
      generatePreviewRequestDto: {
        controlValues,
        previewPayload: {
          payload: {
            items: Array(DEFAULT_ARRAY_ELEMENTS).fill({
              paragraph_link: 'https://paragraph_link.com',
              heading_link: 'https://heading_link.com',
              blockquote_link: 'https://blockquote_link.com',
              bullet_link: 'https://bullet_link.com',
              button_link: 'https://button_link.com',
              image: 'https://image.com',
              image_link: 'https://image_link.com',
              inline_image: 'https://inline_image.com',
              inline_image_link: 'https://inline_image_link.com',
              numbered_link: 'https://numbered_link.com',
            }),
          },
        },
      },
      stepId: emailStepDatabaseId,
      workflowId,
    });

    expect(countOccurrences(previewResponse2.result.result.preview.body, 'href="https://paragraph_link.com"')).to.equal(
      DEFAULT_ARRAY_ELEMENTS * 2
    );
    expect(countOccurrences(previewResponse2.result.result.preview.body, 'href="https://heading_link.com"')).to.equal(
      DEFAULT_ARRAY_ELEMENTS * 2
    );
    expect(
      countOccurrences(previewResponse2.result.result.preview.body, 'href="https://blockquote_link.com"')
    ).to.equal(DEFAULT_ARRAY_ELEMENTS * 2);
    expect(countOccurrences(previewResponse2.result.result.preview.body, 'href="https://bullet_link.com"')).to.equal(
      DEFAULT_ARRAY_ELEMENTS * 2
    );
    expect(countOccurrences(previewResponse2.result.result.preview.body, 'href="https://button_link.com"')).to.equal(
      DEFAULT_ARRAY_ELEMENTS * 2
    );
    expect(countOccurrences(previewResponse2.result.result.preview.body, 'src="https://image.com"')).to.equal(
      DEFAULT_ARRAY_ELEMENTS * 2
    );
    expect(countOccurrences(previewResponse2.result.result.preview.body, 'href="https://image_link.com"')).to.equal(
      DEFAULT_ARRAY_ELEMENTS * 2
    );
    expect(countOccurrences(previewResponse2.result.result.preview.body, 'src="https://inline_image.com"')).to.equal(
      DEFAULT_ARRAY_ELEMENTS * 2
    );
    expect(
      countOccurrences(previewResponse2.result.result.preview.body, 'href="https://inline_image_link.com"')
    ).to.equal(DEFAULT_ARRAY_ELEMENTS * 2);
    expect(countOccurrences(previewResponse2.result.result.preview.body, 'href="https://numbered_link.com"')).to.equal(
      DEFAULT_ARRAY_ELEMENTS * 2
    );
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
        expect(previewResponseDto.result!.preview.body).to.contain(`[[true]]`);
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
      'John Hello, World! this is the replacement text for the placeholder'
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
        subject: 'John Hello, World! subject',
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

      expect(previewResponseDto.result!.preview).to.deep.equal({ body: ' Hello, World! John' });
    });

    it('push: should match the body in the preview response', async () => {
      const previewResponseDto = await createWorkflowAndPreview(StepTypeEnum.Push, 'Push');

      expect(previewResponseDto.result!.preview).to.exist;
      expect(previewResponseDto.previewPayloadExample).to.exist;
      expect(previewResponseDto.previewPayloadExample.subscriber, 'Expecting to find subscriber in the payload').to
        .exist;

      expect(previewResponseDto.result!.preview).to.deep.equal({
        subject: 'Hello, World!',
        body: 'Hello, World! John',
      });
    });

    it('chat: should match the body in the preview response', async () => {
      const previewResponseDto = await createWorkflowAndPreview(StepTypeEnum.Chat, 'Chat');

      expect(previewResponseDto.result!.preview).to.exist;
      expect(previewResponseDto.previewPayloadExample).to.exist;
      expect(previewResponseDto.previewPayloadExample.subscriber, 'Expecting to find subscriber in the payload').to
        .exist;

      expect(previewResponseDto.result!.preview).to.deep.equal({ body: 'Hello, World! John' });
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
            target: RedirectTargetEnum.BLANK,
          },
        },
        secondaryAction: null,
        redirect: {
          target: RedirectTargetEnum.BLANK,
          url: '   ',
        },
      };
      const workflowSlug = novuRestResult.result?.slug;
      const stepSlug = novuRestResult.result?.steps[0].slug;
      const stepDataDto = await updateWorkflow(workflowSlug, {
        ...mapResponseToUpdateDto(novuRestResult.result),
        steps: [
          {
            type: novuRestResult.result.steps[0].type,
            name: novuRestResult.result.steps[0].name,
            id: novuRestResult.result.steps[0].id,
            ...buildInAppControlValueWithAPlaceholderInTheUrl(),
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

    it('should merge the user provided payload with the BE generated payload', async () => {
      const { workflowId, emailStepDatabaseId } = await createWorkflowWithEmailLookingAtDigestResult();

      // Helper function to validate digest event structure (reused from above)
      const validateDigestEventsInMergeTest = (events: any[], expectedPayload: any) => {
        expect(events).to.have.length(DEFAULT_ARRAY_ELEMENTS);
        events.forEach((event, index) => {
          expect(event).to.have.property('id').that.is.a('string');
          expect(event).to.have.property('time').that.is.a('string');
          expect(event).to.have.property('payload').that.deep.equals(expectedPayload);
          // Validate that IDs are unique and follow the pattern
          expect(event.id).to.equal(`example-id-${index + 1}`);
          // Validate that times are ISO strings and incrementing
          expect(new Date(event.time)).to.be.a('date');
        });
      };

      // testing the default preview payload is generated when no user payload is provided
      const controlValues1 = {
        body: '{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":"events length "},{"type":"variable","attrs":{"id":"steps.digest-step.events.length","label":null,"fallback":null,"required":false,"aliasFor":null}},{"type":"text","text":" "}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"text","text":" "}]}]}',
        subject: 'events length',
      };
      const previewResponse1 = await novuClient.workflows.steps.generatePreview({
        generatePreviewRequestDto: { controlValues: controlValues1, previewPayload: {} },
        stepId: emailStepDatabaseId,
        workflowId,
      });

      validateDigestEventsInMergeTest(previewResponse1.result.previewPayloadExample.steps?.['digest-step'].events, {});

      // testing that the final payload has the events with payload.name
      const controlValues2 = {
        body: `{"type": "doc","content": [{"type": "paragraph","attrs": { "textAlign": null, "showIfKey": null },"content": [{"type": "variable","attrs": {"id": "steps.digest-step.events | toSentence: 'payload.name', 2, 'other'","label": null,"fallback": null,"required": false,"aliasFor": null}},{ "type": "text", "text": " " }]}]}`,
        subject: 'events length',
      };
      const previewResponse2 = await novuClient.workflows.steps.generatePreview({
        generatePreviewRequestDto: {
          controlValues: controlValues2,
          previewPayload: {
            steps: {
              'digest-step': {
                events: Array.from({ length: DEFAULT_ARRAY_ELEMENTS }, (_, index) => ({
                  id: `example-id-${index + 1}`,
                  time: `2025-06-07T09:0${index}:00.000Z`,
                  payload: {},
                })),
              },
            },
          },
        },
        stepId: emailStepDatabaseId,
        workflowId,
      });

      validateDigestEventsInMergeTest(previewResponse2.result.previewPayloadExample.steps?.['digest-step'].events, {});

      // testing that the final payload doesn't change the user input
      const editedPayloadName = {
        steps: {
          'digest-step': {
            events: [
              {
                id: '1',
                time: '1234',
                payload: {
                  name: 'hello',
                },
              },
              {
                id: '12',
                time: '32',
                payload: {
                  name: 'name',
                },
              },
              {
                id: '123',
                time: '123123122',
                payload: {
                  name: 'name',
                },
              },
            ],
          },
        },
      };
      const previewResponse3 = await novuClient.workflows.steps.generatePreview({
        generatePreviewRequestDto: {
          controlValues: controlValues2,
          previewPayload: editedPayloadName,
        },
        stepId: emailStepDatabaseId,
        workflowId,
      });

      // The system should add id and time to user-provided events
      const actualEvents = previewResponse3.result.previewPayloadExample.steps?.['digest-step'].events;
      expect(actualEvents).to.have.length(3);
      actualEvents.forEach((event) => {
        expect(event).to.have.property('id').that.is.a('string');
        expect(event).to.have.property('time').that.is.a('string');
        expect(event).to.have.property('payload');
      });
      expect(actualEvents[0].payload).to.deep.equal({ name: 'hello' });
      expect(actualEvents[1].payload).to.deep.equal({ name: 'name' });
      expect(actualEvents[2].payload).to.deep.equal({ name: 'name' });
      expect(previewResponse3.result.result.preview.body).to.contain('hello, name, and 1 other');

      // testing that the final payload has the same amount of events as the user input, persists the user input and also merges the missing keys
      const controlValues3 = {
        body: `{"type": "doc","content":[{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"variable","attrs":{"id":"steps.digest-step.events|toSentence:'payload.name',2,'other'","label":null,"fallback":null,"required":false,"aliasFor":null}},{"type":"text","text":""}]},{"type":"paragraph","attrs":{"textAlign":null,"showIfKey":null},"content":[{"type":"variable","attrs":{"id":"steps.digest-step.events|toSentence:'payload.new',2,'other'","label":null,"fallback":null,"required":false,"aliasFor":null}},{"type":"text","text":""}]}]}`,
        subject: 'events length',
      };
      const payloadWithExtraItemInTheArray = {
        steps: {
          'digest-step': {
            events: [
              {
                id: '1',
                time: '12312312312',
                payload: {
                  name: 'hello',
                },
              },
              {
                id: '2',
                time: '12312312312',
                payload: {
                  name: 'name',
                },
              },
              {
                id: '3',
                time: '12312312312',
                payload: {
                  name: 'name',
                },
              },
              {
                id: '4',
                time: '12312312312',
                payload: {
                  name: 'extra name',
                },
              },
            ],
          },
        },
      };

      const previewResponse4 = await novuClient.workflows.steps.generatePreview({
        generatePreviewRequestDto: {
          controlValues: controlValues3,
          previewPayload: payloadWithExtraItemInTheArray,
        },
        stepId: emailStepDatabaseId,
        workflowId,
      });

      // The system should add id and time to user-provided events and merge missing keys
      const actualEvents4 = previewResponse4.result.previewPayloadExample.steps?.['digest-step'].events;
      expect(actualEvents4).to.have.length(4);
      actualEvents4.forEach((event) => {
        expect(event).to.have.property('id').that.is.a('string');
        expect(event).to.have.property('time').that.is.a('string');
        expect(event).to.have.property('payload');
      });
      expect(actualEvents4[0].payload.name).to.equal('hello');
      expect(actualEvents4[1].payload.name).to.equal('name');
      expect(actualEvents4[2].payload.name).to.equal('name');
      expect(actualEvents4[3].payload.name).to.equal('extra name');
      expect(previewResponse4.result.result.preview.body).to.contain('hello, name, and 2 others');

      // testing that the final payload persists the user input even if the events array is empty
      const payloadWithEmptyArray = {
        steps: {
          'digest-step': {
            eventCount: 0,
            events: [],
          },
        },
        subscriber: {
          avatar: 'https://example.com/avatar.png',
          data: {},
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          locale: 'en-US',
          phone: '+1234567890',
        },
      };
      const previewResponse5 = await novuClient.workflows.steps.generatePreview({
        generatePreviewRequestDto: {
          controlValues: controlValues3,
          previewPayload: payloadWithEmptyArray,
        },
        stepId: emailStepDatabaseId,
        workflowId,
      });
      expect(previewResponse5.result.previewPayloadExample).to.deep.equal(payloadWithEmptyArray);

      // testing that the final payload persists the user input even if the events array has one item
      const payloadWithOneItemInTheArray = {
        steps: {
          'digest-step': {
            events: [{ id: '1', time: '1234', payload: {} }],
          },
        },
      };
      const previewResponse6 = await novuClient.workflows.steps.generatePreview({
        generatePreviewRequestDto: {
          controlValues: controlValues3,
          previewPayload: payloadWithOneItemInTheArray,
        },
        stepId: emailStepDatabaseId,
        workflowId,
      });
      const actualEvents6 = previewResponse6.result.previewPayloadExample.steps?.['digest-step'].events;
      expect(actualEvents6).to.have.length(1);
      expect(actualEvents6[0]).to.have.property('id').that.is.a('string');
      expect(actualEvents6[0]).to.have.property('time').that.is.a('string');
      expect(actualEvents6[0]).to.have.property('payload');
    });
  });

  describe('Missing Required ControlValues', () => {
    const channelTypes = [{ type: StepTypeEnum.InApp, description: 'InApp' }];

    channelTypes.forEach(({ type }) => {
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

  function mapResponseToUpdateDto(workflowResponse: WorkflowResponseDto): UpdateWorkflowDto {
    return {
      ...workflowResponse,
      steps: workflowResponse.steps.map(
        (step) =>
          ({
            id: step.id,
            type: step.type,
            name: step.name,
            controlValues: step.controls?.values || {},
          }) as UpdateWorkflowDtoSteps
      ),
    };
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
          controlValues: {
            amount: 1,
            unit: 'hours',
          },
        },
        {
          name: 'Email Test Step',
          type: StepTypeEnum.Email,
          controlValues: {
            subject: 'Test Email Subject',
            body: 'Test Email Body',
            disableOutputSanitization: false,
          },
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
          controlValues: {
            subject: 'Test Subject',
            body: 'Test Body',
          },
        },
        {
          name: 'SmsStep',
          type: StepTypeEnum.Sms,
          controlValues: {
            body: 'Test SMS Body',
          },
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
          controlValues: {
            subject: 'Test Subject',
            body: 'Test Body',
          },
        },
        {
          name: 'Email Test Step',
          type: StepTypeEnum.Email,
          controlValues: {
            subject: 'Test Email Subject',
            body: 'Test Email Body',
          },
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
    disableOutputSanitization: false,
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
  [StepTypeEnum.Sms]: buildSmsControlValuesPayload(stepId),
  [StepTypeEnum.Email]: buildEmailControlValuesPayload(),
  [StepTypeEnum.Push]: buildPushControlValuesPayload(),
  [StepTypeEnum.Chat]: buildChatControlValuesPayload(),
  [StepTypeEnum.InApp]: buildInAppControlValues(),
  [StepTypeEnum.Digest]: buildDigestControlValuesPayload(),
});

export async function createWorkflowAndReturnId(workflowsClient: Novu, type: StepTypeEnum) {
  const createWorkflowDto = buildWorkflow();
  createWorkflowDto.steps[0].type = type as any;
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
