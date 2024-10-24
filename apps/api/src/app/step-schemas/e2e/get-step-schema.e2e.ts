import { expect } from 'chai';

import { UserSession } from '@novu/testing';
import { StepTypeEnum, WorkflowResponseDto } from '@novu/shared';

describe('Get Step Schema - /step-schemas?workflowId=:workflowId&stepId=:stepId&stepType=:stepType (GET)', async () => {
  let session: UserSession;
  let createdWorkflow: WorkflowResponseDto;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    createdWorkflow = await createWorkflow(session, createdWorkflow);
  });

  describe('Get step schema with stepType', () => {
    it('should get step schema for in app step type', async function () {
      const { data } = (await getStepSchema({ session, stepType: StepTypeEnum.IN_APP })).body;

      expect(data.variables.type).to.equal('object');
      expect(data.variables.description).to.not.be.empty;
      expect(data.variables.properties).to.have.property('subscriber');
      expect(data.variables.properties.subscriber.type).to.equal('object');
      expect(data.variables.properties.subscriber.description).to.not.be.empty;
      expect(data.variables.properties.subscriber.properties).to.have.property('firstName');
      expect(data.variables.properties.subscriber.properties.firstName.type).to.equal('string');
      expect(data.variables.properties.subscriber.properties).to.have.property('lastName');
      expect(data.variables.properties.subscriber.properties.lastName.type).to.equal('string');
      expect(data.variables.properties.subscriber.properties).to.have.property('email');
      expect(data.variables.properties.subscriber.properties.email.type).to.equal('string');
      expect(data.variables.properties.subscriber.required).to.deep.equal([
        'firstName',
        'lastName',
        'email',
        'subscriberId',
      ]);
      expect(data.variables.properties).to.have.property('steps');
      expect(data.variables.properties.steps.type).to.equal('object');
      expect(data.variables.properties.steps.description).to.not.be.empty;
      expect(data.variables.required).to.deep.equal(['subscriber']);
      expect(data.variables.additionalProperties).to.be.false;
    });

    it('should get error for invalid step type', async function () {
      const response = await getStepSchema({ session, stepType: 'invalid' as StepTypeEnum });

      expect(response.status).to.equal(400);
      expect(response.body.message).to.include(
        'stepType must be one of the following values: email, sms, push, chat, in_app, digest, delay, custom'
      );
      expect(response.body.error).to.equal('Bad Request');
      expect(response.body.statusCode).to.equal(400);
    });
  });

  describe('Get step schema exiting step', () => {
    it('should get step schema for existing step', async function () {
      const { data } = (
        await getStepSchema({
          session,
          workflowId: createdWorkflow._id,
          stepId: createdWorkflow.steps[0].stepUuid,
        })
      ).body;

      expect(data.variables.type).to.equal('object');
      expect(data.variables.description).to.not.be.empty;
      expect(data.variables.properties).to.have.property('subscriber');
      expect(data.variables.properties.subscriber.type).to.equal('object');
      expect(data.variables.properties.subscriber.description).to.not.be.empty;
      expect(data.variables.properties.subscriber.properties).to.have.property('firstName');
      expect(data.variables.properties.subscriber.properties.firstName.type).to.equal('string');
      expect(data.variables.properties.subscriber.properties).to.have.property('lastName');
      expect(data.variables.properties.subscriber.properties.lastName.type).to.equal('string');
      expect(data.variables.properties.subscriber.properties).to.have.property('email');
      expect(data.variables.properties.subscriber.properties.email.type).to.equal('string');
      expect(data.variables.properties.subscriber.required).to.deep.equal([
        'firstName',
        'lastName',
        'email',
        'subscriberId',
      ]);
      expect(data.variables.properties).to.have.property('steps');
      expect(data.variables.properties.steps.type).to.equal('object');
      expect(data.variables.properties.steps.description).to.not.be.empty;
      expect(data.variables.required).to.deep.equal(['subscriber']);
      expect(data.variables.additionalProperties).to.be.false;
    });

    it('should get step schema for existing step no previous steps', async function () {
      const { data } = (
        await getStepSchema({
          session,
          workflowId: createdWorkflow._id,
          stepId: createdWorkflow.steps[0].stepUuid,
        })
      ).body;

      expect(data.variables.properties.steps.properties).to.be.an('object').that.is.empty;
    });

    it('should get step schema for existing step with previous steps', async function () {
      const { data } = (
        await getStepSchema({
          session,
          stepType: StepTypeEnum.IN_APP,
          workflowId: createdWorkflow._id,
          stepId: createdWorkflow.steps[1].stepUuid,
        })
      ).body;

      expect(data.variables.properties.steps.type).to.equal('object');
      const variableStepKeys = Object.keys(data.variables.properties.steps.properties);
      expect(variableStepKeys).to.have.length(1);
      const variableStepKey = variableStepKeys[0];
      const createdWorkflowPreviousSteps = createdWorkflow.steps.slice(
        0,
        createdWorkflow.steps.findIndex((stepItem) => stepItem.stepUuid === createdWorkflow.steps[1].stepUuid)
      );
      const variableStepKeyFoundInCreatedWorkflow = createdWorkflowPreviousSteps.find(
        (step) => step.stepId === variableStepKey
      );
      const isValidVariableStepKey = !!variableStepKeyFoundInCreatedWorkflow;
      expect(isValidVariableStepKey).to.be.true;
      expect(data.variables.properties.steps.properties).to.have.property(variableStepKey);
      expect(data.variables.properties.steps.properties[variableStepKey].type).to.equal('object');
      expect(data.variables.properties.steps.properties[variableStepKey].properties).to.have.all.keys(
        'seen',
        'read',
        'lastSeenDate',
        'lastReadDate'
      );
      expect(data.variables.properties.steps.properties[variableStepKey].required).to.deep.equal([
        'seen',
        'read',
        'lastSeenDate',
        'lastReadDate',
      ]);
      expect(data.variables.properties.steps.properties[variableStepKey].additionalProperties).to.be.false;
      expect(data.variables.properties.steps.required).to.be.an('array').that.is.empty;
      expect(data.variables.properties.steps.additionalProperties).to.be.false;
      expect(data.variables.properties.steps.description).to.not.be.empty;
    });

    it('should get error for invalid step id', async function () {
      const invalidStepUuid = `${createdWorkflow.steps[0].stepUuid}0`;

      const response = await getStepSchema({
        session,
        workflowId: createdWorkflow._id,
        stepId: invalidStepUuid,
      });

      expect(response.status).to.equal(400);
      expect(response.body.message).to.equal('No step found');
      expect(response.body.stepId).to.equal(invalidStepUuid);
      expect(response.body.workflowId).to.equal(createdWorkflow._id);
      expect(response.body.statusCode).to.equal(400);
    });

    it('should get error for invalid workflow id', async function () {
      const invalidWorkflowId = createdWorkflow.steps[0].stepUuid;

      const response = await getStepSchema({
        session,
        workflowId: invalidWorkflowId,
        stepId: createdWorkflow.steps[0].stepUuid,
      });

      expect(response.status).to.equal(400);
      expect(response.body.message).to.equal('No workflow found');
      expect(response.body.workflowId).to.equal(invalidWorkflowId);
      expect(response.body.statusCode).to.equal(400);
    });
  });
});

