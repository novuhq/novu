import { expect } from 'chai';

import { UserSession } from '@novu/testing';
import { StepTypeEnum } from '@novu/shared';
import { customActionStepSchema } from '../types';

describe('Get Control Schema - /step-schemas/:stepType (GET)', async () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should get control schema for email step', async function () {
    const { body } = await session.testAgent.get(`/v1/step-schemas/${StepTypeEnum.EMAIL}`);

    const { schema } = body.data;

    expect(schema.type).to.equal('object');
    expect(schema.properties).to.have.property('subject');
    expect(schema.properties.subject).to.be.an('object');
    expect(schema.properties.subject).to.have.property('type');
    expect(schema.properties.subject.type).to.equal('string');
    expect(schema.properties).to.have.property('body');
    expect(schema.properties.body).to.be.an('object');
    expect(schema.properties.body).to.have.property('type');
    expect(schema.properties.body.type).to.equal('string');
    expect(schema.required).to.be.an('array').that.includes('subject');
    expect(schema.required).to.be.an('array').that.includes('body');
    expect(schema.additionalProperties).to.be.false;
  });

  it('should get control schema for sms step', async function () {
    const { body } = await session.testAgent.get(`/v1/step-schemas/${StepTypeEnum.SMS}`);

    expect(body.data.schema.type).to.equal('object');
    expect(body.data.schema.properties).to.have.property('body');
    expect(body.data.schema.required).to.deep.equal(['body']);
    expect(body.data.schema.additionalProperties).to.be.false;
  });

  it('should get control schema for push step', async function () {
    const { body } = await session.testAgent.get(`/v1/step-schemas/${StepTypeEnum.PUSH}`);

    expect(body.data.schema.type).to.equal('object');
    expect(body.data.schema.properties).to.have.property('subject');
    expect(body.data.schema.properties).to.have.property('body');
    expect(body.data.schema.required).to.deep.equal(['subject', 'body']);
    expect(body.data.schema.additionalProperties).to.be.false;
  });

  it('should get control schema for in-app step', async function () {
    const { body } = await session.testAgent.get(`/v1/step-schemas/${StepTypeEnum.IN_APP}`);

    expect(body.data.schema.type).to.equal('object');
    expect(body.data.schema.properties).to.have.property('subject');
    expect(body.data.schema.properties).to.have.property('body');
    expect(body.data.schema.properties).to.have.property('avatar');
    expect(body.data.schema.properties).to.have.property('primaryAction');
    expect(body.data.schema.properties).to.have.property('secondaryAction');
    expect(body.data.schema.properties).to.have.property('data');
    expect(body.data.schema.properties).to.have.property('redirect');
    expect(body.data.schema.required).to.deep.equal(['body']);
    expect(body.data.schema.additionalProperties).to.be.false;
  });

  it('should get control schema for chat step', async function () {
    const { body } = await session.testAgent.get(`/v1/step-schemas/${StepTypeEnum.CHAT}`);

    expect(body.data.schema.type).to.equal('object');
    expect(body.data.schema.properties).to.have.property('body');
    expect(body.data.schema.required).to.deep.equal(['body']);
    expect(body.data.schema.additionalProperties).to.be.false;
  });

  it('should get control schema for delay step', async function () {
    const { body } = await session.testAgent.get(`/v1/step-schemas/${StepTypeEnum.DELAY}`);

    expect(body.data.schema.type).to.equal('object');
    expect(body.data.schema.properties).to.have.property('type');
    expect(body.data.schema.properties).to.have.property('amount');
    expect(body.data.schema.properties).to.have.property('unit');
    expect(body.data.schema.required).to.deep.equal(['amount', 'unit']);
    expect(body.data.schema.additionalProperties).to.be.false;
  });

  it('should get control schema for digest step', async function () {
    const { body } = await session.testAgent.get(`/v1/step-schemas/${StepTypeEnum.DIGEST}`);
    expect(body.data.schema).to.have.property('oneOf');
    expect(body.data.schema.oneOf).to.be.an('array').with.lengthOf(2);

    const firstSchema = body.data.schema.oneOf[0];
    expect(firstSchema.type).to.equal('object');
    expect(firstSchema.properties).to.have.property('amount');
    expect(firstSchema.properties).to.have.property('unit');
    expect(firstSchema.properties).to.have.property('digestKey');
    expect(firstSchema.properties).to.have.property('lookBackWindow');
    expect(firstSchema.properties.lookBackWindow.type).to.equal('object');
    expect(firstSchema.properties.lookBackWindow.properties).to.have.property('amount');
    expect(firstSchema.properties.lookBackWindow.properties).to.have.property('unit');
    expect(firstSchema.required).to.deep.equal(['amount', 'unit']);
    expect(firstSchema.additionalProperties).to.be.false;

    const secondSchema = body.data.schema.oneOf[1];
    expect(secondSchema.type).to.equal('object');
    expect(secondSchema.properties).to.have.property('cron');
    expect(secondSchema.properties).to.have.property('digestKey');
    expect(secondSchema.required).to.deep.equal(['cron']);
    expect(secondSchema.additionalProperties).to.be.false;
  });

  it('should return empty object for custom step', async function () {
    const { body } = await session.testAgent.get(`/v1/step-schemas/${StepTypeEnum.CUSTOM}`);

    expect(body.data.schema).to.deep.equal(customActionStepSchema);
  });

  it('should return 400 for invalid step type', async function () {
    const res = await session.testAgent.get('/v1/step-schemas/invalid-step-type');

    expect(res.body.message).to.be.an('array');
    expect(res.body.message[0]).to.include('stepType must be one of the following values');
    expect(res.body.error).to.equal('Bad Request');
    expect(res.body.statusCode).to.equal(400);
  });
});
