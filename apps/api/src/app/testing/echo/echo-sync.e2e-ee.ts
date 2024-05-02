import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { EnvironmentRepository, NotificationTemplateRepository, MessageTemplateRepository } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';

describe('Echo Sync - /echo/sync (POST)', async () => {
  let session: UserSession;
  const environmentRepository = new EnvironmentRepository();
  const workflowsRepository = new NotificationTemplateRepository();
  const messageTemplateRepository = new MessageTemplateRepository();

  const inputPostPayload = {
    schema: {
      type: 'object',
      properties: {
        showButton: { type: 'boolean', default: true },
      },
    },
  };
  const outputPostPayload = {
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', default: 'firstName' },
      },
    },
  };

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should update echo url', async () => {
    const result = await session.testAgent.post(`/v1/echo/sync`).send({
      chimeraUrl: 'https://chimera.novu.com',
      workflows: [],
    });

    expect(result.body.data?.length).to.equal(0);

    const environment = await environmentRepository.findOne({ _id: session.environment._id });

    expect(environment?.echo.url).to.equal('https://chimera.novu.com');

    const workflows = await workflowsRepository.find({ _environmentId: session.environment._id });
    expect(workflows.length).to.equal(0);
  });

  it('should create a workflow', async () => {
    const result = await session.testAgent.post(`/v1/echo/sync`).send({
      chimeraUrl: 'https://chimera.novu.com',
      workflows: [
        {
          workflowId: 'test-workflow',
          steps: [
            {
              stepId: 'send-email',
              type: StepTypeEnum.EMAIL,
              inputs: {},
              outputs: {},
              options: {},
              code: 'testCode',
            },
          ],
          code: 'testCode',
          inputs: {},
          options: {},
        },
      ],
    });
    expect(result.body.data?.length).to.equal(1);

    const workflowsCount = await workflowsRepository.find({ _environmentId: session.environment._id });
    const workflow = await workflowsRepository.findById(result.body.data[0]._id, session.environment._id);

    expect(workflow).to.be.ok;
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    expect(workflowsCount.length).to.equal(1);

    expect(workflow.name).to.equal('test-workflow');
    expect(workflow.type).to.equal('ECHO');
    expect(workflow.rawData.workflowId).to.equal('test-workflow');
    expect(workflow.triggers[0].identifier).to.equal('test-workflow');

    expect(workflow.steps.length).to.equal(1);
    expect(workflow.steps[0].stepId).to.equal('send-email');
    expect(workflow.steps[0].uuid).to.equal('send-email');
    expect(workflow.steps[0].template?.name).to.equal('send-email');
  });

  it('should create a message template', async () => {
    const result = await session.testAgent.post(`/v1/echo/sync`).send({
      chimeraUrl: 'https://chimera.novu.com',
      workflows: [
        {
          workflowId: 'test-workflow',
          steps: [
            {
              stepId: 'send-email',
              type: StepTypeEnum.EMAIL,
              inputs: inputPostPayload,
              outputs: outputPostPayload,
              options: {},
              code: 'new-test-code',
            },
          ],
          code: 'testCode',
          inputs: {},
          options: {},
        },
      ],
    });
    expect(result.body.data?.length).to.equal(1);

    const workflowsCount = await workflowsRepository.find({ _environmentId: session.environment._id });
    expect(workflowsCount.length).to.equal(1);

    const workflow = await workflowsRepository.findById(result.body.data[0]._id, session.environment._id);
    expect(workflow).to.be.ok;
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const messageTemplates = await messageTemplateRepository.find({
      _id: workflow.steps[0]._id,
      _environmentId: session.environment._id,
    });
    expect(messageTemplates.length).to.equal(1);
    const messageTemplatesToTest = messageTemplates[0];

    expect(messageTemplatesToTest.inputs).to.deep.equal(inputPostPayload);
    expect(messageTemplatesToTest.output).to.deep.equal(outputPostPayload);
  });

  it('should update a workflow', async () => {
    await session.testAgent.post(`/v1/echo/sync`).send({
      chimeraUrl: 'https://chimera.novu.com',
      workflows: [
        {
          workflowId: 'test-workflow',
          steps: [
            {
              stepId: 'send-email',
              type: StepTypeEnum.EMAIL,
              inputs: {},
              output: {},
              options: {},
              code: 'testCode',
            },
          ],
          code: 'testCode',
          inputs: {},
          options: {},
        },
      ],
    });

    await session.testAgent.post(`/v1/echo/sync`).send({
      chimeraUrl: 'https://chimera.novu.com',
      workflows: [
        {
          workflowId: 'test-workflow',
          steps: [
            {
              stepId: 'send-email-2',
              type: StepTypeEnum.EMAIL,
              inputs: {},
              outputs: {},
              options: {},
              code: 'testCode',
            },
            {
              stepId: 'send-sms',
              type: StepTypeEnum.SMS,
              inputs: {},
              outputs: {},
              options: {},
              code: 'testCode',
            },
          ],
          code: 'testCode',
          inputs: {},
          options: {},
        },
      ],
    });

    const workflows = await workflowsRepository.find({ _environmentId: session.environment._id });
    expect(workflows.length).to.equal(1);

    const workflow = workflows[0];

    expect(workflow.name).to.equal('test-workflow');
    expect(workflow.type).to.equal('ECHO');
    expect(workflow.rawData.workflowId).to.equal('test-workflow');
    expect(workflow.triggers[0].identifier).to.equal('test-workflow');

    expect(workflow.steps[0].stepId).to.equal('send-email-2');
    expect(workflow.steps[0].uuid).to.equal('send-email-2');
    expect(workflow.steps[0].name).to.equal('send-email-2');

    expect(workflow.steps[1].stepId).to.equal('send-sms');
    expect(workflow.steps[1].uuid).to.equal('send-sms');
    expect(workflow.steps[1].name).to.equal('send-sms');

    await session.testAgent.post(`/v1/echo/sync`).send({
      chimeraUrl: 'https://chimera.novu.com',
      workflows: [
        {
          workflowId: 'test-workflow',
          steps: [],
          code: 'testCode',
          inputs: {},
          options: {},
        },
      ],
    });

    const updatedWorkflows = await workflowsRepository.find({ _environmentId: session.environment._id });
    const updatedWorkflow = updatedWorkflows[0];
    expect(updatedWorkflow.steps.length).to.equal(0);
  });

  it('should update a existing steps', async () => {
    await session.testAgent.post(`/v1/echo/sync`).send({
      chimeraUrl: 'https://chimera.novu.com',
      workflows: [
        {
          workflowId: 'test-workflow',
          steps: [
            {
              stepId: 'send-email',
              type: StepTypeEnum.EMAIL,
              inputs: {},
              outputs: {},
              options: {},
              code: 'testCode',
            },
          ],
          code: 'testCode',
          inputs: {},
          options: {},
        },
      ],
    });

    let workflows = await workflowsRepository.find({ _environmentId: session.environment._id });
    expect(workflows.length).to.equal(1);
    let messageTemplates = await messageTemplateRepository.find({
      _id: workflows[0].steps[0]._id,
      _environmentId: session.environment._id,
    });
    expect(messageTemplates.length).to.equal(1);
    let messageTemplatesToTest = messageTemplates[0];
    expect(messageTemplatesToTest.inputs).to.equal(undefined);
    expect(messageTemplatesToTest.output).to.equal(undefined);

    await session.testAgent.post(`/v1/echo/sync`).send({
      chimeraUrl: 'https://chimera.novu.com',
      workflows: [
        {
          workflowId: 'test-workflow',
          steps: [
            {
              stepId: 'new-send-email',
              type: StepTypeEnum.EMAIL,
              inputs: {},
              outputs: {},
              options: {},
              code: 'testCode',
            },
            {
              stepId: 'send-email',
              type: StepTypeEnum.EMAIL,
              inputs: inputPostPayload,
              outputs: outputPostPayload,
              options: {},
              code: 'new-test-code',
            },
          ],
          code: 'testCode',
          inputs: {},
          options: {},
        },
      ],
    });

    workflows = await workflowsRepository.find({ _environmentId: session.environment._id });
    expect(workflows.length).to.equal(1);
    const updatedWorkflows = await workflowsRepository.find({ _environmentId: session.environment._id });
    messageTemplates = await messageTemplateRepository.find({
      _id: updatedWorkflows[0].steps.find((step) => step.stepId === 'send-email')?._id,
      _environmentId: session.environment._id,
    });

    expect(messageTemplates.length).to.equal(1);
    messageTemplatesToTest = messageTemplates[0];

    expect(messageTemplatesToTest.inputs).to.deep.equal(inputPostPayload);
    expect(messageTemplatesToTest.output).to.deep.equal(outputPostPayload);
  });
});
