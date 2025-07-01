import axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';
import getPort from 'get-port';

import { SubscribersService, UserSession } from '@novu/testing';
import {
  ExecutionDetailsRepository,
  JobRepository,
  MessageRepository,
  NotificationTemplateRepository,
  SubscriberEntity,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  CreateWorkflowDto,
  ExecutionDetailsStatusEnum,
  JobStatusEnum,
  MessagesStatusEnum,
  StepTypeEnum,
  WorkflowCreationSourceEnum,
  WorkflowResponseDto,
} from '@novu/shared';
import { workflow } from '@novu/framework';

import { DetailEnum } from '@novu/application-generic';
import { TestBridgeServer } from '../../../../e2e/test-bridge-server';

const eventTriggerPath = '/v1/events/trigger';

type Context = { name: string; isStateful: boolean };
const contexts: Context[] = [
  { name: 'stateful', isStateful: true },
  { name: 'stateless', isStateful: false },
];

contexts.forEach((context: Context) => {
  describe('Self-Hosted Bridge Trigger #novu-v2', async function () {
    let session: UserSession;
    let bridgeServer: TestBridgeServer;
    const messageRepository = new MessageRepository();
    const workflowsRepository = new NotificationTemplateRepository();
    const jobRepository = new JobRepository();
    let subscriber: SubscriberEntity;
    let subscriberService: SubscribersService;
    const executionDetailsRepository = new ExecutionDetailsRepository();
    let bridge;

    beforeEach(async () => {
      const port = await getPort();
      bridgeServer = new TestBridgeServer(port);
      bridge = context.isStateful ? undefined : { url: `${bridgeServer.serverPath}/novu` };
      session = new UserSession();
      await session.initialize();
      subscriberService = new SubscribersService(session.organization._id, session.environment._id);
      subscriber = await subscriberService.createSubscriber({ _id: session.subscriberId });
    });

    afterEach(async () => {
      await bridgeServer.stop();
    });

    it(`should trigger the bridge workflow with sync [${context.name}]`, async function () {
      const workflowId = `hello-world-${`${context.name}`}`;
      const newWorkflow = workflow(
        workflowId,
        async ({ step, payload }) => {
          await step.email(
            'send-email',
            async (controls) => {
              return {
                subject: `This is an email subject ${controls.name}`,
                body: `Body result ${payload.name}`,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  name: { type: 'string', default: 'TEST' },
                },
              } as const,
            }
          );

          await step.inApp(
            'send-in-app',
            async (controls) => {
              return {
                body: `in-app result ${payload.name}`,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  name: { type: 'string', default: 'TEST' },
                },
              } as const,
            }
          );

          await step.sms(
            'send-sms',
            async (controls) => {
              return {
                body: `sms result ${payload.name}`,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  name: { type: 'string', default: 'TEST' },
                },
              } as const,
            }
          );
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', default: 'default_name' },
            },
            required: [],
            additionalProperties: false,
          } as const,
        }
      );

      await bridgeServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);

        const foundWorkflow = await workflowsRepository.findByTriggerIdentifier(session.environment._id, workflowId);
        expect(foundWorkflow).to.be.ok;

        if (!foundWorkflow) {
          throw new Error('Workflow not found');
        }
      }

      await bridgeServer.start({ workflows: [newWorkflow] });
      await triggerEvent(session, workflowId, subscriber.subscriberId, { name: 'test_name' }, bridge);
      await session.waitForJobCompletion();

      const messages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: { $in: [StepTypeEnum.EMAIL, StepTypeEnum.IN_APP, StepTypeEnum.SMS] },
      });

      expect(messages.length).to.be.eq(3);
      const emailMessage = messages.find((message) => message.channel === ChannelTypeEnum.EMAIL);
      expect(emailMessage?.subject).to.include('This is an email subject TEST');
      const inAppMessage = messages.find((message) => message.channel === ChannelTypeEnum.IN_APP);
      expect(inAppMessage?.content).to.include('in-app result test_name');
      const smsMessage = messages.find((message) => message.channel === ChannelTypeEnum.SMS);
      expect(smsMessage?.content).to.include('sms result test_name');
    });

    it(`should skip by static value [${context.name}]`, async () => {
      const workflowIdSkipByStatic = `skip-by-static-value-workflow-${`${context.name}`}`;
      const newWorkflow = workflow(
        workflowIdSkipByStatic,
        async ({ step, payload }) => {
          await step.email(
            'send-email',
            async (controls) => {
              return {
                subject: `This is an email subject ${controls.name}`,
                body: `Body result ${payload.name}`,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  name: { type: 'string', default: 'TEST' },
                },
              } as const,
              skip: () => true,
            }
          );
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', default: 'default_name' },
            },
            required: [],
            additionalProperties: false,
          } as const,
        }
      );

      await bridgeServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await syncWorkflow(session, workflowsRepository, workflowIdSkipByStatic, bridgeServer);
      }

      await triggerEvent(session, workflowIdSkipByStatic, subscriber.subscriberId, {}, bridge);
      await session.waitForJobCompletion();

      const executedMessageByStatic = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: StepTypeEnum.EMAIL,
      });

      expect(executedMessageByStatic.length).to.be.eq(0);

      const cancelledJobByStatic = await jobRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        type: StepTypeEnum.EMAIL,
      });

      expect(cancelledJobByStatic.length).to.be.eq(1);
      expect(cancelledJobByStatic[0].status).to.be.eq(JobStatusEnum.CANCELED);
    });

    it(`should skip by variable default value [${context.name}]`, async () => {
      const workflowIdSkipByVariable = `skip-by-variable-default-value-${`${context.name}`}`;
      const newWorkflow = workflow(
        workflowIdSkipByVariable,
        async ({ step, payload }) => {
          await step.email(
            'send-email',
            async (controls) => {
              return {
                subject: `This is an email subject ${controls.name}`,
                body: `Body result ${payload.name}`,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  name: { type: 'string', default: 'TEST' },
                  shouldSkipVar: { type: 'boolean', default: true },
                },
              } as const,
              skip: (controls) => controls.shouldSkipVar,
            }
          );
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', default: 'default_name' },
            },
            required: [],
            additionalProperties: false,
          } as const,
        }
      );

      await bridgeServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await syncWorkflow(session, workflowsRepository, workflowIdSkipByVariable, bridgeServer);
      }

      await triggerEvent(session, workflowIdSkipByVariable, subscriber.subscriberId, {}, bridge);
      await session.waitForJobCompletion();

      const executedMessage = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: StepTypeEnum.EMAIL,
      });

      expect(executedMessage.length).to.be.eq(0);

      const cancelledJobByVariable = await jobRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        type: StepTypeEnum.EMAIL,
      });

      expect(cancelledJobByVariable.length).to.be.eq(1);
      expect(cancelledJobByVariable[0].status).to.be.eq(JobStatusEnum.CANCELED);
    });

    it(`should have execution detail errors for invalid trigger payload [${context.name}]`, async () => {
      const workflowId = `missing-payload-name-${`${context.name}`}`;
      const newWorkflow = workflow(
        workflowId,
        async ({ step, payload }) => {
          await step.email('send-email', async () => {
            return {
              subject: 'This is an email subject',
              body: 'Body result',
            };
          });
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
            required: ['name'],
            additionalProperties: false,
          } as const,
        }
      );

      await bridgeServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);
      }

      await triggerEvent(session, workflowId, subscriber.subscriberId, {}, bridge);

      await session.waitForJobCompletion();

      const messagesAfter = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: StepTypeEnum.EMAIL,
      });

      expect(messagesAfter.length).to.be.eq(0);
      const executionDetailsRequired = await executionDetailsRepository.find({
        _environmentId: session.environment._id,
        status: ExecutionDetailsStatusEnum.FAILED,
      });

      let raw = JSON.parse(executionDetailsRequired[0]?.raw ?? '');
      let error = raw.data[0].message;

      expect(error).to.include("must have required property 'name'");

      await executionDetailsRepository.delete({ _environmentId: session.environment._id });

      await triggerEvent(session, workflowId, subscriber.subscriberId, { name: 4 }, bridge);
      await session.waitForJobCompletion();

      const executionDetailsInvalidType = await executionDetailsRepository.find({
        _environmentId: session.environment._id,
        status: ExecutionDetailsStatusEnum.FAILED,
      });
      raw = JSON.parse(executionDetailsInvalidType[0]?.raw ?? '');
      error = raw.data[0].message;

      expect(error).to.include('must be string');
    });

    it(`should use custom step [${context.name}]`, async () => {
      const workflowId = `with-custom-step-${`${context.name}`}`;
      const newWorkflow = workflow(workflowId, async ({ step }) => {
        const resInApp = await step.inApp('send-in-app', async () => {
          return {
            body: `Hello There`,
          };
        });

        const resCustom = await step.custom(
          'custom',
          async () => {
            await markAllSubscriberMessagesAs(session, subscriber.subscriberId, MessagesStatusEnum.READ);

            return { readString: 'Read', unReadString: 'Unread' };
          },
          {
            outputSchema: {
              type: 'object',
              properties: {
                readString: { type: 'string' },
                unReadString: { type: 'string' },
              },
              required: [],
              additionalProperties: false,
            } as const,
          }
        );

        await step.email('send-email', async () => {
          const emailSubject = resInApp.read ? resCustom?.readString : resCustom?.unReadString;

          return {
            subject: `${emailSubject}`,
            body: 'Email Body',
          };
        });
      });

      await bridgeServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);
      }

      await triggerEvent(session, workflowId, subscriber.subscriberId, {}, bridge);

      await session.waitForJobCompletion();

      const messagesAfterInApp = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: StepTypeEnum.IN_APP,
      });

      expect(messagesAfterInApp.length).to.be.eq(1);

      const messagesAfterEmail = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: StepTypeEnum.EMAIL,
      });
      expect(messagesAfterEmail.length).to.be.eq(1);
      expect(messagesAfterEmail[0].subject).to.include('Read');
    });

    it(`should trigger the bridge workflow with digest [${context.name}]`, async () => {
      const workflowId = `digest-workflow-${`${context.name}`}`;
      const newWorkflow = workflow(
        workflowId,
        async ({ step }) => {
          const digestResponse = await step.digest(
            'digest',
            async (controls) => {
              return {
                amount: controls.amount,
                unit: controls.unit,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  amount: {
                    type: 'number',
                    default: 2,
                  },
                  unit: {
                    type: 'string',
                    enum: ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months'],
                    default: 'seconds',
                  },
                },
              } as const,
            }
          );

          await step.sms('send-sms', async () => {
            const events = digestResponse.events.length;

            return {
              body: `${events} people liked your post`,
            };
          });
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', default: 'default_name' },
            },
            required: [],
            additionalProperties: false,
          } as const,
        }
      );

      await bridgeServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);
      }

      await triggerEvent(session, workflowId, subscriber.subscriberId, { name: 'John' }, bridge);
      await triggerEvent(session, workflowId, subscriber.subscriberId, { name: 'Bela' }, bridge);

      await session.waitForJobCompletion();

      const messages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: StepTypeEnum.SMS,
      });

      expect(messages.length).to.be.eq(1);
      expect(messages[0].content).to.include('2 people liked your post');
    });

    it(`should trigger the bridge workflow with delay [${context.name}]`, async () => {
      const workflowId = `delay-workflow-${`${context.name}`}`;
      const newWorkflow = workflow(
        workflowId,
        async ({ step }) => {
          const delayResponse = await step.delay(
            'delay-id',
            async (controls) => {
              return {
                type: 'regular',
                amount: controls.amount,
                unit: controls.unit,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  amount: {
                    type: 'number',
                    default: 1,
                  },
                  unit: {
                    type: 'string',
                    enum: ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months'],
                    default: 'seconds',
                  },
                },
              } as const,
            }
          );

          await step.sms(
            'send-sms',
            async () => {
              const { duration } = delayResponse;

              return {
                body: `people waited for ${duration} seconds`,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {},
              },
            }
          );
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', default: 'default_name' },
            },
            required: [],
            additionalProperties: false,
          } as const,
        }
      );

      await bridgeServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);
      }

      await triggerEvent(session, workflowId, subscriber.subscriberId, {}, bridge);

      await session.waitForJobCompletion();

      const messagesAfter = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: StepTypeEnum.SMS,
      });

      expect(messagesAfter.length).to.be.eq(1);
      expect(messagesAfter[0].content).to.match(/people waited for \d+ seconds/);

      const exceedMaxTierDurationWorkflowId = `exceed-max-tier-duration-workflow-${`${context.name}`}`;
      const exceedMaxTierDurationWorkflow = workflow(exceedMaxTierDurationWorkflowId, async ({ step }) => {
        await step.delay('delay-id', async (controls) => {
          return {
            type: 'regular',
            amount: 100,
            unit: 'days',
          };
        });

        await step.inApp('send-in-app', async () => {
          return {
            body: `people want to wait for 100 days`,
          };
        });
      });

      await bridgeServer.stop();
      await bridgeServer.start({ workflows: [exceedMaxTierDurationWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncBridge(session, workflowsRepository, exceedMaxTierDurationWorkflowId, bridgeServer);
      }

      const result = await triggerEvent(session, exceedMaxTierDurationWorkflowId, subscriber.subscriberId, {}, bridge);
      await session.waitForJobCompletion();

      const executionDetails = await executionDetailsRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        transactionId: result?.data?.data?.transactionId,
      });

      const delayExecutionDetails = executionDetails.filter((executionDetail) => executionDetail.channel === 'delay');
      expect(delayExecutionDetails.some((detail) => detail.detail === 'Defer duration limit exceeded')).to.be.true;
    });

    it(`should trigger the bridge workflow with control default and payload data [${context.name}]`, async () => {
      const workflowId = `default-payload-params-workflow-${`${context.name}`}`;
      const newWorkflow = workflow(
        workflowId,
        async ({ step, payload }) => {
          await step.email(
            'send-email',
            async (controls) => {
              return {
                subject: `prefix ${controls.name}`,
                body: 'Body result',
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  name: { type: 'string', default: 'Hello {{payload.name}}' },
                },
              } as const,
            }
          );
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', default: 'default_name' },
            },
            required: [],
            additionalProperties: false,
          } as const,
        }
      );

      await bridgeServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);
      }

      await triggerEvent(session, workflowId, subscriber.subscriberId, {}, bridge);

      await triggerEvent(session, workflowId, subscriber.subscriberId, { name: 'payload_name' }, bridge);

      await session.waitForJobCompletion();

      const sentMessage = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: StepTypeEnum.EMAIL,
      });

      expect(sentMessage.length).to.be.eq(2);
      const expectedSubjects = ['prefix Hello default_name', 'prefix Hello payload_name'];

      expectedSubjects.forEach((expectedSubject) => {
        const found = sentMessage.some((message) => message.subject?.includes(expectedSubject));
        expect(found).to.be.true;
      });
    });

    it(`should trigger the bridge workflow with control variables [${context.name}]`, async () => {
      const workflowId = `control-variables-workflow-${`${context.name}`}`;
      const stepId = 'send-email';
      const newWorkflow = workflow(
        workflowId,
        async ({ step, payload }) => {
          await step.email(
            stepId,
            async (controls) => {
              return {
                subject: `email subject ${controls.name}`,
                body: 'Body result',
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  name: { type: 'string', default: 'control default' },
                },
              } as const,
            }
          );
        },
        {
          // todo delete
          payloadSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', default: 'default_name' },
            },
            required: [],
            additionalProperties: false,
          } as const,
        }
      );

      await bridgeServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);
        await saveControlValues(session, workflowId, stepId, { variables: { name: 'stored_control_name' } });
      }

      const controls = { steps: { [stepId]: { name: 'stored_control_name' } } };
      await triggerEvent(session, workflowId, subscriber.subscriberId, {}, bridge, controls);
      await session.waitForJobCompletion();

      const sentMessage = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: StepTypeEnum.EMAIL,
      });

      expect(sentMessage.length).to.be.eq(1);
      expect(sentMessage[0].subject).to.equal('email subject stored_control_name');
    });

    it(`should store 2 in-app messages for a single notification event [${context.name}]`, async () => {
      const workflowId = `double-in-app-workflow-${`${context.name}`}`;
      const newWorkflow = workflow(workflowId, async ({ step }) => {
        await step.inApp('send-in-app1', () => ({ body: 'Hello there 1' }));
        await step.inApp('send-in-app2', () => ({ body: 'Hello there 2' }));
      });

      await bridgeServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);
      }

      await triggerEvent(session, workflowId, subscriber.subscriberId, {}, bridge);
      await session.waitForJobCompletion();

      const sentMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        templateIdentifier: workflowId,
        channel: StepTypeEnum.IN_APP,
      });

      expect(sentMessages.length).to.be.eq(2);
      const messageBodies = sentMessages.map((message) => message.content);
      expect(messageBodies).to.include('Hello there 1');
      expect(messageBodies).to.include('Hello there 2');
    });

    it(`should deliver message if the Workflow Definition doesn't contain preferences [${context.name}]`, async () => {
      const workflowId = `without-preferences-workflow-${`${context.name}`}`;
      const newWorkflow = workflow(workflowId, async ({ step }) => {
        await step.inApp('send-in-app', () => ({ body: 'Hello there 1' }));
      });

      /*
       * Delete `preferences` from the Workflow Definition to simulate an old
       * Workflow Definition (i.e. from old Framework version) that doesn't have the `preferences` property.
       */
      const { preferences, ...rest } = await newWorkflow.discover();
      // @ts-expect-error - preferences is not part of the resolved object
      sinon.stub(newWorkflow, 'discover').resolves(rest);

      await bridgeServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);
      }

      await triggerEvent(session, workflowId, subscriber.subscriberId, {}, bridge);
      await session.waitForJobCompletion();

      const sentMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        templateIdentifier: workflowId,
        channel: StepTypeEnum.IN_APP,
      });

      expect(sentMessages.length).to.be.eq(1);
    });

    it(`should deliver message if inApp is enabled via workflow preferences [${context.name}]`, async () => {
      const workflowId = `enabled-inapp-workflow-${`${context.name}`}`;
      const newWorkflow = workflow(
        workflowId,
        async ({ step }) => {
          await step.inApp('send-in-app', () => ({ body: 'Hello there 1' }));
        },
        {
          preferences: {
            channels: {
              inApp: {
                enabled: true,
              },
            },
          },
        }
      );

      await bridgeServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);
      }

      await triggerEvent(session, workflowId, subscriber.subscriberId, {}, bridge);
      await session.waitForJobCompletion();

      const sentMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        templateIdentifier: workflowId,
        channel: StepTypeEnum.IN_APP,
      });

      expect(sentMessages.length).to.be.eq(1);
    });

    it(`should NOT deliver message if inApp is disabled via workflow preferences [${context.name}]`, async () => {
      const workflowId = `disabled-inapp-workflow-${`${context.name}`}`;
      const newWorkflow = workflow(
        workflowId,
        async ({ step }) => {
          await step.inApp('send-in-app', () => ({ body: 'Hello there 1' }));
        },
        {
          preferences: {
            channels: {
              inApp: {
                enabled: false,
              },
            },
          },
        }
      );

      await bridgeServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);
      }

      await triggerEvent(session, workflowId, subscriber.subscriberId, {}, bridge);
      await session.waitForJobCompletion();

      const sentMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        templateIdentifier: workflowId,
        channel: StepTypeEnum.IN_APP,
      });

      expect(sentMessages.length).to.be.eq(0);

      const executionDetailsFiltered = await executionDetailsRepository.find({
        _environmentId: session.environment._id,
        status: ExecutionDetailsStatusEnum.SUCCESS,
      });

      const executionDetailsWorkflowFiltered = executionDetailsFiltered.filter(
        (executionDetail) => executionDetail.detail === DetailEnum.STEP_FILTERED_BY_WORKFLOW_RESOURCE_PREFERENCES
      );

      expect(executionDetailsWorkflowFiltered.length).to.be.eq(1);
    });

    it(`should deliver inApp message if workflow is disabled via workflow preferences and inApp is enabled [${context.name}]`, async () => {
      const workflowId = `disabled-workflow-inapp-enabled-${`${context.name}`}`;
      const newWorkflow = workflow(
        workflowId,
        async ({ step }) => {
          await step.inApp('send-in-app', () => ({ body: 'Hello there 1' }));
        },
        {
          preferences: {
            all: {
              enabled: false,
            },
            channels: {
              inApp: {
                enabled: true,
              },
            },
          },
        }
      );

      await bridgeServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);
      }

      await triggerEvent(session, workflowId, subscriber.subscriberId, {}, bridge);
      await session.waitForJobCompletion();

      const sentMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        templateIdentifier: workflowId,
        channel: StepTypeEnum.IN_APP,
      });

      expect(sentMessages.length).to.be.eq(1);
    });

    it(`should NOT deliver inApp message if workflow is disabled via workflow preferences [${context.name}]`, async () => {
      const workflowId = `disabled-workflow-${`${context.name}`}`;
      const newWorkflow = workflow(
        workflowId,
        async ({ step }) => {
          await step.inApp('send-in-app', () => ({ body: 'Hello there 1' }));
        },
        {
          preferences: {
            all: {
              enabled: false,
            },
          },
        }
      );

      await bridgeServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);
      }

      await triggerEvent(session, workflowId, subscriber.subscriberId, {}, bridge);
      await session.waitForJobCompletion();

      const sentMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        templateIdentifier: workflowId,
        channel: StepTypeEnum.IN_APP,
      });

      expect(sentMessages.length).to.be.eq(0);

      const executionDetailsFiltered = await executionDetailsRepository.find({
        _environmentId: session.environment._id,
        status: ExecutionDetailsStatusEnum.SUCCESS,
      });

      const executionDetailsWorkflowFiltered = executionDetailsFiltered.filter(
        (executionDetail) => executionDetail.detail === DetailEnum.STEP_FILTERED_BY_WORKFLOW_RESOURCE_PREFERENCES
      );

      expect(executionDetailsWorkflowFiltered.length).to.be.eq(1);
    });

    // eslint-disable-next-line max-len
    it(`should deliver inApp message if subscriber disabled inApp channel for readOnly workflow with inApp enabled [${context.name}]`, async () => {
      const workflowId = `enabled-readonly-workflow-level-${`${context.name}`}`;
      const newWorkflow = workflow(
        workflowId,
        async ({ step }) => {
          await step.inApp('send-in-app', () => ({ body: 'Hello there 1' }));
        },
        {
          preferences: {
            all: {
              readOnly: true,
            },
            channels: {
              inApp: {
                enabled: true,
              },
            },
          },
        }
      );

      await bridgeServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);
      }

      const createdWorkflow = await workflowsRepository.findByTriggerIdentifier(session.environment._id, workflowId);

      if (context.isStateful) {
        // Set subscriber preference to disable inApp for the workflow
        await session.testAgent
          .patch(`/v1/inbox/preferences/${createdWorkflow?._id}`)
          .set('Authorization', `Bearer ${session.subscriberToken}`)
          .send({
            in_app: false,
          });
      }

      await triggerEvent(session, workflowId, subscriber._id, {}, bridge);
      await session.waitForJobCompletion();

      const sentMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: session.subscriberProfile?._id,
        templateIdentifier: workflowId,
        channel: StepTypeEnum.IN_APP,
      });

      expect(sentMessages.length).to.be.eq(1);
    });

    // eslint-disable-next-line max-len
    it(`should NOT deliver inApp message if subscriber enables inApp channel for readOnly workflow with inApp disabled [${context.name}]`, async () => {
      const workflowId = `disabled-readonly-workflow-level-${`${context.name}`}`;
      const newWorkflow = workflow(
        workflowId,
        async ({ step }) => {
          await step.inApp('send-in-app', () => ({ body: 'Hello there 1' }));
        },
        {
          preferences: {
            all: {
              readOnly: true,
            },
            channels: {
              inApp: {
                enabled: false,
              },
            },
          },
        }
      );

      await bridgeServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);
      }

      const createdWorkflow = await workflowsRepository.findByTriggerIdentifier(session.environment._id, workflowId);

      if (context.isStateful) {
        // Set subscriber preference to enable inApp for the workflow
        await session.testAgent
          .patch(`/v1/inbox/preferences/${createdWorkflow?._id}`)
          .set('Authorization', `Bearer ${session.subscriberToken}`)
          .send({
            in_app: true,
          });
      }

      await triggerEvent(session, workflowId, subscriber._id, {}, bridge);
      await session.waitForJobCompletion();

      const sentMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: session.subscriberProfile?._id,
        templateIdentifier: workflowId,
        channel: StepTypeEnum.IN_APP,
      });

      expect(sentMessages.length).to.be.eq(0);

      const executionDetailsFiltered = await executionDetailsRepository.find({
        _environmentId: session.environment._id,
        status: ExecutionDetailsStatusEnum.SUCCESS,
      });

      const executionDetailsWorkflowFiltered = executionDetailsFiltered.filter(
        (executionDetail) => executionDetail.detail === DetailEnum.STEP_FILTERED_BY_WORKFLOW_RESOURCE_PREFERENCES
      );

      expect(executionDetailsWorkflowFiltered.length).to.be.eq(1);
    });

    // eslint-disable-next-line max-len
    it(`should deliver inApp message if subscriber disabled inApp channel globally for readOnly workflow with inApp enabled [${context.name}]`, async () => {
      const workflowId = `enabled-readonly-global-level-${`${context.name}`}`;
      const newWorkflow = workflow(
        workflowId,
        async ({ step }) => {
          await step.inApp('send-in-app', () => ({ body: 'Hello there 1' }));
        },
        {
          preferences: {
            all: {
              readOnly: true,
            },
            channels: {
              inApp: {
                enabled: true,
              },
            },
          },
        }
      );

      await bridgeServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);
      }

      if (context.isStateful) {
        // Set subscriber preference to disable inApp globally
        await session.testAgent
          .patch(`/v1/inbox/preferences`)
          .set('Authorization', `Bearer ${session.subscriberToken}`)
          .send({
            in_app: false,
          });
      }

      await triggerEvent(session, workflowId, subscriber._id, {}, bridge);
      await session.waitForJobCompletion();

      const sentMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: session.subscriberProfile?._id,
        templateIdentifier: workflowId,
        channel: StepTypeEnum.IN_APP,
      });

      expect(sentMessages.length).to.be.eq(1);
    });

    // eslint-disable-next-line max-len
    it(`should NOT deliver inApp message if subscriber enabled inApp channel globally for readOnly workflow with inApp disabled [${context.name}]`, async () => {
      const workflowId = `disabled-readonly-global-level-${`${context.name}`}`;
      const newWorkflow = workflow(
        workflowId,
        async ({ step }) => {
          await step.inApp('send-in-app', () => ({ body: 'Hello there 1' }));
        },
        {
          preferences: {
            all: {
              readOnly: true,
            },
            channels: {
              inApp: {
                enabled: false,
              },
            },
          },
        }
      );

      await bridgeServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);
      }

      if (context.isStateful) {
        // Set subscriber preference to enable inApp globally
        await session.testAgent
          .patch(`/v1/inbox/preferences`)
          .set('Authorization', `Bearer ${session.subscriberToken}`)
          .send({
            in_app: true,
          });
      }

      await triggerEvent(session, workflowId, subscriber._id, {}, bridge);
      await session.waitForJobCompletion();

      const sentMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: session.subscriberProfile?._id,
        templateIdentifier: workflowId,
        channel: StepTypeEnum.IN_APP,
      });

      expect(sentMessages.length).to.be.eq(0);

      const executionDetailsFiltered = await executionDetailsRepository.find({
        _environmentId: session.environment._id,
        status: ExecutionDetailsStatusEnum.SUCCESS,
      });

      const executionDetailsWorkflowFiltered = executionDetailsFiltered.filter(
        (executionDetail) => executionDetail.detail === DetailEnum.STEP_FILTERED_BY_WORKFLOW_RESOURCE_PREFERENCES
      );

      expect(executionDetailsWorkflowFiltered.length).to.be.eq(1);
    });

    // eslint-disable-next-line max-len
    it(`should deliver inApp message if subscriber enabled inApp channel globally for workflow with inApp disabled [${context.name}]`, async () => {
      if (!context.isStateful) {
        /*
         * Stateless executions don't respect subscriber preferences,
         * so we skip the test.
         */
        expect(true).to.equal(true);
      } else {
        const workflowId = `disabled-editable-global-level-${`${context.name}`}`;
        const newWorkflow = workflow(
          workflowId,
          async ({ step }) => {
            await step.inApp('send-in-app', () => ({ body: 'Hello there 1' }));
          },
          {
            preferences: {
              all: {
                readOnly: false,
              },
              channels: {
                inApp: {
                  enabled: false,
                },
              },
            },
          }
        );

        await bridgeServer.start({ workflows: [newWorkflow] });

        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);

        // Set subscriber preference to disable inApp globally
        await session.testAgent
          .patch(`/v1/inbox/preferences`)
          .set('Authorization', `Bearer ${session.subscriberToken}`)
          .send({
            in_app: true,
          });

        await triggerEvent(session, workflowId, subscriber._id, {}, bridge);
        await session.waitForJobCompletion();

        const sentMessages = await messageRepository.find({
          _environmentId: session.environment._id,
          _subscriberId: session.subscriberProfile?._id,
          templateIdentifier: workflowId,
          channel: StepTypeEnum.IN_APP,
        });

        expect(sentMessages.length).to.be.eq(1);
      }
    });

    // eslint-disable-next-line max-len
    it(`should NOT deliver inApp message if subscriber disabled inApp channel globally for workflow with inApp enabled [${context.name}]`, async () => {
      if (!context.isStateful) {
        /*
         * Stateless executions don't respect subscriber preferences,
         * so we skip the test.
         */
        expect(true).to.equal(true);
      } else {
        const workflowId = `enabled-editable-global-level-${`${context.name}`}`;
        const newWorkflow = workflow(
          workflowId,
          async ({ step }) => {
            await step.inApp('send-in-app', () => ({ body: 'Hello there 1' }));
          },
          {
            preferences: {
              all: {
                readOnly: false,
              },
              channels: {
                inApp: {
                  enabled: true,
                },
              },
            },
          }
        );

        await bridgeServer.start({ workflows: [newWorkflow] });

        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);

        // Set subscriber preference to disable inApp globally
        await session.testAgent
          .patch(`/v1/inbox/preferences`)
          .set('Authorization', `Bearer ${session.subscriberToken}`)
          .send({
            in_app: false,
          });

        await triggerEvent(session, workflowId, subscriber._id, {}, bridge);
        await session.waitForJobCompletion();

        const sentMessages = await messageRepository.find({
          _environmentId: session.environment._id,
          _subscriberId: session.subscriberProfile?._id,
          templateIdentifier: workflowId,
          channel: StepTypeEnum.IN_APP,
        });

        expect(sentMessages.length).to.be.eq(0);

        const executionDetailsFiltered = await executionDetailsRepository.find({
          _environmentId: session.environment._id,
          status: ExecutionDetailsStatusEnum.SUCCESS,
        });

        const executionDetailsSubscriberGlobalFiltered = executionDetailsFiltered.filter(
          (executionDetail) => executionDetail.detail === DetailEnum.STEP_FILTERED_BY_SUBSCRIBER_GLOBAL_PREFERENCES
        );

        expect(executionDetailsSubscriberGlobalFiltered.length).to.be.eq(1);
      }
    });

    // eslint-disable-next-line max-len
    it(`should deliver inApp message if subscriber disabled inApp channel globally but enabled inApp for workflow with inApp disabled [${context.name}]`, async () => {
      if (!context.isStateful) {
        /*
         * Stateless executions don't respect subscriber preferences,
         * so we skip the test.
         */
        expect(true).to.equal(true);
      } else {
        const workflowId = `disabled-editable-global-workflow-level-${`${context.name}`}`;
        const newWorkflow = workflow(
          workflowId,
          async ({ step }) => {
            await step.inApp('send-in-app', () => ({ body: 'Hello there 1' }));
          },
          {
            preferences: {
              all: {
                readOnly: false,
              },
              channels: {
                inApp: {
                  enabled: false,
                },
              },
            },
          }
        );

        await bridgeServer.start({ workflows: [newWorkflow] });

        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);

        const createdWorkflow = await workflowsRepository.findByTriggerIdentifier(session.environment._id, workflowId);

        // Set subscriber preference to disable inApp globally
        await session.testAgent
          .patch(`/v1/inbox/preferences`)
          .set('Authorization', `Bearer ${session.subscriberToken}`)
          .send({
            in_app: false,
          });

        // Set subscriber preference to enable inApp for the workflow
        await session.testAgent
          .patch(`/v1/inbox/preferences/${createdWorkflow?._id}`)
          .set('Authorization', `Bearer ${session.subscriberToken}`)
          .send({
            in_app: true,
          });
        await triggerEvent(session, workflowId, subscriber._id, {}, bridge);
        await session.waitForJobCompletion();

        const sentMessages = await messageRepository.find({
          _environmentId: session.environment._id,
          _subscriberId: session.subscriberProfile?._id,
          templateIdentifier: workflowId,
          channel: StepTypeEnum.IN_APP,
        });

        expect(sentMessages.length).to.be.eq(1);
      }
    });

    // eslint-disable-next-line max-len
    it(`should NOT deliver inApp message if subscriber enabled inApp channel globally but disabled inApp for workflow with inApp enabled [${context.name}]`, async () => {
      if (!context.isStateful) {
        /*
         * Stateless executions don't respect subscriber preferences,
         * so we skip the test.
         */
        expect(true).to.equal(true);
      } else {
        const workflowId = `enabled-editable-global-workflow-level-${`${context.name}`}`;
        const newWorkflow = workflow(
          workflowId,
          async ({ step }) => {
            await step.inApp('send-in-app', () => ({ body: 'Hello there 1' }));
          },
          {
            preferences: {
              all: {
                readOnly: false,
              },
              channels: {
                inApp: {
                  enabled: true,
                },
              },
            },
          }
        );

        await bridgeServer.start({ workflows: [newWorkflow] });

        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);

        const createdWorkflow = await workflowsRepository.findByTriggerIdentifier(session.environment._id, workflowId);

        // Set subscriber preference to enable inApp globally
        await session.testAgent
          .patch(`/v1/inbox/preferences`)
          .set('Authorization', `Bearer ${session.subscriberToken}`)
          .send({
            in_app: true,
          });

        // Set subscriber preference to disable inApp for the workflow
        await session.testAgent
          .patch(`/v1/inbox/preferences/${createdWorkflow?._id}`)
          .set('Authorization', `Bearer ${session.subscriberToken}`)
          .send({
            in_app: false,
          });

        await triggerEvent(session, workflowId, subscriber._id, {}, bridge);
        await session.waitForJobCompletion();

        const sentMessages = await messageRepository.find({
          _environmentId: session.environment._id,
          _subscriberId: session.subscriberProfile?._id,
          templateIdentifier: workflowId,
          channel: StepTypeEnum.IN_APP,
        });

        expect(sentMessages.length).to.be.eq(0);

        const executionDetailsFiltered = await executionDetailsRepository.find({
          _environmentId: session.environment._id,
          status: ExecutionDetailsStatusEnum.SUCCESS,
        });

        const executionDetailsSubscriberWorkflowFiltered = executionDetailsFiltered.filter(
          (executionDetail) => executionDetail.detail === DetailEnum.STEP_FILTERED_BY_SUBSCRIBER_WORKFLOW_PREFERENCES
        );

        expect(executionDetailsSubscriberWorkflowFiltered.length).to.be.eq(1);
      }
    });

    it(`should skip inApp step and execute email step when userName is John Doe [${context.name}]`, async () => {
      const workflowId = `bug-5120-${context.name}`;
      const newWorkflow = workflow(
        workflowId,
        async ({ step, payload }) => {
          await step.inApp(
            'inapp',
            async () => {
              return {
                body: 'This is a log message',
              };
            },
            {
              skip: () => payload.userName === 'John Doe',
            }
          );

          await step.email(
            'send-email',
            async (controls) => {
              return {
                subject: controls.subject,
                body: `This is your first Novu Email ${payload.userName}`,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  subject: {
                    type: 'string',
                    default: `A Successful Test on Novu from default_name`,
                  },
                },
              } as const,
            }
          );
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              userName: {
                type: 'string',
                default: 'John Doe',
              },
            },
            required: [],
            additionalProperties: false,
          } as const,
        }
      );

      await bridgeServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);
      }

      await triggerEvent(session, workflowId, subscriber.subscriberId, { userName: 'John Doe' }, bridge);
      await session.waitForJobCompletion();

      // Verify inApp message was skipped
      const inAppMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: StepTypeEnum.IN_APP,
      });
      expect(inAppMessages.length).to.eq(0);

      // Verify email was sent
      const emailMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: StepTypeEnum.EMAIL,
      });
      expect(emailMessages.length).to.eq(1);
      expect(emailMessages[0].subject).to.include('A Successful Test on Novu from default_name');
    });

    it(`should execute both inApp and email steps when userName is not John Doe [${context.name}]`, async () => {
      const workflowId = `bug-5120-not-skipped-${context.name}`;
      const newWorkflow = workflow(
        workflowId,
        async ({ step, payload }) => {
          await step.inApp(
            'inapp',
            async () => {
              return {
                body: 'This is a log message',
              };
            },
            {
              skip: () => payload.userName === 'John Doe',
            }
          );

          await step.email(
            'send-email',
            async () => {
              return {
                subject: `Welcome to Novu ${payload.userName}`,
                body: `This is your first Novu Email ${payload.userName}`,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  subject: {
                    type: 'string',
                  },
                },
              } as const,
            }
          );
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              userName: {
                type: 'string',
                default: 'John Doe',
              },
            },
            required: [],
            additionalProperties: false,
          } as const,
        }
      );

      await bridgeServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);
      }

      await triggerEvent(session, workflowId, subscriber.subscriberId, { userName: 'Jane Doe' }, bridge);
      await session.waitForJobCompletion();

      // Verify inApp message was not skipped
      const inAppMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: StepTypeEnum.IN_APP,
      });
      expect(inAppMessages.length).to.eq(1);
      expect(inAppMessages[0].content).to.include('This is a log message');

      // Verify email was sent
      const emailMessages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: StepTypeEnum.EMAIL,
      });
      expect(emailMessages.length).to.eq(1);
      expect(emailMessages[0].subject).to.include('Welcome to Novu Jane Doe');
    });

    it(`should succeed workflow if delay step is skipped via payload [${context.name}]`, async function () {
      const workflowId = `delay-skip-causes-failure-${context.name}`;
      const delayStepId = 'delay-step-under-test'; // Used for clarity, not directly in queries
      const inAppStep1Name = 'in-app-before-delay';
      const inAppStep2Name = 'in-app-after-delay';

      const newWorkflow = workflow(
        workflowId,
        async ({ step, payload }) => {
          await step.inApp(inAppStep1Name, async () => ({ body: 'Message from before delay' }));

          await step.delay(
            delayStepId,
            async () => ({ type: 'regular', amount: 1, unit: 'seconds' }), // Short delay for test speed
            {
              skip: () => payload.skipTheDelay === true,
            }
          );

          await step.inApp(inAppStep2Name, async () => ({ body: 'Message from after delay' }));
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              skipTheDelay: { type: 'boolean' },
            },
            required: ['skipTheDelay'],
            additionalProperties: false,
          } as const,
        }
      );

      await bridgeServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);
        const foundWorkflow = await workflowsRepository.findByTriggerIdentifier(session.environment._id, workflowId);
        expect(foundWorkflow, 'Stateful: Workflow should be found after sync').to.be.ok;
      }

      // Delay is skipped (workflow should succeed) ---
      const triggerResultNoSkip = await triggerEvent(
        session,
        workflowId,
        subscriber.subscriberId,
        { skipTheDelay: true },
        bridge
      );
      const transactionIdNoSkip = triggerResultNoSkip?.data?.data?.transactionId;
      expect(transactionIdNoSkip, 'Scenario 1: TransactionId should exist for successful trigger').to.be.ok;

      if (transactionIdNoSkip) {
        await session.waitForJobCompletion(transactionIdNoSkip);

        const messagesNoSkip = await messageRepository.find({
          _environmentId: session.environment._id,
          _subscriberId: subscriber._id,
          transactionId: transactionIdNoSkip,
          channel: StepTypeEnum.IN_APP,
        });
        expect(messagesNoSkip.length).to.equal(
          2,
          'Scenario 1: Should have 2 in-app messages when delay is not skipped'
        );
        expect(messagesNoSkip.some((message) => message.content === 'Message from before delay')).to.be.true;
        expect(messagesNoSkip.some((message) => message.content === 'Message from after delay')).to.be.true;

        const delayJobNoSkip = await jobRepository.findOne({
          _environmentId: session.environment._id,
          transactionId: transactionIdNoSkip,
          type: StepTypeEnum.DELAY,
        });
        expect(delayJobNoSkip?.status).to.equal(JobStatusEnum.COMPLETED, 'Scenario 1: Delay job should be COMPLETED');

        const failedExecDetailsNoSkip = await executionDetailsRepository.find({
          _environmentId: session.environment._id,
          transactionId: transactionIdNoSkip,
          status: ExecutionDetailsStatusEnum.FAILED,
        });
        expect(failedExecDetailsNoSkip.length).to.equal(0, 'Scenario 1: Should have no failed execution details');
      }
    });

    describe('External workflow control values validation', () => {
      it(`should accept flexible JSON objects in control values for external workflows [${context.name}]`, async () => {
        const workflowId = `external-flexible-controls-${context.name}`;
        const stepId = 'send-email';

        const newWorkflow = workflow(workflowId, async ({ step }) => {
          await step.email(
            stepId,
            async (controls) => {
              return {
                subject: `${controls.customSubject || 'Default Subject'}`,
                body: `${controls.customBody || 'Default Body'}`,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  customSubject: { type: 'string', default: 'Default Subject' },
                  customBody: { type: 'string', default: 'Default Body' },
                },
              } as const,
            }
          );
        });

        await bridgeServer.start({ workflows: [newWorkflow] });

        if (context.isStateful) {
          await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);

          // Update with flexible control values that wouldn't be allowed in NOVU_CLOUD workflows
          const flexibleControlValues = {
            variables: {
              // Standard fields
              customSubject: 'External workflow subject',
              customBody: 'External workflow body',
              // Custom fields that wouldn't be in EmailControlDto
              customField: 'This is allowed in external workflows',
              nestedObject: {
                key1: 'value1',
                key2: 42,
                key3: true,
              },
              arrayField: ['item1', 'item2', 'item3'],
              metadata: {
                source: 'external-system',
                timestamp: new Date().toISOString(),
                version: '1.0',
              },
            },
          };

          const updateResponse = await saveControlValues(session, workflowId, stepId, flexibleControlValues);
          expect(updateResponse.status).to.equal(200);
        }

        await triggerEvent(session, workflowId, subscriber.subscriberId, {}, bridge);
        await session.waitForJobCompletion();

        const sentMessages = await messageRepository.find({
          _environmentId: session.environment._id,
          _subscriberId: subscriber._id,
          templateIdentifier: workflowId,
          channel: StepTypeEnum.EMAIL,
        });

        expect(sentMessages.length).to.be.eq(1);
        if (context.isStateful) {
          expect(sentMessages[0].subject).to.include('External workflow subject');
        } else {
          // Stateless workflows use defaults when no controls are saved
          expect(sentMessages[0].subject).to.include('Default Subject');
        }
      });

      it(`should accept completely arbitrary JSON structure for external workflows [${context.name}]`, async () => {
        const workflowId = `external-arbitrary-controls-${context.name}`;
        const stepId = 'send-email';

        const newWorkflow = workflow(workflowId, async ({ step }) => {
          await step.email(
            stepId,
            async (controls) => {
              return {
                subject: `Framework: ${controls.customFramework?.name || 'Unknown'}`,
                body: `Features: ${Array.isArray(controls.externalConfig?.features) ? controls.externalConfig.features.join(', ') : 'None'}`,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  customFramework: { type: 'object' },
                  externalConfig: { type: 'object' },
                },
              } as const,
            }
          );
        });

        await bridgeServer.start({ workflows: [newWorkflow] });

        if (context.isStateful) {
          await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);

          // Update with completely arbitrary data structure
          const arbitraryControlValues = {
            variables: {
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
              externalConfig: {
                templateEngine: 'handlebars',
                features: ['responsive', 'dark-mode'],
              },
            },
          };

          const updateResponse = await saveControlValues(session, workflowId, stepId, arbitraryControlValues);
          expect(updateResponse.status).to.equal(200);
        }

        await triggerEvent(session, workflowId, subscriber.subscriberId, {}, bridge);
        await session.waitForJobCompletion();

        const sentMessages = await messageRepository.find({
          _environmentId: session.environment._id,
          _subscriberId: subscriber._id,
          templateIdentifier: workflowId,
          channel: StepTypeEnum.EMAIL,
        });

        expect(sentMessages.length).to.be.eq(1);
        if (context.isStateful) {
          expect(sentMessages[0].subject).to.include('CustomNotificationFramework');
          expect(sentMessages[0].content).to.include('responsive, dark-mode');
        } else {
          // Stateless workflows use defaults when no controls are saved
          expect(sentMessages[0].subject).to.include('Unknown');
        }
      });

      it(`should handle mixed standard and custom fields for external workflows [${context.name}]`, async () => {
        const workflowId = `external-mixed-controls-${context.name}`;
        const stepId = 'send-in-app';

        const newWorkflow = workflow(workflowId, async ({ step }) => {
          await step.inApp(
            stepId,
            async (controls) => {
              return {
                subject: `${controls.subject || 'Default Subject'}`,
                body: `${controls.body || 'Default Body'} - Priority: ${controls.customPriority || 'normal'}`,
                avatar: controls.avatar,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  subject: { type: 'string', default: 'Default Subject' },
                  body: { type: 'string', default: 'Default Body' },
                  avatar: { type: 'string' },
                  customPriority: { type: 'string', default: 'normal' },
                },
              } as const,
            }
          );
        });

        await bridgeServer.start({ workflows: [newWorkflow] });

        if (context.isStateful) {
          await discoverAndSyncBridge(session, workflowsRepository, workflowId, bridgeServer);

          // Update with mixed standard and custom fields
          const mixedControlValues = {
            variables: {
              // Standard in-app fields
              subject: 'Mixed workflow subject',
              body: 'Mixed workflow body',
              avatar: 'https://example.com/avatar.png',
              // Custom fields that wouldn't be in standard InAppControlDto
              customPriority: 'high',
              customNotificationType: 'alert',
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
          };

          const updateResponse = await saveControlValues(session, workflowId, stepId, mixedControlValues);
          expect(updateResponse.status).to.equal(200);
        }

        await triggerEvent(session, workflowId, subscriber.subscriberId, {}, bridge);
        await session.waitForJobCompletion();

        const sentMessages = await messageRepository.find({
          _environmentId: session.environment._id,
          _subscriberId: subscriber._id,
          templateIdentifier: workflowId,
          channel: StepTypeEnum.IN_APP,
        });

        expect(sentMessages.length).to.be.eq(1);
        if (context.isStateful) {
          expect(sentMessages[0].subject).to.include('Mixed workflow subject');
          expect(sentMessages[0].content).to.include('Priority: high');
        } else {
          // Stateless workflows use defaults when no controls are saved
          expect(sentMessages[0].subject).to.include('Default Subject');
          expect(sentMessages[0].content).to.include('Priority: normal');
        }
      });
    });
  });
});

