import { expect } from 'chai';

import { UserSession } from '@novu/testing';
import { CreateWorkflowDto, StepTypeEnum, WorkflowCreationSourceEnum, WorkflowResponseDto } from '@novu/shared';

describe('Get Step Schema - /step-schemas?workflowId=:workflowId&stepId=:stepId&stepType=:stepType (GET)', async () => {
  let session: UserSession;
  let createdWorkflow: WorkflowResponseDto;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });
  // todo: need to add test for variable logic.
  describe('Get Control Schema with stepType', () => {
    it('should get step schema for in app step type', async function () {
      const { data } = (await getStepSchema({ session, stepType: StepTypeEnum.IN_APP })).body;

      // in app output schema
      expect(data.controls.type).to.equal('object');
      expect(data.controls.properties).to.have.property('subject');
      expect(data.controls.properties.subject.type).to.equal('string');
      expect(data.controls.properties).to.have.property('body');
      expect(data.controls.properties.body.type).to.equal('string');
      expect(data.controls.properties).to.have.property('avatar');
      expect(data.controls.properties.avatar.type).to.equal('string');
      expect(data.controls.properties.avatar.format).to.equal('uri');
      expect(data.controls.properties).to.have.property('primaryAction');
      expect(data.controls.properties.primaryAction.type).to.equal('object');
      expect(data.controls.properties.primaryAction.properties).to.have.property('label');
      expect(data.controls.properties.primaryAction.properties.label.type).to.equal('string');
      expect(data.controls.properties.primaryAction.properties).to.have.property('redirect');
      expect(data.controls.properties.primaryAction.properties.redirect.type).to.equal('object');
      expect(data.controls.properties.primaryAction.required).to.deep.equal(['label']);
      expect(data.controls.properties).to.have.property('secondaryAction');
      expect(data.controls.properties.secondaryAction.type).to.equal('object');
      expect(data.controls.properties.secondaryAction.properties).to.have.property('label');
      expect(data.controls.properties.secondaryAction.properties.label.type).to.equal('string');
      expect(data.controls.properties.secondaryAction.properties).to.have.property('redirect');
      expect(data.controls.properties.secondaryAction.properties.redirect.type).to.equal('object');
      expect(data.controls.properties.secondaryAction.required).to.deep.equal(['label']);
      expect(data.controls.properties).to.have.property('data');
      expect(data.controls.properties.data.type).to.equal('object');
      expect(data.controls.properties.data.additionalProperties).to.be.true;
      expect(data.controls.properties).to.have.property('redirect');
      expect(data.controls.properties.redirect.type).to.equal('object');
      expect(data.controls.properties.redirect.properties).to.have.property('url');
      expect(data.controls.properties.redirect.properties.url.type).to.equal('string');
      expect(data.controls.properties.redirect.properties).to.have.property('target');
      expect(data.controls.properties.redirect.properties.target.type).to.equal('string');
      expect(data.controls.required).to.deep.equal(['body']);
      expect(data.controls.additionalProperties).to.be.false;
      expect(data.controls.description).to.not.be.empty;

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
      expect(response.body.statusCode).to.equal(400);
    });
  });
});

async function createWorkflow(session: UserSession, createdWorkflow: WorkflowResponseDto) {
  const workflowObject: CreateWorkflowDto = {
    __source: WorkflowCreationSourceEnum.ONBOARDING_IN_APP,
    name: 'test api template',
    workflowId: 'test-trigger-api',
    description: 'This is a test description',
    tags: ['test-tag-api'],
    steps: [
      {
        name: 'In-App Test Step',
        type: StepTypeEnum.IN_APP,
        controlValues: {},
      },
      {
        name: 'SMS Test Step',
        type: StepTypeEnum.SMS,
        controlValues: {},
      },
    ],
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
