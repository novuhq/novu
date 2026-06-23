import {
  ControlValuesRepository,
  EnvironmentRepository,
  MessageTemplateRepository,
  NotificationTemplateRepository,
} from '@novu/dal';
import { SeverityLevelEnum, workflow } from '@novu/framework';
import { ResourceOriginEnum, ResourceTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import getPort from 'get-port';
import { TestBridgeServer } from '../../../../e2e/test-bridge-server';

describe('Bridge Sync - /bridge/sync (POST) #novu-v2', () => {
  let session: UserSession;
  const environmentRepository = new EnvironmentRepository();
  const workflowsRepository = new NotificationTemplateRepository();
  const messageTemplateRepository = new MessageTemplateRepository();
  const controlValuesRepository = new ControlValuesRepository();

  const inputPostPayload = {
    schema: {
      type: 'object',
      properties: {
        showButton: { type: 'boolean', default: true },
      },
    },
  } as const;

  let bridgeServer: TestBridgeServer;
  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    const port = await getPort();
    bridgeServer = new TestBridgeServer(port);
  });

  afterEach(async () => {
    await bridgeServer.stop();
  });

  it('should update bridge url', async () => {
    await bridgeServer.start({ workflows: [] });

    const result = await session.testAgent.post(`/v1/bridge/sync`).send({
      bridgeUrl: bridgeServer.serverPath,
    });

    expect(result.body.data?.length).to.equal(0);

    const environment = await environmentRepository.findOne({ _id: session.environment._id });

    expect(environment?.echo.url).to.equal(bridgeServer.serverPath);

    const workflows = await workflowsRepository.find({ _environmentId: session.environment._id });
    expect(workflows.length).to.equal(0);
  });

  it('should create a workflow', async () => {
    const workflowId = 'hello-world';
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
      },
      {
        severity: SeverityLevelEnum.HIGH,
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

    const result = await session.testAgent.post(`/v1/bridge/sync`).send({
      bridgeUrl: bridgeServer.serverPath,
    });
    expect(result.body.data?.length).to.equal(1);

    const workflowsCount = await workflowsRepository.find({ _environmentId: session.environment._id });
    const workflowData = await workflowsRepository.findById(result.body.data[0]._id, session.environment._id);

    expect(workflowData).to.be.ok;
    if (!workflowData) {
      throw new Error('Workflow not found');
    }

    expect(workflowsCount.length).to.equal(1);

    expect(workflowData.name).to.equal(workflowId);
    expect(workflowData.type).to.equal(ResourceTypeEnum.BRIDGE);
    expect(workflowData.rawData.workflowId).to.equal(workflowId);
    expect(workflowData.triggers[0].identifier).to.equal(workflowId);

    expect(workflowData.severity).to.equal(SeverityLevelEnum.HIGH);
    expect(workflowData.steps.length).to.equal(1);
    expect(workflowData.steps[0].stepId).to.equal('send-email');
    expect(workflowData.steps[0].uuid).to.equal('send-email');
    expect(workflowData.steps[0].template?.name).to.equal('send-email');

    expect(workflowData.rawData.payload).to.be.ok;
    expect((workflowData.rawData.payload as any).schema).to.be.ok;
    expect((workflowData.rawData.payload as any).unknownSchema).to.not.exist;
  });

  it('should create a workflow identified by a space-separated identifier', async () => {
    const workflowId = 'My Workflow';
    const spaceSeparatedIdWorkflow = workflow(workflowId, async ({ step }) => {
      await step.email('send-email', () => ({
        subject: 'Welcome!',
        body: 'Hello there',
      }));
    });
    await bridgeServer.start({ workflows: [spaceSeparatedIdWorkflow] });

    const result = await session.testAgent.post(`/v1/bridge/sync`).send({
      bridgeUrl: bridgeServer.serverPath,
    });
    expect(result.body.data?.length).to.equal(1);

    const workflowsCount = await workflowsRepository.find({ _environmentId: session.environment._id });
    const workflowData = await workflowsRepository.findById(result.body.data[0]._id, session.environment._id);

    expect(workflowData).to.be.ok;
    if (!workflowData) {
      throw new Error('Workflow not found');
    }

    expect(workflowsCount.length).to.equal(1);

    expect(workflowData.name).to.equal(workflowId);
    expect(workflowData.type).to.equal(ResourceTypeEnum.BRIDGE);
    expect(workflowData.rawData.workflowId).to.equal(workflowId);
    expect(workflowData.triggers[0].identifier).to.equal(workflowId);

    expect(workflowData.steps.length).to.equal(1);
    expect(workflowData.steps[0].stepId).to.equal('send-email');
    expect(workflowData.steps[0].uuid).to.equal('send-email');
    expect(workflowData.steps[0].template?.name).to.equal('send-email');
  });

  it('should create a message template', async () => {
    const workflowId = 'hello-world';
    const newWorkflow = workflow(
      workflowId,
      async ({ step, payload }) => {
        await step.email(
          'send-email',
          async (controls) => {
            return {
              subject: 'This is an email subject ',
              body: 'Body result ',
            };
          },
          {
            controlSchema: inputPostPayload.schema,
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

    const result = await session.testAgent.post(`/v1/bridge/sync`).send({
      bridgeUrl: bridgeServer.serverPath,
    });
    expect(result.body.data?.length).to.equal(1);

    const workflowsCount = await workflowsRepository.find({ _environmentId: session.environment._id });
    expect(workflowsCount.length).to.equal(1);

    const workflowData = await workflowsRepository.findById(result.body.data[0]._id, session.environment._id);
    expect(workflowData).to.be.ok;
    if (!workflowData) {
      throw new Error('Workflow not found');
    }

    const messageTemplates = await messageTemplateRepository.find({
      _id: workflowData.steps[0]._id,
      _environmentId: session.environment._id,
    });
    expect(messageTemplates.length).to.equal(1);
    const messageTemplatesToTest = messageTemplates[0];

    expect(messageTemplatesToTest.controls).to.deep.equal(inputPostPayload);
  });

  it('should update a workflow', async () => {
    const workflowId = 'hello-world';
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

    await session.testAgent.post(`/v1/bridge/sync`).send({
      bridgeUrl: bridgeServer.serverPath,
    });

    await bridgeServer.stop();

    bridgeServer = new TestBridgeServer();
    const workflowId2 = 'hello-world-2';
    const newWorkflow2 = workflow(
      workflowId2,
      async ({ step, payload }) => {
        await step.email(
          'send-email-2',
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

        await step.sms('send-sms-2', async () => {
          return {
            body: 'test',
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
    await bridgeServer.start({ workflows: [newWorkflow2] });

    await session.testAgent.post(`/v1/bridge/sync`).send({
      bridgeUrl: bridgeServer.serverPath,
    });

    const workflows = await workflowsRepository.find({ _environmentId: session.environment._id });
    expect(workflows.length).to.equal(1);

    const workflowData = workflows[0];

    expect(workflowData.name).to.equal(workflowId2);
    expect(workflowData.type).to.equal(ResourceTypeEnum.BRIDGE);
    expect(workflowData.rawData.workflowId).to.equal(workflowId2);
    expect(workflowData.triggers[0].identifier).to.equal(workflowId2);

    expect(workflowData.steps[0].stepId).to.equal('send-email-2');
    expect(workflowData.steps[0].uuid).to.equal('send-email-2');
    expect(workflowData.steps[0].name).to.equal('send-email-2');

    expect(workflowData.steps[1].stepId).to.equal('send-sms-2');
    expect(workflowData.steps[1].uuid).to.equal('send-sms-2');
    expect(workflowData.steps[1].name).to.equal('send-sms-2');
  });

  it('should create workflow preferences', async () => {
    const workflowId = 'hello-world-preferences';
    const newWorkflow = workflow(
      workflowId,
      async ({ step }) => {
        await step.inApp('send-in-app', () => ({
          subject: 'Welcome!',
          body: 'Hello there',
        }));
      },
      {
        preferences: {
          all: {
            enabled: false,
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

    const result = await session.testAgent.post(`/v1/bridge/sync`).send({
      bridgeUrl: bridgeServer.serverPath,
    });

    const dashboardPreferences = {
      all: { enabled: false, readOnly: true },
      channels: {
        email: { enabled: true },
        sms: { enabled: true },
        inApp: { enabled: false },
        chat: { enabled: true },
        push: { enabled: true },
      },
    };

    await session.testAgent.post(`/v1/preferences`).send({
      preferences: dashboardPreferences,
      workflowId: result.body.data[0]._id,
    });

    const response = await session.testAgent
      .get('/v1/inbox/preferences')
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    expect(response.status).to.equal(200);
  });

  it('should create a workflow with a name', async () => {
    const workflowId = 'hello-world-description';
    const newWorkflow = workflow(
      workflowId,
      async ({ step }) => {
        await step.email('send-email', () => ({
          subject: 'Welcome!',
          body: 'Hello there',
        }));
      },
      {
        name: 'My Workflow',
      }
    );
    await bridgeServer.start({ workflows: [newWorkflow] });

    const result = await session.testAgent.post(`/v1/bridge/sync`).send({
      bridgeUrl: bridgeServer.serverPath,
    });

    const workflows = await workflowsRepository.find({
      _environmentId: session.environment._id,
      _id: result.body.data[0]._id,
    });
    expect(workflows.length).to.equal(1);

    const workflowData = workflows[0];
    expect(workflowData.name).to.equal('My Workflow');
  });

  it('should create a workflow with a name that defaults to the workflowId', async () => {
    const workflowId = 'hello-world-description';
    const newWorkflow = workflow(workflowId, async ({ step }) => {
      await step.email('send-email', () => ({
        subject: 'Welcome!',
        body: 'Hello there',
      }));
    });
    await bridgeServer.start({ workflows: [newWorkflow] });

    const result = await session.testAgent.post(`/v1/bridge/sync`).send({
      bridgeUrl: bridgeServer.serverPath,
    });

    const workflows = await workflowsRepository.find({
      _environmentId: session.environment._id,
      _id: result.body.data[0]._id,
    });
    expect(workflows.length).to.equal(1);

    const workflowData = workflows[0];
    expect(workflowData.name).to.equal(workflowId);
  });

  it('should preserve the original workflow resource when syncing a workflow that has added a name', async () => {
    const workflowId = 'hello-world-description';
    const newWorkflow = workflow(workflowId, async ({ step }) => {
      await step.email('send-email', () => ({
        subject: 'Welcome!',
        body: 'Hello there',
      }));
    });
    await bridgeServer.start({ workflows: [newWorkflow] });

    const result = await session.testAgent.post(`/v1/bridge/sync`).send({
      bridgeUrl: bridgeServer.serverPath,
    });
    const workflowDbId = result.body.data[0]._id;

    const workflows = await workflowsRepository.find({
      _environmentId: session.environment._id,
      _id: workflowDbId,
    });
    expect(workflows.length).to.equal(1);

    const workflowData = workflows[0];
    expect(workflowData.name).to.equal(workflowId);

    await bridgeServer.stop();

    bridgeServer = new TestBridgeServer();
    const newWorkflowWithName = workflow(
      workflowId,
      async ({ step }) => {
        await step.email('send-email', () => ({
          subject: 'Welcome!',
          body: 'Hello there',
        }));
      },
      {
        name: 'My Workflow',
      }
    );
    await bridgeServer.start({ workflows: [newWorkflowWithName] });

    await session.testAgent.post(`/v1/bridge/sync`).send({
      bridgeUrl: bridgeServer.serverPath,
    });

    const workflowsWithName = await workflowsRepository.find({
      _environmentId: session.environment._id,
      _id: workflowDbId,
    });
    expect(workflowsWithName.length).to.equal(1);

    const workflowDataWithName = workflowsWithName[0];
    expect(workflowDataWithName.name).to.equal('My Workflow');
  });

  it('should create a workflow with a description', async () => {
    const workflowId = 'hello-world-description';
    const newWorkflow = workflow(
      workflowId,
      async ({ step }) => {
        await step.email('send-email', () => ({
          subject: 'Welcome!',
          body: 'Hello there',
        }));
      },
      {
        description: 'This is a description',
      }
    );
    await bridgeServer.start({ workflows: [newWorkflow] });

    const result = await session.testAgent.post(`/v1/bridge/sync`).send({
      bridgeUrl: bridgeServer.serverPath,
    });

    const workflows = await workflowsRepository.find({
      _environmentId: session.environment._id,
      _id: result.body.data[0]._id,
    });
    expect(workflows.length).to.equal(1);

    const workflowData = workflows[0];
    expect(workflowData.description).to.equal('This is a description');
  });

  it('should unset the workflow description after the description is removed', async () => {
    const workflowId = 'hello-world-description';
    const newWorkflow = workflow(
      workflowId,
      async ({ step }) => {
        await step.email('send-email', () => ({
          subject: 'Welcome!',
          body: 'Hello there',
        }));
      },
      {
        description: 'This is a description',
      }
    );
    await bridgeServer.start({ workflows: [newWorkflow] });

    const result = await session.testAgent.post(`/v1/bridge/sync`).send({
      bridgeUrl: bridgeServer.serverPath,
    });
    const workflowDbId = result.body.data[0]._id;
    const workflows = await workflowsRepository.find({
      _environmentId: session.environment._id,
      _id: workflowDbId,
    });
    expect(workflows.length).to.equal(1);

    const workflowData = workflows[0];
    expect(workflowData.description).to.equal('This is a description');

    await bridgeServer.stop();

    bridgeServer = new TestBridgeServer();
    const newWorkflowWithName = workflow(workflowId, async ({ step }) => {
      await step.email('send-email', () => ({
        subject: 'Welcome!',
        body: 'Hello there',
      }));
    });
    await bridgeServer.start({ workflows: [newWorkflowWithName] });

    await session.testAgent.post(`/v1/bridge/sync`).send({
      bridgeUrl: bridgeServer.serverPath,
    });

    const workflowsWithDescription = await workflowsRepository.find({
      _environmentId: session.environment._id,
      _id: workflowDbId,
    });
    expect(workflowsWithDescription.length).to.equal(1);

    const workflowDataWithName = workflowsWithDescription[0];
    expect(workflowDataWithName.description).to.equal('');
  });

  it('should preserve control values across workflow syncs', async () => {
    const workflowId = 'My Workflow';
    const spaceSeparatedIdWorkflow = workflow(workflowId, async ({ step }) => {
      await step.email('send-email', () => ({
        subject: 'Welcome!',
        body: 'Hello there',
      }));
    });
    await bridgeServer.start({ workflows: [spaceSeparatedIdWorkflow] });

    const firstSyncResponse = await session.testAgent.post(`/v1/bridge/sync`).send({
      bridgeUrl: bridgeServer.serverPath,
    });
    expect(firstSyncResponse.body.data?.length).to.equal(1);

    const firstWorkflowCountResponse = await workflowsRepository.count({ _environmentId: session.environment._id });
    expect(firstWorkflowCountResponse).to.equal(1);

    const firstWorkflowResponse = await workflowsRepository.findById(
      firstSyncResponse.body.data[0]._id,
      session.environment._id
    );

    expect(firstWorkflowResponse).to.be.ok;
    if (!firstWorkflowResponse) {
      throw new Error('Workflow not found');
    }

    expect(firstWorkflowResponse.name).to.equal(workflowId);
    expect(firstWorkflowResponse.type).to.equal(ResourceTypeEnum.BRIDGE);
    expect(firstWorkflowResponse.rawData.workflowId).to.equal(workflowId);
    expect(firstWorkflowResponse.triggers[0].identifier).to.equal(workflowId);

    expect(firstWorkflowResponse.steps.length).to.equal(1);
    expect(firstWorkflowResponse.steps[0].stepId).to.equal('send-email');
    expect(firstWorkflowResponse.steps[0]._templateId).to.exist;

    await session.testAgent.put(`/v1/bridge/controls/${workflowId}/send-email`).send({
      variables: { subject: 'Hello World again' },
    });

    const firstControlValueResponse = await controlValuesRepository.find({
      _environmentId: session.environment._id,
      _workflowId: firstWorkflowResponse._id,
    });

    expect(firstControlValueResponse.length).to.equal(1);
    expect(firstControlValueResponse[0].controls.subject).to.equal('Hello World again');

    const firstStepResponse = await session.testAgent.get(`/v1/bridge/controls/${workflowId}/send-email`);
    expect(firstStepResponse.body.data.controls.subject).to.equal('Hello World again');

    const secondSyncResponse = await session.testAgent.post(`/v1/bridge/sync`).send({
      bridgeUrl: bridgeServer.serverPath,
    });
    expect(secondSyncResponse.body.data?.length).to.equal(1);

    const secondWorkflowCountResponse = await workflowsRepository.count({ _environmentId: session.environment._id });
    expect(secondWorkflowCountResponse).to.equal(1);

    const secondWorkflowResponse = await workflowsRepository.findById(
      firstSyncResponse.body.data[0]._id,
      session.environment._id
    );

    expect(secondWorkflowResponse).to.be.ok;
    if (!secondWorkflowResponse) {
      throw new Error('Workflow not found');
    }

    expect(secondWorkflowResponse.name).to.equal(workflowId);
    expect(secondWorkflowResponse.type).to.equal(ResourceTypeEnum.BRIDGE);
    expect(secondWorkflowResponse.rawData.workflowId).to.equal(workflowId);
    expect(secondWorkflowResponse.triggers[0].identifier).to.equal(workflowId);

    expect(secondWorkflowResponse.steps.length).to.equal(1);
    expect(secondWorkflowResponse.steps[0].stepId).to.equal('send-email');
    expect(secondWorkflowResponse.steps[0]._templateId).to.exist;

    const secondControlValueResponse = await controlValuesRepository.find({
      _environmentId: session.environment._id,
      _workflowId: secondWorkflowResponse._id,
    });

    expect(secondControlValueResponse.length).to.equal(1);
    expect(secondControlValueResponse[0].controls.subject).to.equal('Hello World again');

    const secondStepResponse = await session.testAgent.get(`/v1/bridge/controls/${workflowId}/send-email`);
    expect(secondStepResponse.body.data.controls.subject).to.equal('Hello World again');
  });

  it('should handle re-sync when a step has a null control values record', async () => {
    const workflowId = 'null-controls-workflow';
    const newWorkflow = workflow(workflowId, async ({ step }) => {
      await step.email('send-email', () => ({
        subject: 'Welcome!',
        body: 'Hello there',
      }));
    });
    await bridgeServer.start({ workflows: [newWorkflow] });

    const firstSync = await session.testAgent.post(`/v1/bridge/sync`).send({
      bridgeUrl: bridgeServer.serverPath,
    });
    expect(firstSync.status).to.equal(201);
    expect(firstSync.body.data?.length).to.equal(1);

    const createdWorkflow = await workflowsRepository.findById(firstSync.body.data[0]._id, session.environment._id);
    expect(createdWorkflow).to.be.ok;
    if (!createdWorkflow) throw new Error('Workflow not found');

    await controlValuesRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      _workflowId: createdWorkflow._id,
      _stepId: createdWorkflow.steps[0]._templateId,
      level: 'step_controls',
      controls: null as any,
      priority: 0,
    });

    const secondSync = await session.testAgent.post(`/v1/bridge/sync`).send({
      bridgeUrl: bridgeServer.serverPath,
    });

    expect(secondSync.status).to.equal(201);
    expect(secondSync.body.data?.length).to.equal(1);

    const updatedWorkflow = await workflowsRepository.findById(firstSync.body.data[0]._id, session.environment._id);
    expect(updatedWorkflow).to.be.ok;
    expect(updatedWorkflow?.steps.length).to.equal(1);
    expect(updatedWorkflow?.steps[0].stepId).to.equal('send-email');
  });

  it('should throw an error when trying to sync a workflow with an ID that exists in dashboard', async () => {
    const workflowId = 'dashboard-created-workflow';

    // First create a workflow directly (simulating dashboard creation)
    const dashboardWorkflow = await workflowsRepository.create({
      _environmentId: session.environment._id,
      name: workflowId,
      triggers: [{ identifier: workflowId, type: 'event', variables: [] }],
      steps: [],
      active: true,
      draft: false,
      workflowId,
      origin: ResourceOriginEnum.NOVU_CLOUD,
    });

    // Now try to sync a workflow with the same ID through bridge
    const newWorkflow = workflow(workflowId, async ({ step }) => {
      await step.email('send-email', () => ({
        subject: 'Welcome!',
        body: 'Hello there',
      }));
    });
    await bridgeServer.start({ workflows: [newWorkflow] });

    const result = await session.testAgent.post(`/v1/bridge/sync`).send({
      bridgeUrl: bridgeServer.serverPath,
    });

    expect(result.status).to.equal(400);
    expect(result.body.message).to.contain(`was already created in Dashboard. Please use another workflowId.`);

    // Verify the original workflow wasn't modified
    const workflows = await workflowsRepository.findOne({
      _environmentId: session.environment._id,
      _id: dashboardWorkflow._id,
    });
    expect(workflows).to.deep.equal(dashboardWorkflow);
  });

  describe('SSRF protection', () => {
    // Locks in the SSRF guard — see Sync.assertSafeBridgeUrl. /bridge/sync is
    // gated by BRIDGE_WRITE, but an authenticated operator must not be able to
    // repoint the bridge at internal hosts (loopback name, cloud metadata) or
    // sneak in non-http schemes / embedded credentials.
    it('should reject bridgeUrl pointing at localhost', async () => {
      const result = await session.testAgent.post(`/v1/bridge/sync`).send({
        bridgeUrl: 'http://localhost:4000/api/novu',
      });

      expect(result.status).to.equal(400);
      expect(JSON.stringify(result.body)).to.match(/bridgeUrl/i);
    });

    it('should reject bridgeUrl pointing at cloud metadata hostname', async () => {
      const result = await session.testAgent.post(`/v1/bridge/sync`).send({
        bridgeUrl: 'http://metadata.google.internal/computeMetadata/v1/',
      });

      expect(result.status).to.equal(400);
      expect(JSON.stringify(result.body)).to.match(/bridgeUrl/i);
    });

    it('should reject bridgeUrl with embedded credentials', async () => {
      const result = await session.testAgent.post(`/v1/bridge/sync`).send({
        bridgeUrl: 'http://attacker:pass@example.com/api/novu',
      });

      expect(result.status).to.equal(400);
    });

    it('should reject bridgeUrl with non-http scheme', async () => {
      const result = await session.testAgent.post(`/v1/bridge/sync`).send({
        bridgeUrl: 'ftp://example.com/api/novu',
      });

      // CreateBridgeRequestDto's IsUrl validator rejects non-http schemes
      // before the use-case runs, so the request fails at the DTO layer (422).
      expect(result.status).to.equal(422);
    });

    // Locks in the connect-time DNS-pinned guard (enforceSsrfProtection:
    // true). IP-literal private addresses pass the synchronous URL check but
    // must be rejected before the TCP connect.
    // Connect-time block returns a stable client-safe message — the
    // resolved IP must NOT leak to the response (it's logged server-side
    // instead).
    it('should reject bridgeUrl pointing at link-local cloud metadata IP', async () => {
      const result = await session.testAgent.post(`/v1/bridge/sync`).send({
        bridgeUrl: 'http://169.254.169.254/computeMetadata/v1/',
      });

      expect(result.status).to.equal(400);
      expect(JSON.stringify(result.body)).to.match(/blocked by the outbound SSRF policy/i);
      expect(JSON.stringify(result.body)).to.not.match(/169\.254\.169\.254/);
    });

    it('should reject bridgeUrl pointing at RFC1918 private IP', async () => {
      const result = await session.testAgent.post(`/v1/bridge/sync`).send({
        bridgeUrl: 'http://10.0.0.1/api/novu',
      });

      expect(result.status).to.equal(400);
      expect(JSON.stringify(result.body)).to.match(/blocked by the outbound SSRF policy/i);
      expect(JSON.stringify(result.body)).to.not.match(/10\.0\.0\.1/);
    });
  });

  describe('/bridge/validate (POST)', () => {
    it('should report isValid false for localhost bridge URL', async () => {
      const result = await session.testAgent.post(`/v1/bridge/validate`).send({
        bridgeUrl: 'http://localhost:4000/api/novu',
      });

      expect(result.status).to.equal(201);
      expect(result.body.data.isValid).to.equal(false);
      expect(result.body.data.error).to.match(/localhost/i);
    });

    it('should report isValid false for cloud metadata hostname', async () => {
      const result = await session.testAgent.post(`/v1/bridge/validate`).send({
        bridgeUrl: 'http://metadata.google.internal/computeMetadata/v1/',
      });

      expect(result.status).to.equal(201);
      expect(result.body.data.isValid).to.equal(false);
      expect(result.body.data.error).to.match(/metadata\.google\.internal/i);
    });

    it('should reject non-http scheme at the DTO layer', async () => {
      const result = await session.testAgent.post(`/v1/bridge/validate`).send({
        bridgeUrl: 'ftp://example.com/api/novu',
      });

      // ValidateBridgeUrlRequestDto's IsUrl validator rejects non-http
      // schemes before the controller runs, so the request fails at the DTO
      // layer (422).
      expect(result.status).to.equal(422);
    });

    it('should report isValid false for embedded credentials', async () => {
      const result = await session.testAgent.post(`/v1/bridge/validate`).send({
        bridgeUrl: 'http://attacker:pass@example.com/api/novu',
      });

      expect(result.status).to.equal(201);
      expect(result.body.data.isValid).to.equal(false);
      expect(result.body.data.error).to.match(/credentials/i);
    });

    // Connect-time block returns a stable client-safe message — the
    // resolved IP must NOT leak to the response (it's logged server-side
    // instead).
    it('should report isValid false for link-local cloud metadata IP', async () => {
      const result = await session.testAgent.post(`/v1/bridge/validate`).send({
        bridgeUrl: 'http://169.254.169.254/computeMetadata/v1/',
      });

      expect(result.status).to.equal(201);
      expect(result.body.data.isValid).to.equal(false);
      expect(result.body.data.error).to.match(/blocked by the outbound SSRF policy/i);
      expect(result.body.data.error).to.not.match(/169\.254\.169\.254/);
    });

    it('should report isValid false for RFC1918 private IP', async () => {
      const result = await session.testAgent.post(`/v1/bridge/validate`).send({
        bridgeUrl: 'http://10.0.0.1/api/novu',
      });

      expect(result.status).to.equal(201);
      expect(result.body.data.isValid).to.equal(false);
      expect(result.body.data.error).to.match(/blocked by the outbound SSRF policy/i);
      expect(result.body.data.error).to.not.match(/10\.0\.0\.1/);
    });
  });

  it('should allow syncing a workflow with same ID if original was created externally', async () => {
    const workflowId = 'external-created-workflow';

    // First create a workflow as external
    const externalWorkflow = await workflowsRepository.create({
      _environmentId: session.environment._id,
      name: workflowId,
      triggers: [{ identifier: workflowId, type: 'event', variables: [] }],
      steps: [],
      active: true,
      draft: false,
      workflowId,
      origin: ResourceOriginEnum.EXTERNAL,
    });

    // Now try to sync a workflow with the same ID through bridge
    const newWorkflow = workflow(workflowId, async ({ step }) => {
      await step.email('send-email', () => ({
        subject: 'Updated Welcome!',
        body: 'Updated Hello there',
      }));
    });
    await bridgeServer.start({ workflows: [newWorkflow] });

    const result = await session.testAgent.post(`/v1/bridge/sync`).send({
      bridgeUrl: bridgeServer.serverPath,
    });

    expect(result.status).to.equal(201);

    // Verify the workflow was updated
    const workflows = await workflowsRepository.findOne({
      _environmentId: session.environment._id,
      _id: externalWorkflow._id,
    });
    expect(workflows?.origin).to.equal(ResourceOriginEnum.EXTERNAL);
    expect(workflows?.steps[0]?.stepId).to.equal('send-email');
  });
});