describe('Novu-Hosted Bridge Trigger #novu-v2', () => {
  let session: UserSession;
  const messageRepository = new MessageRepository();
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber({ _id: session.subscriberId });
  });

  it('should execute a Novu-managed workflow', async () => {
    const createWorkflowDto: CreateWorkflowDto = {
      tags: [],
      active: true,
      name: 'Test Workflow',
      description: 'Test Workflow',
      __source: WorkflowCreationSourceEnum.DASHBOARD,
      workflowId: 'test-workflow',
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          name: 'Test Step 1',
          controlValues: {
            body: 'Test Body',
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          name: 'Test Step 2',
          controlValues: {
            body: 'Test Body',
          },
        },
      ],
    };

    const response = await session.testAgent.post(`/v2/workflows`).send(createWorkflowDto);
    expect(response.status).to.be.eq(201);

    const responseData = response.body.data as WorkflowResponseDto;

    await triggerEvent(session, responseData.workflowId, subscriber._id, {});
    await session.waitForJobCompletion();

    const sentMessages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: session.subscriberProfile?._id,
      templateIdentifier: responseData.workflowId,
      channel: StepTypeEnum.IN_APP,
    });

    expect(sentMessages.length).to.be.eq(2);
  });
});

async function syncWorkflow(
  session: UserSession,
  workflowsRepository: NotificationTemplateRepository,
  workflowIdentifier: string,
  bridgeServer: TestBridgeServer
) {
  await session.testAgent.post(`/v1/bridge/sync`).send({
    bridgeUrl: `${bridgeServer.serverPath}/novu`,
  });

  const foundWorkflow = await workflowsRepository.findByTriggerIdentifier(session.environment._id, workflowIdentifier);

  expect(foundWorkflow).to.be.ok;
  if (!foundWorkflow) throw new Error('Workflow not found');
}