async function createWorkflow(session: UserSession, createdWorkflow: WorkflowResponseDto) {
  const workflowObject = {
    _organizationId: session.organization._id,
    _environmentId: session.environment._id,
    name: 'test api template',
    description: 'This is a test description',
    tags: ['test-tag-api'],
    notificationGroupId: session.notificationGroups[0]._id,
    steps: [
      {
        name: 'In-App Test Step',
        type: StepTypeEnum.IN_APP,
        controls: {
          schema: {
            type: 'object',
            properties: {
              codeFirstTitle: {
                type: 'string',
              },
            },
          },
        },
      },
      {
        name: 'SMS Test Step',
        type: StepTypeEnum.SMS,
        controls: {
          schema: {
            type: 'object',
            properties: {
              codeFirstSmsTitle: {
                type: 'string',
              },
            },
          },
        },
      },
    ],
    triggers: [{ identifier: 'test-trigger-api' }],
  };

  const workflowDataRes = await session.testAgent.post(`/v2/workflows`).send(workflowObject);

  return workflowDataRes.body.data;
}

const getStepSchema = async ({
  session,
  workflowId,
  stepId,
  stepType,
}: {
  session: UserSession;
  workflowId?: string;
  stepId?: string;
  stepType?: StepTypeEnum;
}) => {
  const queryParams = new URLSearchParams();
  if (workflowId) queryParams.append('workflowId', workflowId);
  if (stepId) queryParams.append('stepId', stepId);
  if (stepType) queryParams.append('stepType', stepType);

  return await session.testAgent.get(`/v1/step-schemas?${queryParams.toString()}`);
};
