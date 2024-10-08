import { expect } from 'chai';

import { UserSession } from '@novu/testing';
import { StepTypeEnum, WorkflowResponseDto } from '@novu/shared';

describe('Get Control Schema - /step-schemas?workflowId=:workflowId&stepId=:stepId&stepType=:stepType (GET)', async () => {
  let session: UserSession;
  let createdWorkflow: WorkflowResponseDto;

  beforeEach(async () => {
    // @ts-ignore
    process.env.IS_WORKFLOW_PREFERENCES_ENABLED = 'true';
    session = new UserSession();
    await session.initialize();

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
        },
        {
          name: 'SMS Test Step',
          type: StepTypeEnum.SMS,
        },
      ],
      triggers: [{ identifier: 'test-trigger-api' }],
    };

    const workflowDataRes = await session.testAgent.post(`/v2/workflows`).send(workflowObject);
    createdWorkflow = workflowDataRes.body.data;
  });

  afterEach(async () => {
    // @ts-ignore
    process.env.IS_WORKFLOW_PREFERENCES_ENABLED = 'false';
  });

  describe('Get Control Schema with stepType', () => {
    it('should get step schema for in app step type', async function () {
      const { data } = (await session.testAgent.get(`/v1/step-schemas?stepType=${StepTypeEnum.IN_APP}`)).body;

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
      expect(data.controls.description).to.equal(
        'Output of the step, including any controls defined in the Bridge App'
      );

      expect(data.variables.type).to.equal('object');
      expect(data.variables.description).to.equal(
        // eslint-disable-next-line max-len
        'Variables that can be used with Liquid JS Template syntax. Includes subscriber attributes, payload variables, and supports liquid filters for formatting.'
      );
      expect(data.variables.properties).to.have.property('subscriber');
      expect(data.variables.properties.subscriber.type).to.equal('object');
      expect(data.variables.properties.subscriber.description).to.equal('Schema representing the subscriber entity');
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
      expect(data.variables.properties).to.have.property('payload');
      expect(data.variables.properties.payload.type).to.equal('object');
      expect(data.variables.properties.payload.description).to.equal(
        'Payload Schema - For Developers. Passed during the novu.trigger method, and controlled by the developer.'
      );
      expect(data.variables.properties).to.have.property('steps');
      expect(data.variables.properties.steps.type).to.equal('object');
      expect(data.variables.properties.steps.description).to.equal('Previous Steps Results');
      expect(data.variables.required).to.deep.equal(['subscriber', 'payload']);
      expect(data.variables.additionalProperties).to.be.false;
    });

    it('should get error for invalid step type', async function () {
      const res = await session.testAgent.get(`/v1/step-schemas?stepType=invalid`);

      expect(res.status).to.equal(400);
      expect(res.body.message).to.include(
        'stepType must be one of the following values: email, sms, push, chat, in_app, digest, delay, custom'
      );
      expect(res.body.error).to.equal('Bad Request');
      expect(res.body.statusCode).to.equal(400);
    });
  });

  describe('Get Control Schema exiting step', () => {
    it('should get step schema for existing step', async function () {
      const { data } = (
        await session.testAgent.get(
          `/v1/step-schemas?workflowId=${createdWorkflow._id}&stepId=${createdWorkflow.steps[0].stepUuid}`
        )
      ).body;

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
      expect(data.controls.description).to.equal(
        'Output of the step, including any controls defined in the Bridge App'
      );

      expect(data.variables.type).to.equal('object');
      expect(data.variables.description).to.equal(
        // eslint-disable-next-line max-len
        'Variables that can be used with Liquid JS Template syntax. Includes subscriber attributes, payload variables, and supports liquid filters for formatting.'
      );
      expect(data.variables.properties).to.have.property('subscriber');
      expect(data.variables.properties.subscriber.type).to.equal('object');
      expect(data.variables.properties.subscriber.description).to.equal('Schema representing the subscriber entity');
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
      expect(data.variables.properties).to.have.property('payload');
      expect(data.variables.properties.payload.type).to.equal('object');
      expect(data.variables.properties.payload.description).to.equal(
        'Payload Schema - For Developers. Passed during the novu.trigger method, and controlled by the developer.'
      );
      expect(data.variables.properties).to.have.property('steps');
      expect(data.variables.properties.steps.type).to.equal('object');
      expect(data.variables.properties.steps.description).to.equal('Previous Steps Results');
      expect(data.variables.required).to.deep.equal(['subscriber', 'payload']);
      expect(data.variables.additionalProperties).to.be.false;
    });

    it('should get step schema for existing step no previous steps', async function () {
      const { data } = (
        await session.testAgent.get(
          `/v1/step-schemas?workflowId=${createdWorkflow._id}&stepId=${createdWorkflow.steps[0].stepUuid}`
        )
      ).body;

      expect(data.variables.properties.steps.properties).to.be.an('object').that.is.empty;
    });

    it('should get step schema for existing step with previous steps', async function () {
      const { data } = (
        await session.testAgent.get(
          `/v1/step-schemas?workflowId=${createdWorkflow._id}&stepId=${createdWorkflow.steps[1].stepUuid}`
        )
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
        (step) => step.stepUuid === variableStepKey
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
      expect(data.variables.properties.steps.description).to.equal('Previous Steps Results');
    });

    it('should get error for invalid step id', async function () {
      const invalidStepUuid = `${createdWorkflow.steps[0].stepUuid}0`;

      const res = await session.testAgent.get(
        `/v1/step-schemas?workflowId=${createdWorkflow._id}&stepId=${invalidStepUuid}`
      );
      expect(res.status).to.equal(400);
      expect(res.body.message).to.equal(`No step found with the given id ${invalidStepUuid}`);
      expect(res.body.error).to.equal('Bad Request');
      expect(res.body.statusCode).to.equal(400);
    });

    it('should get step schema for invalid workflow id', async function () {
      const invalidWorkflowId = createdWorkflow.steps[0].stepUuid;

      const res = await session.testAgent.get(
        `/v1/step-schemas?workflowId=${invalidWorkflowId}&stepId=${createdWorkflow.steps[0].stepUuid}`
      );
      expect(res.status).to.equal(400);
      expect(res.body.message).to.equal(`No workflow found with the given id ${invalidWorkflowId}`);
      expect(res.body.error).to.equal('Bad Request');
      expect(res.body.statusCode).to.equal(400);
    });
  });
});