async function triggerEvent(
  session: UserSession,
  workflowId: string,
  subscriberId: string,
  payload?: Record<string, unknown>,
  bridge?: { url: string },
  controls?: Record<string, unknown>
) {
  const defaultPayload = {
    name: 'test_name',
  };

  const response = await axios.post(
    `${session.serverUrl}${eventTriggerPath}`,
    {
      name: workflowId,
      to: {
        subscriberId,
        email: 'test@subscriber.com',
      },
      payload: payload ?? defaultPayload,
      controls: controls ?? undefined,
      bridgeUrl: bridge?.url ?? undefined,
    },
    {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    }
  );

  return response;
}

async function discoverAndSyncBridge(
  session: UserSession,
  workflowsRepository?: NotificationTemplateRepository,
  workflowIdentifier?: string,
  bridgeServer?: TestBridgeServer
) {
  const discoverResponse = await session.testAgent.post(`/v1/bridge/sync`).send({
    bridgeUrl: `${bridgeServer?.serverPath}/novu`,
  });

  if (!workflowsRepository || !workflowIdentifier) {
    return discoverResponse;
  }

  const foundWorkflow = await workflowsRepository.findByTriggerIdentifier(session.environment._id, workflowIdentifier);
  expect(foundWorkflow).to.be.ok;

  if (!foundWorkflow) {
    throw new Error('Workflow not found');
  }

  return discoverResponse;
}

async function saveControlValues(
  session: UserSession,
  workflowIdentifier?: string,
  stepIdentifier?: string,
  payloadBody?: Record<string, unknown>
) {
  return await session.testAgent.put(`/v1/bridge/controls/${workflowIdentifier}/${stepIdentifier}`).send(payloadBody);
}

async function markAllSubscriberMessagesAs(session: UserSession, subscriberId: string, markAs: MessagesStatusEnum) {
  const response = await axios.post(
    `${session.serverUrl}/v1/subscribers/${subscriberId}/messages/mark-all`,
    {
      markAs,
    },
    {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    }
  );

  return response.data;
}
