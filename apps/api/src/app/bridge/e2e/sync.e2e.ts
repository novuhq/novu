import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import {
  EnvironmentRepository,
  NotificationTemplateRepository,
  MessageTemplateRepository,
  ControlValuesRepository,
} from '@novu/dal';
import { WorkflowOriginEnum, WorkflowTypeEnum } from '@novu/shared';
import { workflow } from '@novu/framework';
import { BridgeServer } from '../../../../e2e/bridge.server';

describe('Bridge Sync - /bridge/sync (POST) #novu-v2', async () => {
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

  let bridgeServer: BridgeServer;
  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    bridgeServer = new BridgeServer();
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
    expect(workflowData.type).to.equal(WorkflowTypeEnum.BRIDGE);
    expect(workflowData.rawData.workflowId).to.equal(workflowId);
    expect(workflowData.triggers[0].identifier).to.equal(workflowId);

    expect(workflowData.steps.length).to.equal(1);
    expect(workflowData.steps[0].stepId).to.equal('send-email');
    expect(workflowData.steps[0].uuid).to.equal('send-email');
    expect(workflowData.steps[0].template?.name).to.equal('send-email');
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
    expect(workflowData.type).to.equal(WorkflowTypeEnum.BRIDGE);
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

    bridgeServer = new BridgeServer();
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
    expect(workflowData.type).to.equal(WorkflowTypeEnum.BRIDGE);
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

    bridgeServer = new BridgeServer();
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

    bridgeServer = new BridgeServer();
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
    expect(firstWorkflowResponse.type).to.equal(WorkflowTypeEnum.BRIDGE);
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
    expect(secondWorkflowResponse.type).to.equal(WorkflowTypeEnum.BRIDGE);
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
      origin: WorkflowOriginEnum.NOVU_CLOUD,
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
      origin: WorkflowOriginEnum.EXTERNAL,
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
    expect(workflows?.origin).to.equal(WorkflowOriginEnum.EXTERNAL);
    expect(workflows?.steps[0]?.stepId).to.equal('send-email');
  });
});
